
"use client";

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User } from '@/types';
import { addStockItem } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AddGlobalStockDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  adminUser: User;
}

const formSchema = z.object({
  productName: z.string().min(2, 'Product name is required.'),
  productCode: z.string().optional(),
  priceCash: z.coerce.number().min(0, 'Price must be a non-negative number.'),
  priceInstallment: z.coerce.number().min(0, 'Price must be a non-negative number.'),
  quantity: z.coerce.number().min(0, 'Quantity must be a non-negative number.'),
});

type FormValues = z.infer<typeof formSchema>;

const AddGlobalStockDialog: React.FC<AddGlobalStockDialogProps> = ({ isOpen, onOpenChange, adminUser }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: '',
      productCode: '',
      priceCash: 0,
      priceInstallment: 0,
      quantity: 0,
    },
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    try {
      // Admins always add to "Main Stock"
      await addStockItem({ ...data, managedBy: adminUser.id, branch: 'Main Stock' });
      toast({ title: "Item Added", description: `${data.productName} added to Main Stock.`, className: "bg-success text-success-foreground" });
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
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add New Item to Main Stock</DialogTitle>
            <DialogDescription>Enter details for the new product. It will be added to the central main stock and be visible to all branches.</DialogDescription>
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
              <Label htmlFor="quantity">Quantity</Label>
              <Input id="quantity" type="number" {...register('quantity')} />
              {errors.quantity && <p className="text-xs text-destructive mt-1">{errors.quantity.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddGlobalStockDialog;
