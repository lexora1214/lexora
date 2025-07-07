"use client";

import React from "react";
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
import { User } from "@/types";
import { LoaderCircle } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  contactInfo: z.string().regex(/^0\d{9}$/, { message: "Please enter a valid 10-digit mobile number." }),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
  tokenSerial: z.string().min(1, { message: "Token serial cannot be empty." }),
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
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsLoading(true);
    try {
      await createCustomer(data, salesman);
      toast({
        title: "Customer Registered",
        description: `${data.name} has been successfully registered. Commissions distributed.`,
        variant: 'default',
        className: 'bg-success text-success-foreground'
      });
      onRegistrationSuccess();
      reset();
      onOpenChange(false);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Registration Failed",
            description: error.message,
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Register New Customer</DialogTitle>
            <DialogDescription>
              Enter the customer's details and the token serial number.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <div className="col-span-3">
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="contactInfo" className="text-right">Mobile No.</Label>
              <div className="col-span-3">
                <Input id="contactInfo" type="tel" placeholder="0712345678" {...register("contactInfo")} />
                {errors.contactInfo && <p className="text-xs text-destructive mt-1">{errors.contactInfo.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">Address</Label>
              <div className="col-span-3">
                <Input id="address" {...register("address")} />
                {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tokenSerial" className="text-right">Token Serial</Label>
              <div className="col-span-3">
                <Input id="tokenSerial" {...register("tokenSerial")} />
                {errors.tokenSerial && <p className="text-xs text-destructive mt-1">{errors.tokenSerial.message}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
                {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Save customer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerRegistrationDialog;
