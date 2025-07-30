
"use client";

import React, { useState, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, StockItem } from '@/types';
import { createStockTransfer } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle, PlusCircle, Trash2, PackagePlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Checkbox } from './ui/checkbox';
import { ChevronsUpDown } from 'lucide-react';

const transferredItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string(),
  productCode: z.string().optional(),
  imeis: z.array(z.string()).min(1, 'You must select at least one IMEI.'),
});

const formSchema = z.object({
  toBranch: z.string().min(1, 'Branch is required.'),
  items: z.array(transferredItemSchema).min(1, 'You must add at least one item.'),
});

type FormValues = z.infer<typeof formSchema>;

interface StockAssignmentViewProps {
  storeKeeper: User;
  allStockItems: StockItem[];
  allUsers: User[];
}

const StockAssignmentView: React.FC<StockAssignmentViewProps> = ({ storeKeeper, allStockItems, allUsers }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const { control, handleSubmit, reset, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { toBranch: '', items: [] },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'items',
  });

  const mainStockItems = useMemo(() => {
    return allStockItems.filter(item => item.branch === 'Main Stock' && (item.imeis?.length ?? 0) > 0);
  }, [allStockItems]);

  const branches = useMemo(() => {
    return Array.from(new Set(allUsers.map(u => u.branch).filter(Boolean)));
  }, [allUsers]);
  
  const selectedItems = watch('items');

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      await createStockTransfer({
        fromBranch: 'Main Stock',
        toBranch: data.toBranch,
        items: data.items,
        status: 'pending',
        initiatedById: storeKeeper.id,
        initiatedByName: storeKeeper.name,
        initiatedAt: new Date().toISOString(),
      });
      toast({ title: "Transfer Initiated", description: "Stock assignment has been sent for confirmation.", className: "bg-success text-success-foreground" });
      reset({ toBranch: '', items: [] });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Transfer Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = () => {
    append({ productId: '', productName: '', imeis: [] });
  };
  
  const handleProductSelect = (itemIndex: number, stockItem: StockItem) => {
    update(itemIndex, {
        productId: stockItem.id,
        productName: stockItem.productName,
        productCode: stockItem.productCode,
        imeis: [], // Reset IMEIs when product changes
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><PackagePlus />Assign Stock to Branch</CardTitle>
        <CardDescription>Select items from Main Stock and assign them to a branch. The quantity will be based on the number of IMEIs you select.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="font-medium">Destination Branch</label>
            <Controller
              control={control}
              name="toBranch"
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger><SelectValue placeholder="Select a branch..." /></SelectTrigger>
                  <SelectContent>
                    {branches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => {
              const selectedProduct = mainStockItems.find(item => item.id === selectedItems[index]?.productId);
              return (
                <div key={field.id} className="border p-4 rounded-md space-y-4 relative">
                  <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="font-medium">Product</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                    {selectedProduct?.productName || 'Select product...'} <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search products..."/>
                                    <CommandList>
                                        <CommandEmpty>No products found.</CommandEmpty>
                                        <CommandGroup>
                                            {mainStockItems.map(item => (
                                                <CommandItem key={item.id} onSelect={() => handleProductSelect(index, item)}>
                                                    {item.productName} ({item.imeis?.length || 0})
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                  </div>
                  {selectedProduct && (
                    <div className="space-y-2">
                        <label className="font-medium">Select IMEIs (Selected: {selectedItems[index]?.imeis.length})</label>
                        <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                            {(selectedProduct.imeis || []).map(imei => (
                                <div key={imei} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`${field.id}-${imei}`}
                                        checked={selectedItems[index]?.imeis.includes(imei)}
                                        onCheckedChange={checked => {
                                            const currentImeis = selectedItems[index].imeis;
                                            const newImeis = checked
                                                ? [...currentImeis, imei]
                                                : currentImeis.filter(id => id !== imei);
                                            setValue(`items.${index}.imeis`, newImeis);
                                        }}
                                    />
                                    <label htmlFor={`${field.id}-${imei}`} className="text-sm font-mono">{imei}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleAddItem}>
              <PlusCircle className="mr-2" /> Add Item to Transfer
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Initiate Transfer
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default StockAssignmentView;
