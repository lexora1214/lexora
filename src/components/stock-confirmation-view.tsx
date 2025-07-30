
"use client";

import React, { useState, useMemo } from 'react';
import { User, StockTransfer } from '@/types';
import { confirmStockTransfer } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle, CheckSquare, Calendar, User as UserIcon, Package, Hash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface StockConfirmationViewProps {
  manager: User;
  allStockTransfers: StockTransfer[];
}

const StockConfirmationView: React.FC<StockConfirmationViewProps> = ({ manager, allStockTransfers }) => {
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingTransfers = useMemo(() => {
    return allStockTransfers
        .filter(t => t.toBranch === manager.branch && t.status === 'pending')
        .sort((a,b) => new Date(b.initiatedAt).getTime() - new Date(a.initiatedAt).getTime());
  }, [allStockTransfers, manager.branch]);

  const handleConfirm = async (transferId: string) => {
    setProcessingId(transferId);
    try {
        await confirmStockTransfer(transferId, manager);
        toast({ title: "Transfer Confirmed", description: "Stock has been added to your branch inventory.", className: "bg-success text-success-foreground" });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Confirmation Failed', description: error.message });
    } finally {
        setProcessingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CheckSquare /> Confirm Stock Receipt</CardTitle>
        <CardDescription>Review pending stock transfers from the main warehouse to your branch ({manager.branch}) and confirm their receipt.</CardDescription>
      </CardHeader>
      <CardContent>
        {pendingTransfers.length > 0 ? (
            <Accordion type="single" collapsible className="w-full space-y-4">
            {pendingTransfers.map(transfer => (
                <AccordionItem value={transfer.id} key={transfer.id}>
                    <AccordionTrigger className="text-base font-semibold p-4 rounded-md bg-muted hover:bg-muted/80">
                        <div className="flex justify-between w-full pr-4">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(transfer.initiatedAt), 'PPP')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4" />
                                <span>From: {transfer.initiatedByName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Package className="h-4 w-4" />
                                <span>{transfer.items.reduce((sum, item) => sum + item.imeis.length, 0)} items</span>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 px-2 space-y-4">
                        {transfer.items.map(item => (
                            <div key={item.productId} className="border p-3 rounded-md">
                                <h4 className="font-semibold">{item.productName}</h4>
                                <p className="text-sm text-muted-foreground">{item.productCode}</p>
                                <div className="mt-2 space-y-1">
                                    <h5 className="text-xs font-medium text-muted-foreground">IMEIs ({item.imeis.length}):</h5>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                                        {item.imeis.map(imei => (
                                            <div key={imei} className="bg-background text-xs font-mono p-1 rounded-sm border flex items-center gap-1.5">
                                               <Hash className="h-3 w-3" /> {imei}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="text-right mt-4">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                <Button disabled={!!processingId}>
                                    {processingId === transfer.id ? <LoaderCircle className="mr-2 animate-spin" /> : <CheckSquare className="mr-2"/>}
                                    Confirm Receipt
                                </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirm Stock Receipt?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will add the transferred items and their IMEIs to your branch's inventory. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleConfirm(transfer.id)}>Confirm</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
            </Accordion>
        ) : (
            <div className="text-center text-muted-foreground p-8">No pending stock transfers for your branch.</div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockConfirmationView;
