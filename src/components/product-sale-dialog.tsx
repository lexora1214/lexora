

"use client";

import React, { useState, useEffect } from "react";
import { User, Customer, StockItem } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { createProductSaleAndDistributeCommissions } from "@/lib/firestore";
import { LoaderCircle, Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";

const formSchema = z.object({
  customerToken: z.string({ required_error: "Please select a customer token." }),
  productId: z.string({ required_error: "Please select a product." }),
  productName: z.string(), // Auto-filled
  productCode: z.string().optional(), // Auto-filled
  totalValue: z.coerce.number().min(0, "Total value must be a positive number."),
  discountValue: z.coerce.number().min(0, "Discount must be a positive number.").optional(),
  paymentMethod: z.enum(["cash", "installments"], {
    required_error: "You need to select a payment method.",
  }),
  downPayment: z.coerce.number().min(0, "Down payment must be a positive number.").optional(),
  installments: z.coerce.number().min(1, "Number of installments must be at least 1.").optional(),
  monthlyInstallment: z.coerce.number().optional(),
}).refine(data => {
  if (data.paymentMethod === 'installments') {
    return data.downPayment !== undefined && data.downPayment !== null;
  }
  return true;
}, {
  message: "Down payment is required for installment plans.",
  path: ['downPayment'],
}).refine(data => {
  if (data.paymentMethod === 'installments') {
    return data.installments !== undefined && data.installments !== null;
  }
  return true;
}, {
  message: "Number of installments is required for installment plans.",
  path: ['installments'],
});

type FormValues = z.infer<typeof formSchema>;

interface ProductSaleDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  shopManager: User;
  customers: Customer[];
  stockItems: StockItem[];
  onSaleSuccess: () => void;
}

const ProductSaleDialog: React.FC<ProductSaleDialogProps> = ({
  isOpen,
  onOpenChange,
  shopManager,
  customers,
  stockItems,
  onSaleSuccess,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);
  const [isProductPopoverOpen, setIsProductPopoverOpen] = useState(false);
  const [remainingToPay, setRemainingToPay] = useState<number | null>(null);
  
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  const [totalValue, discountValue, downPayment, installments, paymentMethod] = watch([
    'totalValue', 'discountValue', 'downPayment', 'installments', 'paymentMethod'
  ]);

  useEffect(() => {
    const total = totalValue || 0;
    const discount = discountValue || 0;
    const down = downPayment || 0;
    const remaining = total - discount - down;
    setRemainingToPay(remaining >= 0 ? remaining : 0);

    if (paymentMethod === 'installments' && remaining > 0 && installments && installments > 0) {
      const monthly = remaining / installments;
      setValue('monthlyInstallment', parseFloat(monthly.toFixed(2)));
    } else {
      setValue('monthlyInstallment', undefined);
    }
  }, [totalValue, discountValue, downPayment, installments, paymentMethod, setValue]);

  useEffect(() => {
    if (paymentMethod === 'cash') {
        setValue('installments', undefined);
        setValue('monthlyInstallment', undefined);
    }
  }, [paymentMethod, setValue]);


  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const selectedCustomer = customers.find(c => c.tokenSerial === data.customerToken);
      if (!selectedCustomer) {
        throw new Error("Invalid customer selected.");
      }

      // Explicitly nullify installment fields if payment is cash
      const payload = {...data};
      if (payload.paymentMethod === 'cash') {
        payload.installments = undefined;
        payload.monthlyInstallment = undefined;
      }

      await createProductSaleAndDistributeCommissions(
        payload,
        shopManager,
        selectedCustomer.id,
        selectedCustomer.name,
      );

      toast({
        title: "Sale Recorded",
        description: "The product sale has been recorded and commissions distributed.",
        variant: 'default',
        className: 'bg-success text-success-foreground'
      });
      onSaleSuccess();
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sale Failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const customerList = customers.sort((a,b) => b.saleDate.localeCompare(a.saleDate));

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Record Product Sale</DialogTitle>
            <DialogDescription>
              Fill in the details for the new product sale.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] p-1">
            <div className="grid gap-4 py-4 px-4">
              
              <div>
                <Label>Customer & Token</Label>
                <Controller
                  control={control}
                  name="customerToken"
                  render={({ field }) => (
                    <Popover open={isCustomerPopoverOpen} onOpenChange={setIsCustomerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isCustomerPopoverOpen}
                          className="w-full justify-between"
                        >
                          {field.value
                            ? customers.find((c) => c.tokenSerial === field.value)?.name + ` (${field.value})`
                            : "Select customer..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[375px] p-0">
                        <Command>
                          <CommandInput placeholder="Search name, token, or NIC..." />
                          <CommandList>
                              <CommandEmpty>No tokens found.</CommandEmpty>
                              <CommandGroup>
                              {customerList.map((customer) => (
                                  <CommandItem
                                  key={customer.id}
                                  value={`${customer.name} ${customer.tokenSerial} ${customer.nic || ''}`}
                                  onSelect={() => {
                                      field.onChange(customer.tokenSerial);
                                      setIsCustomerPopoverOpen(false);
                                  }}
                                  >
                                  <Check
                                      className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === customer.tokenSerial ? "opacity-100" : "opacity-0"
                                      )}
                                  />
                                  <div className="flex-grow">
                                      {customer.name} - <span className="text-muted-foreground">{customer.tokenSerial}</span>
                                      {customer.nic && <span className="text-xs text-muted-foreground ml-2">({customer.nic})</span>}
                                  </div>
                                  {!customer.tokenIsAvailable && <Badge variant="destructive" className="ml-auto">Used</Badge>}
                                  </CommandItem>
                              ))}
                              </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.customerToken && <p className="text-xs text-destructive mt-1">{errors.customerToken.message}</p>}
              </div>

               <div>
                <Label>Product</Label>
                <Controller
                  control={control}
                  name="productId"
                  render={({ field }) => (
                    <Popover open={isProductPopoverOpen} onOpenChange={setIsProductPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isProductPopoverOpen}
                          className="w-full justify-between"
                        >
                          {field.value
                            ? stockItems.find((item) => item.id === field.value)?.productName
                            : "Select product..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[375px] p-0">
                        <Command>
                          <CommandInput placeholder="Search product name or code..." />
                           <CommandList>
                              <CommandEmpty>No products in stock.</CommandEmpty>
                              <CommandGroup>
                              {stockItems.map((item) => (
                                  <CommandItem
                                  key={item.id}
                                  value={`${item.productName} ${item.productCode || ''}`}
                                  onSelect={() => {
                                      field.onChange(item.id);
                                      setValue('productName', item.productName);
                                      setValue('productCode', item.productCode);
                                      setIsProductPopoverOpen(false);
                                  }}
                                  disabled={item.quantity === 0}
                                  >
                                  <Check
                                      className={cn(
                                      "mr-2 h-4 w-4",
                                      field.value === item.id ? "opacity-100" : "opacity-0"
                                      )}
                                  />
                                   <div className="flex-grow">
                                      <p>{item.productName}</p>
                                      {item.productCode && <p className="text-xs text-muted-foreground">{item.productCode}</p>}
                                  </div>
                                  <Badge variant={item.quantity > 0 ? "success" : "destructive"}>
                                    {item.quantity} in stock
                                  </Badge>
                                  </CommandItem>
                              ))}
                              </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
                 {errors.productId && <p className="text-xs text-destructive mt-1">{errors.productId.message}</p>}
              </div>


              <div>
                <Label htmlFor="totalValue">Total Value (LKR)</Label>
                <Input id="totalValue" type="number" {...register("totalValue")} />
                {errors.totalValue && <p className="text-xs text-destructive mt-1">{errors.totalValue.message}</p>}
              </div>
              
              <div>
                <Label htmlFor="discountValue">Discount (LKR, Optional)</Label>
                <Input id="discountValue" type="number" {...register("discountValue")} />
              </div>
              
              <div>
                  <Label htmlFor="downPayment">Down Payment (LKR)</Label>
                  <Input id="downPayment" type="number" {...register("downPayment")} />
                  {errors.downPayment && <p className="text-xs text-destructive mt-1">{errors.downPayment.message}</p>}
              </div>

              <div>
                  <Label htmlFor="remainingToPay">Remaining to Pay (LKR)</Label>
                  <Input id="remainingToPay" value={remainingToPay !== null ? remainingToPay.toLocaleString() : '...'} disabled />
              </div>

              <div>
                  <Label>Payment Method</Label>
                  <Controller
                    control={control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex space-x-4 pt-2"
                      >
                          <div className="flex items-center space-x-2">
                              <RadioGroupItem value="cash" id="cash" />
                              <Label htmlFor="cash">Cash</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                              <RadioGroupItem value="installments" id="installments" />
                              <Label htmlFor="installments">Installments</Label>
                          </div>
                      </RadioGroup>
                    )}
                  />
                  {errors.paymentMethod && <p className="text-xs text-destructive mt-1">{errors.paymentMethod.message}</p>}
              </div>

              {paymentMethod === 'installments' && (
                <>
                  <div>
                      <Label htmlFor="installments">Number of Installments</Label>
                      <Input id="installments" type="number" {...register("installments")} />
                      {errors.installments && <p className="text-xs text-destructive mt-1">{errors.installments.message}</p>}
                  </div>

                  <div>
                      <Label htmlFor="monthlyInstallment">Monthly Installment (LKR)</Label>
                      <Input id="monthlyInstallment" {...register("monthlyInstallment")} disabled placeholder="Calculated automatically" />
                  </div>
                </>
              )}

            </div>
          </ScrollArea>
          <DialogFooter className="border-t pt-6 px-6 pb-0">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Save Sale & Update Stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductSaleDialog;
