'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  writeBatch, 
  query, 
  orderBy, 
  getDocs,
  increment,
  updateDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { 
  type Product, 
  type Transaction, 
  type BankingDetails, 
  type CartItem, 
  type PaymentMethod 
} from '@/lib/types';
import {
  DEFAULT_PRODUCTS,
  DEFAULT_CATEGORIES,
  DEFAULT_MESSAGE,
  DEFAULT_BANKING_DETAILS,
  DEFAULT_POS_NAME,
  PRODUCTS_STORAGE_KEY,
  CATEGORIES_STORAGE_KEY,
  MESSAGE_STORAGE_KEY,
  BANKING_DETAILS_STORAGE_KEY,
  TRANSACTIONS_STORAGE_KEY,
  POS_NAME_STORAGE_KEY,
  DEVICE_DISABLED_PRODUCTS_KEY
} from '@/lib/constants';
import { deleteImage } from '@/lib/db';
import { generateUUID, stripUndefined } from '@/lib/utils';

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'local-only';

interface DataContextType {
  products: Product[];
  categories: string[];
  transactions: Transaction[];
  bankingDetails: BankingDetails;
  paymentMessage: string;
  posName: string;
  syncStatus: SyncStatus;
  hasPendingWrites: boolean;
  isLoading: boolean;
  isCloudConnected: boolean;

  // Actions
  addProduct: (product: Omit<Product, 'id'> | Product) => Promise<string>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  toggleProductEnabled: (productId: string, enabled: boolean) => Promise<void>;

  // Per-device product visibility
  isProductEnabledOnDevice: (productId: string) => boolean;
  toggleProductDeviceEnabled: (productId: string, enabled: boolean) => void;
  enableAllProductsOnDevice: () => void;

  addCategory: (category: string) => Promise<void>;
  deleteCategory: (category: string) => Promise<void>;
  saveCategories: (categories: string[]) => Promise<void>;

  saveBankingDetails: (details: BankingDetails) => Promise<void>;
  savePaymentMessage: (msg: string) => Promise<void>;
  savePosName: (name: string) => Promise<void>;

  recordSale: (items: CartItem[], total: number, paymentMethod: PaymentMethod, variableSymbol?: string) => Promise<Transaction>;
  deleteLastTransaction: () => Promise<void>;
  deleteBatchTransactions: (ids: string[]) => Promise<void>;
  clearAllTransactions: () => Promise<void>;
  importTransactions: (newTransactions: Transaction[]) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, isConfigured } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankingDetails, setBankingDetails] = useState<BankingDetails>(DEFAULT_BANKING_DETAILS);
  const [paymentMessage, setPaymentMessage] = useState<string>(DEFAULT_MESSAGE);
  const [posName, setPosName] = useState<string>(DEFAULT_POS_NAME);

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [hasPendingWrites, setHasPendingWrites] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deviceDisabledProductIds, setDeviceDisabledProductIds] = useState<Set<string>>(new Set());

  // Load per-device disabled products from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(DEVICE_DISABLED_PRODUCTS_KEY);
      if (stored) {
        setDeviceDisabledProductIds(new Set(JSON.parse(stored)));
      }
    } catch (e) {
      console.warn("Chyba při čtení lokálně vypnutých produktů:", e);
    }
  }, []);

  // Monitor network connectivity
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isCloudConnected = Boolean(isConfigured && user && db);

  // Computed sync status
  const syncStatus: SyncStatus = useMemo(() => {
    if (!isCloudConnected) return 'local-only';
    if (!isOnline) return 'offline';
    if (hasPendingWrites) return 'syncing';
    return 'online';
  }, [isCloudConnected, isOnline, hasPendingWrites]);

  // Load / Sync data
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // LOCAL-ONLY MODE (not logged in or Firebase not configured)
    if (!isCloudConnected) {
      try {
        const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY);
        setProducts(storedProducts ? JSON.parse(storedProducts) : DEFAULT_PRODUCTS);

        const storedCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
        setCategories(storedCategories ? JSON.parse(storedCategories) : DEFAULT_CATEGORIES);

        const storedTxs = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
        setTransactions(storedTxs ? JSON.parse(storedTxs) : []);

        const storedBank = localStorage.getItem(BANKING_DETAILS_STORAGE_KEY);
        setBankingDetails(storedBank ? JSON.parse(storedBank) : DEFAULT_BANKING_DETAILS);

        const storedMsg = localStorage.getItem(MESSAGE_STORAGE_KEY);
        setPaymentMessage(storedMsg ? JSON.parse(storedMsg) : DEFAULT_MESSAGE);

        const storedPos = localStorage.getItem(POS_NAME_STORAGE_KEY);
        setPosName(storedPos ? JSON.parse(storedPos) : DEFAULT_POS_NAME);
      } catch (e) {
        console.error("Chyba při čtení localStorage:", e);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // CLOUD MODE WITH OFFLINE PERSISTENCE (Firebase Firestore)
    if (!db || !user) return;
    const firestore = db;
    const userId = user.uid;
    setIsLoading(true);

    const unsubscribers: (() => void)[] = [];
    const pendingWritesMap = { settings: false, products: false, transactions: false };
    const syncPendingStatus = (source: 'settings' | 'products' | 'transactions', hasPending: boolean) => {
      pendingWritesMap[source] = hasPending;
      const isAnyPending = pendingWritesMap.settings || pendingWritesMap.products || pendingWritesMap.transactions;
      setHasPendingWrites(isAnyPending);
    };

    // 1. Settings listener (meta/settings)
    const settingsDocRef = doc(firestore, 'users', userId, 'meta', 'settings');
    const unsubSettings = onSnapshot(settingsDocRef, { includeMetadataChanges: true }, (docSnap) => {
      syncPendingStatus('settings', docSnap.metadata.hasPendingWrites);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.categories) setCategories(data.categories);
        if (data.bankingDetails) setBankingDetails(data.bankingDetails);
        if (data.paymentMessage) setPaymentMessage(data.paymentMessage);
        if (data.posName) setPosName(data.posName);
      } else {
        // First time initialization: migrate from localStorage or set defaults
        let initialCategories = DEFAULT_CATEGORIES;
        let initialBank = DEFAULT_BANKING_DETAILS;
        let initialMsg = DEFAULT_MESSAGE;
        let initialPos = DEFAULT_POS_NAME;

        try {
          const lCategories = localStorage.getItem(CATEGORIES_STORAGE_KEY);
          if (lCategories) initialCategories = JSON.parse(lCategories);
          const lBank = localStorage.getItem(BANKING_DETAILS_STORAGE_KEY);
          if (lBank) initialBank = JSON.parse(lBank);
          const lMsg = localStorage.getItem(MESSAGE_STORAGE_KEY);
          if (lMsg) initialMsg = JSON.parse(lMsg);
          const lPos = localStorage.getItem(POS_NAME_STORAGE_KEY);
          if (lPos) initialPos = JSON.parse(lPos);
        } catch (e) {}

        setDoc(settingsDocRef, {
          categories: initialCategories,
          bankingDetails: initialBank,
          paymentMessage: initialMsg,
          posName: initialPos,
        }, { merge: true });
      }
    });
    unsubscribers.push(unsubSettings);

    // 2. Products collection listener
    const productsColRef = collection(firestore, 'users', userId, 'products');
    const unsubProducts = onSnapshot(productsColRef, { includeMetadataChanges: true }, async (snapshot) => {
      syncPendingStatus('products', snapshot.metadata.hasPendingWrites);

      if (snapshot.empty && !snapshot.metadata.fromCache) {
        // If Firestore is empty, auto-migrate existing products from localStorage
        let localProds: Product[] = DEFAULT_PRODUCTS;
        try {
          const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY);
          if (stored) localProds = JSON.parse(stored);
        } catch (e) {}

        if (localProds && localProds.length > 0) {
          const batch = writeBatch(firestore);
          localProds.forEach((p) => {
            const pRef = doc(firestore, 'users', userId, 'products', p.id);
            batch.set(pRef, p);
          });
          await batch.commit();
        }
      } else {
        const prodsList: Product[] = [];
        snapshot.forEach((doc) => {
          prodsList.push(doc.data() as Product);
        });
        setProducts(prodsList);
        // Also keep local storage mirror updated
        try {
          localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(prodsList));
        } catch (e) {}
      }
      setIsLoading(false);
    });
    unsubscribers.push(unsubProducts);

    // 3. Transactions listener
    const txColRef = collection(firestore, 'users', userId, 'transactions');
    const txQuery = query(txColRef, orderBy('date', 'desc'));
    const unsubTx = onSnapshot(txQuery, { includeMetadataChanges: true }, async (snapshot) => {
      syncPendingStatus('transactions', snapshot.metadata.hasPendingWrites);

      if (snapshot.empty && !snapshot.metadata.fromCache) {
        // Check if there are local transactions to migrate
        let localTxs: Transaction[] = [];
        try {
          const stored = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
          if (stored) localTxs = JSON.parse(stored);
        } catch (e) {}

        if (localTxs.length > 0) {
          const batch = writeBatch(firestore);
          localTxs.forEach((tx) => {
            const txRef = doc(firestore, 'users', userId, 'transactions', tx.id);
            batch.set(txRef, tx);
          });
          await batch.commit();
        }
      } else {
        const txList: Transaction[] = [];
        snapshot.forEach((doc) => {
          txList.push(doc.data() as Transaction);
        });
        setTransactions(txList);
        try {
          localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(txList));
        } catch (e) {}
      }
    });
    unsubscribers.push(unsubTx);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [isCloudConnected, user]);

  // MUTATIONS

  const addProduct = useCallback(async (productData: Omit<Product, 'id'> | Product): Promise<string> => {
    const id = 'id' in productData && productData.id ? productData.id : generateUUID();
    const newProduct: Product = { ...productData, id, enabled: productData.enabled ?? true };
    const firestore = db;

    if (isCloudConnected && firestore && user) {
      const pRef = doc(firestore, 'users', user.uid, 'products', id);
      await setDoc(pRef, stripUndefined(newProduct));
    } else {
      const updated = [...products, newProduct];
      setProducts(updated);
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
    }
    return id;
  }, [isCloudConnected, user, products]);

  const updateProduct = useCallback(async (product: Product): Promise<void> => {
    const firestore = db;
    if (isCloudConnected && firestore && user) {
      const pRef = doc(firestore, 'users', user.uid, 'products', product.id);
      await setDoc(pRef, stripUndefined(product), { merge: true });
    } else {
      const updated = products.map((p) => (p.id === product.id ? product : p));
      setProducts(updated);
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
    }
  }, [isCloudConnected, user, products]);

  const toggleProductEnabled = useCallback(async (productId: string, enabled: boolean): Promise<void> => {
    const firestore = db;
    if (isCloudConnected && firestore && user) {
      const pRef = doc(firestore, 'users', user.uid, 'products', productId);
      await updateDoc(pRef, { enabled });
    } else {
      const updated = products.map((p) => (p.id === productId ? { ...p, enabled } : p));
      setProducts(updated);
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
    }
  }, [isCloudConnected, user, products]);

  const deleteProduct = useCallback(async (productId: string): Promise<void> => {
    const productToDelete = products.find((p) => p.id === productId);
    if (productToDelete?.imageUrl?.startsWith('img_')) {
      await deleteImage(productToDelete.imageUrl);
    }
    const firestore = db;

    if (isCloudConnected && firestore && user) {
      const pRef = doc(firestore, 'users', user.uid, 'products', productId);
      await deleteDoc(pRef);
    } else {
      const updated = products.filter((p) => p.id !== productId);
      setProducts(updated);
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updated));
    }
  }, [isCloudConnected, user, products]);

  const saveCategories = useCallback(async (newCategories: string[]): Promise<void> => {
    setCategories(newCategories);
    const firestore = db;
    if (isCloudConnected && firestore && user) {
      const settingsRef = doc(firestore, 'users', user.uid, 'meta', 'settings');
      await setDoc(settingsRef, { categories: newCategories }, { merge: true });
    } else {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(newCategories));
    }
  }, [isCloudConnected, user]);

  const addCategory = useCallback(async (category: string): Promise<void> => {
    const trimmed = category.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    await saveCategories([...categories, trimmed]);
  }, [categories, saveCategories]);

  const deleteCategory = useCallback(async (cat: string): Promise<void> => {
    await saveCategories(categories.filter((c) => c !== cat));
  }, [categories, saveCategories]);

  const saveBankingDetails = useCallback(async (details: BankingDetails): Promise<void> => {
    setBankingDetails(details);
    const firestore = db;
    if (isCloudConnected && firestore && user) {
      const settingsRef = doc(firestore, 'users', user.uid, 'meta', 'settings');
      await setDoc(settingsRef, { bankingDetails: stripUndefined(details) }, { merge: true });
    } else {
      localStorage.setItem(BANKING_DETAILS_STORAGE_KEY, JSON.stringify(details));
    }
  }, [isCloudConnected, user]);

  const savePaymentMessage = useCallback(async (msg: string): Promise<void> => {
    setPaymentMessage(msg);
    const firestore = db;
    if (isCloudConnected && firestore && user) {
      const settingsRef = doc(firestore, 'users', user.uid, 'meta', 'settings');
      await setDoc(settingsRef, { paymentMessage: msg }, { merge: true });
    } else {
      localStorage.setItem(MESSAGE_STORAGE_KEY, JSON.stringify(msg));
    }
  }, [isCloudConnected, user]);

  const savePosName = useCallback(async (name: string): Promise<void> => {
    setPosName(name);
    const firestore = db;
    if (isCloudConnected && firestore && user) {
      const settingsRef = doc(firestore, 'users', user.uid, 'meta', 'settings');
      await setDoc(settingsRef, { posName: name }, { merge: true });
    } else {
      localStorage.setItem(POS_NAME_STORAGE_KEY, JSON.stringify(name));
    }
  }, [isCloudConnected, user]);

  /**
   * Records a sale transaction, automatically decrements stock atomically,
   * works seamlessly offline via Firestore's persistent cache,
   * and pushes changes in real-time to other registers when online.
   */
  const recordSale = useCallback(async (
    cartItems: CartItem[], 
    total: number, 
    paymentMethod: PaymentMethod,
    variableSymbol?: string
  ): Promise<Transaction> => {
    const txId = generateUUID();
    const cleanItems: CartItem[] = cartItems.map(item => {
      const entry: CartItem = {
        productId: item.productId,
        name: item.name || '',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        isCustom: Boolean(item.isCustom),
      };
      if (item.originalPrice !== undefined && item.originalPrice !== null) {
        entry.originalPrice = Number(item.originalPrice);
      }
      return entry;
    });

    const newTransaction: Transaction = stripUndefined({
      id: txId,
      date: new Date().toISOString(),
      total,
      items: cleanItems,
      paymentMethod,
      posName: posName || DEFAULT_POS_NAME,
      ...(variableSymbol ? { variableSymbol } : {}),
    });
    const firestore = db;

    if (isCloudConnected && firestore && user) {
      const batch = writeBatch(firestore);
      // 1. Add transaction document
      const txRef = doc(firestore, 'users', user.uid, 'transactions', txId);
      batch.set(txRef, newTransaction);

      // 2. Decrement stock for each real catalog item safely (skip custom open items)
      cleanItems.forEach((item) => {
        if (!item.isCustom && !item.productId.startsWith('custom_')) {
          const pRef = doc(firestore, 'users', user.uid, 'products', item.productId);
          batch.set(pRef, {
            stock: increment(-item.quantity),
          }, { merge: true });
        }
      });

      await batch.commit();
    } else {
      // Local fallback
      const updatedProducts = products.map((prod) => {
        const item = cartItems.find((ci) => !ci.isCustom && !ci.productId.startsWith('custom_') && ci.productId === prod.id);
        if (item) {
          return { ...prod, stock: Math.max(0, prod.stock - item.quantity) };
        }
        return prod;
      });
      setProducts(updatedProducts);
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updatedProducts));

      const updatedTxs = [newTransaction, ...transactions];
      setTransactions(updatedTxs);
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updatedTxs));
    }

    return newTransaction;
  }, [isCloudConnected, user, posName, products, transactions]);

  const deleteLastTransaction = useCallback(async (): Promise<void> => {
    if (transactions.length === 0) return;
    const lastTx = transactions[0];
    const firestore = db;

    if (isCloudConnected && firestore && user) {
      const txRef = doc(firestore, 'users', user.uid, 'transactions', lastTx.id);
      await deleteDoc(txRef);
    } else {
      const updated = transactions.slice(1);
      setTransactions(updated);
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updated));
    }
  }, [isCloudConnected, user, transactions]);

  const deleteBatchTransactions = useCallback(async (ids: string[]): Promise<void> => {
    if (ids.length === 0) return;
    const firestore = db;

    if (isCloudConnected && firestore && user) {
      const batch = writeBatch(firestore);
      ids.forEach((id) => {
        const txRef = doc(firestore, 'users', user.uid, 'transactions', id);
        batch.delete(txRef);
      });
      await batch.commit();
    } else {
      const idSet = new Set(ids);
      const updated = transactions.filter((tx) => !idSet.has(tx.id));
      setTransactions(updated);
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updated));
    }
  }, [isCloudConnected, user, transactions]);

  const clearAllTransactions = useCallback(async (): Promise<void> => {
    const firestore = db;
    if (isCloudConnected && firestore && user) {
      const txColRef = collection(firestore, 'users', user.uid, 'transactions');
      const snapshot = await getDocs(txColRef);
      const batch = writeBatch(firestore);
      snapshot.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } else {
      setTransactions([]);
      localStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
    }
  }, [isCloudConnected, user]);

  const importTransactions = useCallback(async (newTransactions: Transaction[]): Promise<void> => {
    const firestore = db;
    if (isCloudConnected && firestore && user) {
      const batch = writeBatch(firestore);
      newTransactions.forEach((tx) => {
        const txRef = doc(firestore, 'users', user.uid, 'transactions', tx.id);
        batch.set(txRef, tx, { merge: true });
      });
      await batch.commit();
    } else {
      const existingMap = new Map(transactions.map((tx) => [tx.id, tx]));
      newTransactions.forEach((tx) => existingMap.set(tx.id, tx));
      const merged = Array.from(existingMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setTransactions(merged);
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(merged));
    }
  }, [isCloudConnected, user, transactions]);

  const isProductEnabledOnDevice = useCallback((productId: string): boolean => {
    return !deviceDisabledProductIds.has(productId);
  }, [deviceDisabledProductIds]);

  const toggleProductDeviceEnabled = useCallback((productId: string, enabled: boolean) => {
    setDeviceDisabledProductIds((prev) => {
      const next = new Set(prev);
      if (enabled) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      try {
        localStorage.setItem(DEVICE_DISABLED_PRODUCTS_KEY, JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });
  }, []);

  const enableAllProductsOnDevice = useCallback(() => {
    setDeviceDisabledProductIds(new Set());
    try {
      localStorage.removeItem(DEVICE_DISABLED_PRODUCTS_KEY);
    } catch (e) {}
  }, []);

  return (
    <DataContext.Provider
      value={{
        products,
        categories,
        transactions,
        bankingDetails,
        paymentMessage,
        posName,
        syncStatus,
        hasPendingWrites,
        isLoading,
        isCloudConnected,

        addProduct,
        updateProduct,
        deleteProduct,
        toggleProductEnabled,

        isProductEnabledOnDevice,
        toggleProductDeviceEnabled,
        enableAllProductsOnDevice,

        addCategory,
        deleteCategory,
        saveCategories,

        saveBankingDetails,
        savePaymentMessage,
        savePosName,

        recordSale,
        deleteLastTransaction,
        deleteBatchTransactions,
        clearAllTransactions,
        importTransactions,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useDataContext() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
}
