"use client";

import React from 'react';
import { StockItem } from '@/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';

const ViewImeisDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  item: StockItem;
}> = ({ isOpen, onOpenChange, item }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>IMEIs for {item.productName}</DialogTitle>
                <DialogDescription>
                    A total of {item.imeis?.length || 0} unique serial numbers.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-72 w-full rounded-md border">
                <div className="p-4 text-sm">
                    {item.imeis && item.imeis.length > 0 ? (
                        <ul className="space-y-2">
                            {item.imeis.map((imei, index) => (
                                <li key={index} className="font-mono bg-muted/50 p-2 rounded-md">{imei}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground text-center">No IMEI/Serial numbers recorded for this item.</p>
                    )}
                </div>
            </ScrollArea>
        </DialogContent>
    </Dialog>
  )
};

export default ViewImeisDialog;
