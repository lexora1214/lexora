
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
import { Customer, ProductSale } from "@/types";
import { CalendarIcon, Hash, Home, Phone, User, CheckCircle2, XCircle, Mail, MessageSquare, MapPin, ShoppingCart, Percent, DollarSign, Repeat, Clock } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import MapPicker from "./map-picker";
import { Progress } from "./ui/progress";

interface CustomerDetailsDialogProps {
  customer: Customer | null;
  productSale?: ProductSale | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const DetailRow: React.FC<{ icon: React.ElementType, label: string, value?: React.ReactNode }> = ({ icon: Icon, label, value }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div className="flex items-start gap-4 py-2">
            <Icon className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
            <div className="flex-grow">
                <p className="text-sm text-muted-foreground">{label}</p>
                <div className="font-medium text-card-foreground">{value}</div>
            </div>
        </div>
    );
}

const CustomerDetailsDialog: React.FC<CustomerDetailsDialogProps> = ({
  customer,
  productSale,
  isOpen,
  onOpenChange,
}) => {
  if (!customer) return null;

  const hasInstallments = productSale?.paymentMethod === 'installments' && productSale.installments;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <User className="h-6 w-6 text-primary" />
                Customer Details
            </DialogTitle>
            <DialogDescription>
              Full information for {customer.name}.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh] p-1">
            <div className="grid gap-2 py-4 px-4 divide-y">
                <div className="grid md:grid-cols-2 gap-x-8">
                    <DetailRow icon={User} label="Full Name" value={customer.name} />
                    <DetailRow icon={Phone} label="Primary Contact" value={customer.contactInfo} />
                    <DetailRow icon={MessageSquare} label="WhatsApp Number" value={customer.whatsappNumber} />
                    <DetailRow icon={Mail} label="Email Address" value={customer.email} />
                    <DetailRow icon={Home} label="Address" value={customer.address} />
                    <DetailRow icon={User} label="Registered by Branch" value={customer.branch} />
                    <DetailRow icon={CalendarIcon} label="Registration Date" value={new Date(customer.saleDate).toLocaleString()} />
                </div>

                {customer.location && (
                    <div className="pt-4 mt-4">
                        <h4 className="font-semibold text-lg mb-2 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" />Location</h4>
                        <div className="rounded-lg overflow-hidden">
                           <MapPicker 
                                isDisplayOnly
                                initialPosition={{ lat: customer.location.latitude, lng: customer.location.longitude }}
                            />
                        </div>
                    </div>
                )}
                
                <div className="pt-4 mt-4">
                    <h4 className="font-semibold text-lg mb-2 text-primary">Token Information</h4>
                    <div className="grid md:grid-cols-2 gap-x-8">
                        <DetailRow icon={Hash} label="Token Serial" value={<Badge variant="outline" className="font-mono">{customer.tokenSerial}</Badge>} />
                        <DetailRow 
                            icon={customer.tokenIsAvailable ? CheckCircle2 : XCircle} 
                            label="Token Status" 
                            value={
                                <Badge variant={customer.tokenIsAvailable ? "success" : "destructive"}>
                                    {customer.tokenIsAvailable ? "Available" : "Used"}
                                </Badge>
                            }
                        />
                    </div>
                </div>

                 <div className="pt-4 mt-4">
                    <h4 className="font-semibold text-lg mb-2 text-primary">Purchase Information</h4>
                    <div className="grid md:grid-cols-2 gap-x-8">
                        <DetailRow icon={ShoppingCart} label="Purchasing Item" value={customer.purchasingItem} />
                        <DetailRow icon={Hash} label="Item Code" value={customer.purchasingItemCode} />
                        <DetailRow icon={DollarSign} label="Total Value" value={`LKR ${customer.totalValue?.toLocaleString()}`} />
                        <DetailRow icon={Percent} label="Discount" value={`LKR ${customer.discountValue?.toLocaleString()}`} />
                        <DetailRow icon={DollarSign} label="Down Payment" value={`LKR ${customer.downPayment?.toLocaleString()}`} />
                        <DetailRow icon={Repeat} label="Number of Installments" value={customer.installments} />
                        <DetailRow icon={Clock} label="Monthly Installment" value={`LKR ${customer.monthlyInstallment?.toLocaleString()}`} />
                    </div>
                </div>

                {hasInstallments && productSale.paidInstallments !== undefined && (
                    <div className="pt-4 mt-4">
                        <h4 className="font-semibold text-lg mb-4 text-primary">Installment Status</h4>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium">Paid Installments</span>
                                    <span>{productSale.paidInstallments} / {productSale.installments}</span>
                                </div>
                                <Progress value={(productSale.paidInstallments / productSale.installments!) * 100} className="h-2" />
                            </div>
                            <div className="grid md:grid-cols-2 gap-x-8">
                               <DetailRow icon={Repeat} label="Remaining Installments" value={`${productSale.installments! - productSale.paidInstallments}`} />
                               <DetailRow icon={Clock} label="Remaining Months" value={`${productSale.installments! - productSale.paidInstallments}`} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
          </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailsDialog;
