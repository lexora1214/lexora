
"use client";

import React, { useEffect, useCallback } from "react";
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
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { createCustomer } from "@/lib/firestore";
import { User, Customer } from "@/types";
import { LoaderCircle } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import MapPicker from "./map-picker";
import { useOfflineSync } from "@/hooks/use-offline-sync";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  nic: z.string().min(10, "NIC must be at least 10 characters.").max(12, "NIC cannot be more than 12 characters."),
  contactInfo: z.string().regex(/^0\d{9}$/, "Please enter a valid 10-digit primary mobile number."),
  whatsappNumber: z.string().regex(/^0\d{9}$/, "Please enter a valid 10-digit WhatsApp number.").optional().or(z.literal('')),
  email: z.string().email("Please enter a valid email address.").optional().or(z.literal('')),
  address: z.string().min(5, "Address must be at least 5 characters."),
  tokenSerial: z.string().min(1, "Token serial cannot be empty."),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  purchasingItem: z.string().min(2, "Item name is required."),
  purchasingItemCode: z.string().optional(),
  totalValue: z.coerce.number().min(0, "Total value must be a positive number."),
  discountValue: z.coerce.number().min(0, "Discount must be a positive number.").optional(),
  downPayment: z.coerce.number().min(0, "Down payment must be a positive number.").optional(),
  installments: z.coerce.number().min(1, "Number of installments must be at least 1.").optional(),
  monthlyInstallment: z.coerce.number().optional(),
  branch: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CustomerRegistrationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  salesman: User;
  onRegistrationSuccess: () => void;
}

const CustomerRegistrationDialog: React.FC<CustomerRegistrationDialogProps> = ({
  isOpen,
  onOpenChange,
  salesman,
  onRegistrationSuccess,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const { isOffline } = useOfflineSync();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      branch: salesman?.branch || "N/A",
    }
  });

  const [totalValue, discountValue, downPayment, installments] = watch([
    'totalValue', 'discountValue', 'downPayment', 'installments'
  ]);

  useEffect(() => {
    if (totalValue > 0 && installments && installments > 0) {
      const discountedValue = totalValue - (discountValue || 0);
      const loanAmount = discountedValue - (downPayment || 0);
      if (loanAmount >= 0) {
        const monthly = loanAmount / installments;
        setValue('monthlyInstallment', parseFloat(monthly.toFixed(2)));
      }
    } else {
        setValue('monthlyInstallment', undefined);
    }
  }, [totalValue, discountValue, downPayment, installments, setValue]);
  
  const handleLocationChange = useCallback((location: { lat: number; lng: number }) => {
    setValue("latitude", location.lat);
    setValue("longitude", location.lng);
    toast({ title: "Location Updated", description: `Set to: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`});
  }, [setValue, toast]);

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    setIsLoading(true);
    
    const customerPayload: Omit<Customer, 'id' | 'saleDate' | 'commissionStatus' | 'salesmanId' | 'tokenIsAvailable'> = {
        name: data.name,
        nic: data.nic,
        contactInfo: data.contactInfo,
        address: data.address,
        tokenSerial: data.tokenSerial,
        whatsappNumber: data.whatsappNumber,
        email: data.email,
        location: data.latitude && data.longitude ? { latitude: data.latitude, longitude: data.longitude } : null,
        branch: salesman.branch,
        purchasingItem: data.purchasingItem,
        purchasingItemCode: data.purchasingItemCode,
        totalValue: data.totalValue,
        discountValue: data.discountValue,
        downPayment: data.downPayment,
        installments: data.installments,
        monthlyInstallment: data.monthlyInstallment
    };

    // This is a "fire-and-forget" call from the UI's perspective.
    // Firestore's offline persistence handles the rest automatically.
    // We only catch immediate validation errors from the function itself.
    createCustomer(customerPayload, salesman).catch((error: any) => {
      toast({
          variant: "destructive",
          title: "Registration Failed",
          description: error.message,
      });
      // In case of a critical error, stop the loading state.
      setIsLoading(false);
    });

    // Provide immediate feedback to the user, regardless of network status.
    // This is the key change to make the UI feel responsive.
    toast({
      title: isOffline ? "Customer Queued" : "Request Submitted",
      description: isOffline
        ? "Customer queued for registration. It will sync automatically when you're online."
        : `${data.name}'s registration is pending admin approval for commission distribution.`,
      variant: 'default',
      className: 'bg-success text-success-foreground'
    });
    
    // Close the dialog and reset the form immediately.
    onRegistrationSuccess();
    reset({ branch: salesman?.branch || "N/A" });
    onOpenChange(false);
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Register New Customer</DialogTitle>
            <DialogDescription>
              Enter the customer's details and the token serial number.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[65vh] p-1">
            <div className="grid gap-4 py-4 px-5">
              <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" {...register("name")} />
                    {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                  </div>
                   <div>
                    <Label htmlFor="nic">NIC Number</Label>
                    <Input id="nic" {...register("nic")} />
                    {errors.nic && <p className="text-xs text-destructive mt-1">{errors.nic.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor="branch">Branch</Label>
                    <Input id="branch" {...register("branch")} disabled />
                  </div>
                  <div>
                    <Label htmlFor="contactInfo">Primary Mobile</Label>
                    <Input id="contactInfo" type="tel" placeholder="0712345678" {...register("contactInfo")} />
                    {errors.contactInfo && <p className="text-xs text-destructive mt-1">{errors.contactInfo.message}</p>}
                  </div>
                   <div>
                    <Label htmlFor="whatsappNumber">WhatsApp Mobile (Optional)</Label>
                    <Input id="whatsappNumber" type="tel" placeholder="0712345678" {...register("whatsappNumber")} />
                    {errors.whatsappNumber && <p className="text-xs text-destructive mt-1">{errors.whatsappNumber.message}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input id="email" type="email" placeholder="customer@example.com" {...register("email")} />
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" {...register("address")} />
                    {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <Label>Customer Location (Click on map to set)</Label>
                    <div className="mt-2">
                        <MapPicker 
                            onLocationChange={handleLocationChange} 
                            initialPosition={
                                getValues("latitude") && getValues("longitude")
                                ? { lat: getValues("latitude")!, lng: getValues("longitude")! }
                                : null
                            }
                        />
                    </div>
                    <input type="hidden" {...register("latitude")} />
                    <input type="hidden" {...register("longitude")} />
                  </div>
              </div>

              <div className="border-t pt-4 mt-2">
                <h3 className="text-lg font-medium mb-2">Purchase Details</h3>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="purchasingItem">Purchasing Item</Label>
                        <Input id="purchasingItem" {...register("purchasingItem")} />
                        {errors.purchasingItem && <p className="text-xs text-destructive mt-1">{errors.purchasingItem.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="purchasingItemCode">Item Code (Optional)</Label>
                        <Input id="purchasingItemCode" {...register("purchasingItemCode")} />
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
                        <Label htmlFor="downPayment">Down Payment (LKR, Optional)</Label>
                        <Input id="downPayment" type="number" {...register("downPayment")} />
                    </div>
                     <div>
                        <Label htmlFor="installments">Number of Installments (Optional)</Label>
                        <Input id="installments" type="number" {...register("installments")} />
                         {errors.installments && <p className="text-xs text-destructive mt-1">{errors.installments.message}</p>}
                    </div>
                     <div className="md:col-span-2">
                        <Label htmlFor="monthlyInstallment">Monthly Installment (LKR)</Label>
                        <Input id="monthlyInstallment" {...register("monthlyInstallment")} disabled placeholder="Calculated automatically" />
                    </div>
                     <div className="md:col-span-2">
                        <Label htmlFor="tokenSerial">Token Serial</Label>
                        <Input id="tokenSerial" {...register("tokenSerial")} />
                        {errors.tokenSerial && <p className="text-xs text-destructive mt-1">{errors.tokenSerial.message}</p>}
                    </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t px-6 pb-0">
            <Button type="submit" disabled={isLoading}>
                {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Save Customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerRegistrationDialog;
