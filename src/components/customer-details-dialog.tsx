

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
import { Customer, IncomeRecord, ProductSale, User } from "@/types";
import { CalendarIcon, Hash, Home, Phone, User as UserIcon, CheckCircle2, XCircle, Mail, MessageSquare, MapPin, ShoppingCart, Percent, DollarSign, Repeat, Clock, ShieldCheck, ShieldX, ShieldAlert, Users, Fingerprint } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import MapPicker from "./map-picker";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import CommissionBreakdownDialog from "./commission-breakdown-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";

interface CustomerDetailsDialogProps {
  customer: Customer | null;
  productSales: ProductSale[];
  allUsers: User[];
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const DetailRow: React.FC<{ icon: React.ElementType, label: string, value?: React.ReactNode, action?: React.ReactNode }> = ({ icon: Icon, label, value, action }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
        <div className="flex items-start gap-4 py-2">
            <Icon className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
            <div className="flex-grow">
                <p className="text-sm text-muted-foreground">{label}</p>
                <div className="font-medium text-card-foreground">{value}</div>
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
        </div>
    );
}

const CustomerDetailsDialog: React.FC<CustomerDetailsDialogProps> = ({
  customer,
  productSales,
  allUsers,
  isOpen,
  onOpenChange,
}) => {
  const [isBreakdownOpen, setIsBreakdownOpen] = React.useState(false);
  const [breakdownProps, setBreakdownProps] = React.useState<{ title: string; records: IncomeRecord[]; total: number } | null>(null);

  if (!customer) return null;

  const handleViewTokenCommissions = async () => {
    const q = query(
        collection(db, "incomeRecords"),
        where("tokenSerial", "==", customer.tokenSerial),
        where("sourceType", "==", "token_sale")
    );
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs.map(doc => doc.data() as IncomeRecord);
    const total = records.reduce((sum, record) => sum + record.amount, 0);

    setBreakdownProps({
        title: `Token Sale: ${customer.tokenSerial}`,
        records,
        total
    });
    setIsBreakdownOpen(true);
  };
  
  const handleViewProductCommissions = async (productSaleId: string, productName: string) => {
    const q = query(
        collection(db, "incomeRecords"),
        where("productSaleId", "==", productSaleId)
    );
    const querySnapshot = await getDocs(q);
    const records = querySnapshot.docs.map(doc => doc.data() as IncomeRecord);
    const total = records.reduce((sum, record) => sum + record.amount, 0);

    setBreakdownProps({
        title: `Product Sale: ${productName}`,
        records,
        total
    });
    setIsBreakdownOpen(true);
  };

  
  const salesmanName = allUsers?.find(u => u.id === customer.salesmanId)?.name || 'Unknown User';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                  <UserIcon className="h-6 w-6 text-primary" />
                  Customer Details
              </DialogTitle>
              <DialogDescription>
                Full information for {customer.name}.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[60vh] p-1">
              <div className="grid gap-2 py-4 px-4 divide-y divide-border/50">
                  <div className="grid md:grid-cols-2 gap-x-8">
                      <DetailRow icon={UserIcon} label="Full Name" value={customer.name} />
                      <DetailRow icon={Fingerprint} label="NIC Number" value={customer.nic} />
                      <DetailRow icon={Phone} label="Primary Contact" value={customer.contactInfo} />
                      <DetailRow icon={MessageSquare} label="WhatsApp Number" value={customer.whatsappNumber} />
                      <DetailRow icon={Mail} label="Email Address" value={customer.email} />
                      <DetailRow icon={Home} label="Address" value={customer.address} />
                      <DetailRow icon={UserIcon} label="Registered by" value={salesmanName} />
                      <DetailRow icon={Home} label="Registered by Branch" value={customer.branch} />
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
                          <DetailRow 
                            icon={Hash} 
                            label="Token Serial" 
                            value={<Badge variant="outline" className="font-mono">{customer.tokenSerial}</Badge>} 
                            action={
                                <Button variant="outline" size="sm" onClick={handleViewTokenCommissions}>
                                    <Users className="mr-2 h-4 w-4"/> View Commissions
                                </Button>
                            }
                           />
                          <DetailRow 
                              icon={customer.tokenIsAvailable ? CheckCircle2 : XCircle} 
                              label="Token Status" 
                              value={
                                  <Badge variant={customer.tokenIsAvailable ? "success" : "destructive"}>
                                      {customer.tokenIsAvailable ? "Available" : "Used"}
                                  </Badge>
                              }
                          />
                          <DetailRow 
                              icon={
                                  customer.commissionStatus === 'approved' ? ShieldCheck :
                                  customer.commissionStatus === 'rejected' ? ShieldX :
                                  ShieldAlert
                              } 
                              label="Commission Status" 
                              value={
                                  <Badge variant={
                                      customer.commissionStatus === 'approved' ? "success" :
                                      customer.commissionStatus === 'rejected' ? "destructive" :
                                      "secondary"
                                  } className="capitalize">
                                      {customer.commissionStatus}
                                  </Badge>
                              }
                          />
                           <DetailRow icon={DollarSign} label="Down Payment on Registration" value={customer.downPayment ? `LKR ${customer.downPayment.toLocaleString()}` : 'N/A'} />
                      </div>
                  </div>

                 {productSales && productSales.length > 0 && (
                    <div className="pt-4 mt-4">
                        <h4 className="font-semibold text-lg text-primary mb-2">Purchase History ({productSales.length})</h4>
                        <Accordion type="single" collapsible className="w-full" defaultValue={productSales.length > 0 ? productSales[0].id : undefined}>
                            {productSales.map(sale => {
                                const hasInstallments = sale.paymentMethod === 'installments' && sale.installments;
                                const remainingBalance = hasInstallments && sale.paidInstallments !== undefined && sale.monthlyInstallment
                                    ? (sale.installments! - sale.paidInstallments) * sale.monthlyInstallment
                                    : 0;
                                return (
                                    <AccordionItem value={sale.id} key={sale.id}>
                                        <AccordionTrigger>
                                            <div className="flex flex-col items-start text-left">
                                                <p className="font-semibold">{sale.productName}</p>
                                                <p className="text-xs text-muted-foreground">{new Date(sale.saleDate).toLocaleDateString()}</p>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <div className="space-y-4">
                                                <div className="flex justify-end">
                                                    <Button variant="outline" size="sm" onClick={() => handleViewProductCommissions(sale.id, sale.productName)}>
                                                        <Users className="mr-2 h-4 w-4"/> View Commissions
                                                    </Button>
                                                </div>
                                                <div className="grid md:grid-cols-2 gap-x-8">
                                                    <DetailRow icon={ShoppingCart} label="Purchasing Item" value={sale.productName} />
                                                    <DetailRow icon={Hash} label="Item Code" value={sale.productCode} />
                                                    <DetailRow icon={DollarSign} label="Total Value" value={`LKR ${sale.price?.toLocaleString()}`} />
                                                    <DetailRow icon={Percent} label="Payment Method" value={<Badge variant="outline" className="capitalize">{sale.paymentMethod}</Badge>} />
                                                </div>
                                                {hasInstallments && sale.paidInstallments !== undefined && (
                                                    <div className="pt-4 border-t">
                                                        <h4 className="font-semibold text-md mb-4 text-primary/90">Installment Status</h4>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <div className="flex justify-between text-sm mb-1">
                                                                    <span className="font-medium">Paid Installments</span>
                                                                    <span>{sale.paidInstallments} / {sale.installments}</span>
                                                                </div>
                                                                <Progress value={(sale.paidInstallments / sale.installments!) * 100} className="h-2" />
                                                            </div>
                                                            <div className="grid md:grid-cols-2 gap-x-8">
                                                                <DetailRow icon={Repeat} label="Remaining Installments" value={`${sale.installments! - sale.paidInstallments}`} />
                                                                <DetailRow icon={DollarSign} label="Remaining Balance" value={`LKR ${remainingBalance.toLocaleString()}`} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                        </Accordion>
                    </div>
                 )}
              </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>
      {breakdownProps && (
        <CommissionBreakdownDialog 
            isOpen={isBreakdownOpen}
            onOpenChange={setIsBreakdownOpen}
            title={breakdownProps.title}
            records={breakdownProps.records}
            totalCommission={breakdownProps.total}
            allUsers={allUsers}
        />
      )}
    </>
  );
};

export default CustomerDetailsDialog;
