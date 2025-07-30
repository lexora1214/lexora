
"use client";

import React, { useState, useMemo } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, StockItem } from '@/types';
import { addStockItem, updateStockItem } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from './ui/textarea';

interface AddGlobalStockDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  adminUser: User;
  item?: StockItem;
}

const formSchema = z.object({
  productName: z.string().min(2, 'Product name is required.'),
  productCode: z.string().optional(),
  priceCash: z.coerce.number().min(0, 'Price must be a non-negative number.'),
  priceInstallment: z.coerce.number().min(0, 'Price must be a non-negative number.'),
  imeis: z.string().min(1, 'At least one IMEI/Serial number is required.'),
});

type FormValues = z.infer<typeof formSchema>;

const AddGlobalStockDialog: React.FC<AddGlobalStockDialogProps> = ({ isOpen, onOpenChange, adminUser, item }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset, control, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: '',
      productCode: '',
      priceCash: 0,
      priceInstallment: 0,
      imeis: '',
    },
  });

  React.useEffect(() => {
    if (item) {
        reset({
            productName: item.productName,
            productCode: item.productCode,
            priceCash: item.priceCash,
            priceInstallment: item.priceInstallment,
            imeis: item.imeis?.join('\n') || '',
        });
    } else {
        reset({
            productName: '',
            productCode: '',
            priceCash: 0,
            priceInstallment: 0,
            imeis: '',
        });
    }
  }, [item, reset]);

  const imeiString = watch('imeis');
  const quantity = useMemo(() => {
    return imeiString ? imeiString.split('\n').filter(Boolean).length : 0;
  }, [imeiString]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    const imeiList = data.imeis.split('\n').map(s => s.trim()).filter(Boolean);
    
    // Check for duplicates
    const uniqueImeis = new Set(imeiList);
    if (uniqueImeis.size !== imeiList.length) {
        toast({ variant: 'destructive', title: 'Error', description: 'Duplicate IMEI/Serial numbers found. Please ensure all are unique.' });
        setIsLoading(false);
        return;
    }

    try {
        const payload: Omit<StockItem, 'id' | 'lastUpdatedAt'> = {
            ...data,
            quantity,
            imeis: imeiList,
            managedBy: adminUser.id,
            branch: 'Main Stock',
        };

        if (item) {
            await updateStockItem(item.id, payload);
            toast({ title: "Item Updated", description: `${data.productName} has been updated in Main Stock.`, className: "bg-success text-success-foreground" });
        } else {
            await addStockItem(payload);
            toast({ title: "Item Added", description: `${data.productName} added to Main Stock.`, className: "bg-success text-success-foreground" });
        }
      
        onOpenChange(false);
        reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{item ? 'Edit Item in' : 'Add New Item to'} Main Stock</DialogTitle>
            <DialogDescription>
              Enter product details. Quantity is determined by the number of IMEI/Serial numbers entered.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="productName">Product Name</Label>
              <Input id="productName" {...register('productName')} />
              {errors.productName && <p className="text-xs text-destructive mt-1">{errors.productName.message}</p>}
            </div>
            <div>
              <Label htmlFor="productCode">Product Code (Optional)</Label>
              <Input id="productCode" {...register('productCode')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priceCash">Price (Cash)</Label>
                <Input id="priceCash" type="number" {...register('priceCash')} />
                {errors.priceCash && <p className="text-xs text-destructive mt-1">{errors.priceCash.message}</p>}
              </div>
              <div>
                <Label htmlFor="priceInstallment">Price (Installment)</Label>
                <Input id="priceInstallment" type="number" {...register('priceInstallment')} />
                {errors.priceInstallment && <p className="text-xs text-destructive mt-1">{errors.priceInstallment.message}</p>}
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="imeis">IMEI / Serial Numbers (one per line)</Label>
                <span className="text-sm font-medium text-muted-foreground">Quantity: {quantity}</span>
              </div>
              <Textarea id="imeis" {...register('imeis')} rows={5} placeholder="Paste or type one serial number per line..." />
              {errors.imeis && <p className="text-xs text-destructive mt-1">{errors.imeis.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              {item ? 'Update Item' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddGlobalStockDialog;
