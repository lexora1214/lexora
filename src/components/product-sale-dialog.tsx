"use client";

import React, { useState } from "react";
import { User, Customer } from "@/types";
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

const formSchema = z.object({
  productName: z.string().min(2, "Product name is required."),
  productCode: z.string().optional(),
  price: z.coerce.number().min(1, "Price must be a positive value."),
  paymentMethod: z.enum(["cash", "installments"], {
    required_error: "You need to select a payment method.",
  }),
  customerToken: z.string({ required_error: "Please select a customer token." }),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductSaleDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  shopManager: User;
  customers: Customer[];
  onSaleSuccess: () => void;
}

const ProductSaleDialog: React.FC<ProductSaleDialogProps> = ({
  isOpen,
  onOpenChange,
  shopManager,
  customers,
  onSaleSuccess,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const selectedCustomer = customers.find(c => c.tokenSerial === data.customerToken);
      if (!selectedCustomer) {
        throw new Error("Invalid customer selected.");
      }

      await createProductSaleAndDistributeCommissions(
        {
          productName: data.productName,
          productCode: data.productCode,
          price: data.price,
          paymentMethod: data.paymentMethod,
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          tokenSerial: selectedCustomer.tokenSerial,
          shopManagerId: shopManager.id,
        },
        shopManager
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
          <div className="grid gap-4 py-4">
            
            <div>
              <Label>Customer & Token</Label>
              <Controller
                control={control}
                name="customerToken"
                render={({ field }) => (
                  <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isPopoverOpen}
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
                        <CommandInput placeholder="Search customer or token..." />
                        <CommandList>
                            <CommandEmpty>No available tokens found.</CommandEmpty>
                            <CommandGroup>
                            {customers
                                .filter((customer) => customer.tokenIsAvailable)
                                .map((customer) => (
                                <CommandItem
                                key={customer.tokenSerial}
                                value={`${customer.name} ${customer.tokenSerial}`}
                                onSelect={() => {
                                    field.onChange(customer.tokenSerial);
                                    setIsPopoverOpen(false);
                                }}
                                >
                                <Check
                                    className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === customer.tokenSerial ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {customer.name} - <span className="text-muted-foreground ml-2">{customer.tokenSerial}</span>
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
              <Label htmlFor="productName">Product Name</Label>
              <Input id="productName" {...register("productName")} />
              {errors.productName && <p className="text-xs text-destructive mt-1">{errors.productName.message}</p>}
            </div>

             <div>
              <Label htmlFor="productCode">Product Code (Optional)</Label>
              <Input id="productCode" {...register("productCode")} />
            </div>

            <div>
              <Label htmlFor="price">Price (LKR)</Label>
              <Input id="price" type="number" {...register("price")} />
              {errors.price && <p className="text-xs text-destructive mt-1">{errors.price.message}</p>}
            </div>

            <div>
                <Label>Payment Method</Label>
                <Controller
                  control={control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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

          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Save Sale
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductSaleDialog;
