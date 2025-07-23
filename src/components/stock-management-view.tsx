

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, StockItem } from '@/types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { addStockItem, updateStockItem, deleteStockItem } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Trash2, Edit, LoaderCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

interface StockManagementViewProps {
  manager: User;
}

const formSchema = z.object({
  productName: z.string().min(2, 'Product name is required.'),
  productCode: z.string().optional(),
  priceCash: z.coerce.number().min(0, 'Price must be a non-negative number.'),
  priceInstallment: z.coerce.number().min(0, 'Price must be a non-negative number.'),
  quantity: z.coerce.number().min(0, 'Quantity must be a non-negative number.'),
});

type FormValues = z.infer<typeof formSchema>;

const StockItemDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  manager: User;
  item?: StockItem;
}> = ({ isOpen, onOpenChange, manager, item }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (item) {
      reset(item);
    } else {
      reset({ productName: '', productCode: '', priceCash: 0, priceInstallment: 0, quantity: 0 });
    }
  }, [item, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    try {
      if (item) {
        // Update existing item
        await updateStockItem(item.id, data);
        toast({ title: "Item Updated", description: `${data.productName} has been updated.`, className: "bg-success text-success-foreground"});
      } else {
        // Add new item
        await addStockItem({ ...data, branch: manager.branch!, managedBy: manager.id });
        toast({ title: "Item Added", description: `${data.productName} added to stock.`, className: "bg-success text-success-foreground"});
      }
      onOpenChange(false);
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
            <DialogTitle>{item ? 'Edit Stock Item' : 'Add New Stock Item'}</DialogTitle>
            <DialogDescription>
              {item ? 'Update the details for this item.' : 'Enter details for the new product.'}
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
                  <Label htmlFor="priceCash">Price (Cash Sale)</Label>
                  <Input id="priceCash" type="number" {...register('priceCash')} />
                  {errors.priceCash && <p className="text-xs text-destructive mt-1">{errors.priceCash.message}</p>}
                </div>
                 <div>
                  <Label htmlFor="priceInstallment">Price (Installment Sale)</Label>
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
              {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/>}
              {item ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const StockManagementView: React.FC<StockManagementViewProps> = ({ manager }) => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | undefined>(undefined);
  const [filter, setFilter] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (!manager.branch) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'stock'), where('branch', '==', manager.branch));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StockItem));
      setStockItems(items.sort((a,b) => a.productName.localeCompare(b.productName)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [manager.branch]);

  const handleEdit = (item: StockItem) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedItem(undefined);
    setIsDialogOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    try {
      await deleteStockItem(itemId);
      toast({ title: 'Item Deleted', description: 'The stock item has been removed.', className: "bg-success text-success-foreground" });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete item.' });
    }
  };

  const filteredItems = useMemo(() => {
    if (!filter) return stockItems;
    return stockItems.filter(item =>
      item.productName.toLowerCase().includes(filter.toLowerCase()) ||
      item.productCode?.toLowerCase().includes(filter.toLowerCase())
    );
  }, [stockItems, filter]);

  if (!manager.branch) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Stock Management Unavailable</CardTitle>
                <CardDescription>
                    You must be assigned to a branch to manage stock. Please contact an administrator.
                </CardDescription>
            </CardHeader>
        </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Stock Management</CardTitle>
              <CardDescription>Add, edit, or delete products for your branch: {manager.branch}.</CardDescription>
            </div>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <Input 
                    placeholder="Filter by name or code..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full md:w-auto"
                />
                <Button onClick={handleAdd} className="w-full md:w-auto">
                    <PlusCircle /> Add New Item
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Price (Cash)</TableHead>
                  <TableHead>Price (Installment)</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center"><LoaderCircle className="mx-auto h-6 w-6 animate-spin"/></TableCell></TableRow>
                ) : filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.productCode || 'N/A'}</TableCell>
                      <TableCell>LKR {item.priceCash.toLocaleString()}</TableCell>
                      <TableCell>LKR {item.priceInstallment.toLocaleString()}</TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(item)}><Edit className="mr-2" /> Edit</DropdownMenuItem>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <button className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-destructive">
                                        <Trash2 className="mr-2"/> Delete
                                    </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This will permanently delete the item. This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDelete(item.id)}>Continue</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">No stock items found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <StockItemDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        manager={manager}
        item={selectedItem}
      />
    </>
  );
};

export default StockManagementView;
