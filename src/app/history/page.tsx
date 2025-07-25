"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, QrCode, Trash } from "lucide-react";
import type { Transaction } from "@/lib/types";
import { TRANSACTIONS_STORAGE_KEY } from "@/lib/constants";
import { useIsMounted } from "@/hooks/use-is-mounted";

export default function HistoryPage() {
  const isMounted = useIsMounted();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isMounted) {
      const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (storedTransactions) {
        setTransactions(JSON.parse(storedTransactions));
      }
    }
  }, [isMounted]);

  const handleDeleteLastTransaction = () => {
    const newTransactions = [...transactions];
    newTransactions.shift(); // Remove the first (most recent) transaction
    setTransactions(newTransactions);
    localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(newTransactions));
    toast({
      title: "Úspěch",
      description: "Poslední transakce byla smazána.",
      variant: "success",
      duration: 2000,
    });
  };

  if (!isMounted) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  const getPaymentMethodInfo = (method: Transaction['paymentMethod']) => {
    if (method === 'cash') {
      return {
        text: 'Hotově',
        icon: <Wallet className="h-4 w-4 mr-2" />,
        variant: 'secondary' as const,
      };
    }
    return {
      text: 'QR Platba',
      icon: <QrCode className="h-4 w-4 mr-2" />,
      variant: 'default' as const,
    };
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 sm:p-6 md:p-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Historie transakcí</CardTitle>
              <CardDescription>
                Zde je seznam vašich nedávných transakcí.
              </CardDescription>
            </div>
            {transactions.length > 0 && (
               <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash className="mr-2 h-4 w-4" />
                    Smazat poslední
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Opravdu smazat poslední transakci?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tato akce je nevratná. Dojde k trvalému odstranění poslední zaznamenané transakce.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Zrušit</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteLastTransaction}>
                      Ano, smazat
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground">Nebyly nalezeny žádné transakce.</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {transactions.map((transaction) => {
                const paymentInfo = getPaymentMethodInfo(transaction.paymentMethod);
                return (
                  <AccordionItem value={transaction.id} key={transaction.id}>
                    <AccordionTrigger>
                      <div className="flex justify-between items-center w-full pr-4">
                        <div className="flex flex-col items-start">
                           <span className="text-sm">{new Date(transaction.date).toLocaleString('cs-CZ')}</span>
                           <Badge variant={paymentInfo.variant} className="mt-1">
                            {paymentInfo.icon}
                            {paymentInfo.text}
                          </Badge>
                        </div>
                        <span className="font-bold text-primary text-lg">{transaction.total.toFixed(0)} Kč</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produkt</TableHead>
                            <TableHead className="text-center">Množství</TableHead>
                            <TableHead className="text-right">Cena</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transaction.items.map((item) => (
                            <TableRow key={item.productId}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell className="text-right">{(item.price * item.quantity).toFixed(0)} Kč</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
