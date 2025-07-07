"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Customer } from "@/types";
import { CalendarIcon, Hash, Home, Phone, User, CheckCircle2, XCircle } from "lucide-react";

interface CustomerDetailsDialogProps {
  customer: Customer | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const DetailRow: React.FC<{ icon: React.ElementType, label: string, value: React.ReactNode }> = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-4">
        <Icon className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
        <div className="flex-grow">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium text-card-foreground">{value}</p>
        </div>
    </div>
);


const CustomerDetailsDialog: React.FC<CustomerDetailsDialogProps> = ({
  customer,
  isOpen,
  onOpenChange,
}) => {
  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <User className="h-6 w-6 text-primary" />
                Customer Details
            </DialogTitle>
            <DialogDescription>
              Full information for {customer.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <DetailRow icon={User} label="Full Name" value={customer.name} />
            <DetailRow icon={Phone} label="Contact Number" value={customer.contactInfo} />
            <DetailRow icon={Home} label="Address" value={customer.address} />
            <DetailRow icon={Hash} label="Token Serial" value={<Badge variant="outline" className="font-mono">{customer.tokenSerial}</Badge>} />
            <DetailRow icon={CalendarIcon} label="Registration Date" value={new Date(customer.saleDate).toLocaleString()} />
            <DetailRow 
                icon={customer.tokenIsAvailable ? CheckCircle2 : XCircle} 
                label="Token Status" 
                value={
                    <Badge variant={customer.tokenIsAvailable ? "success" : "destructive"}>
                        {customer.tokenIsAvailable ? "Available for Product Purchase" : "Used"}
                    </Badge>
                }
            />
          </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailsDialog;
