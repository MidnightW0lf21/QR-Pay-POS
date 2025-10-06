
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

const DB_NAME = 'QuickPayDB';
const DB_VERSION = 1;
const IMAGE_STORE_NAME = 'images';

interface MyDB extends DBSchema {
  [IMAGE_STORE_NAME]: {
    key: string;
    value: string;
  };
}

let dbPromise: Promise<IDBPDatabase<MyDB>> | null = null;

function getDbPromise() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!dbPromise) {
    dbPromise = openDB<MyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
          db.createObjectStore(IMAGE_STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}


export async function saveImage(key: string, value: string) {
  const db = await getDbPromise();
  if (!db) return;
  return db.put(IMAGE_STORE_NAME, value, key);
}

export async function getImage(key: string) {
  const db = await getDbPromise();
  if (!db) return undefined;
  return db.get(IMAGE_STORE_NAME, key);
}

export async function deleteImage(key: string) {
  const db = await getDbPromise();
  if (!db) return;
  return db.delete(IMAGE_STORE_NAME, key);
}

export async function getAllImages() {
    const db = await getDbPromise();
    if (!db) return [];
    return db.getAll(IMAGE_STORE_NAME);
}

export async function getAllImageKeys() {
    const db = await getDbPromise();
    if (!db) return [];
    return db.getAllKeys(IMAGE_STORE_NAME);
}
