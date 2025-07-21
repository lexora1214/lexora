
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User, ProductSale, Customer } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, Phone, HandCoins, Package, CheckCircle2, DollarSign } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { markInstallmentPaid } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import MapPicker from "./map-picker";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, addMonths } from 'date-fns';
import { Progress } from "./ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface RecoveryOfficerDashboardProps {
  user: User;
}

interface UpcomingInstallment {
    sale: ProductSale;
    customer: Customer;
    dueDate: Date;
    installmentNumber: number;
    amount: number;
}

const RecoveryOfficerDashboard: React.FC<RecoveryOfficerDashboardProps> = ({ user }) => {
  const [assignedSales, setAssignedSales] = useState<ProductSale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);


  useEffect(() => {
    const salesQuery = query(
        collection(db, "productSales"), 
        where("recoveryOfficerId", "==", user.id),
    );
    const salesUnsub = onSnapshot(salesQuery, (querySnapshot) => {
        const salesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductSale));
        setAssignedSales(salesData);
        if (loading) setLoading(false);
    });
    
    const customersUnsub = onSnapshot(collection(db, "customers"), (snapshot) => {
        setCustomers(snapshot.docs.map(d => ({id: d.id, ...d.data()} as Customer)));
    });

    return () => {
        salesUnsub();
        customersUnsub();
    };
  }, [user.id, loading]);
  
  const upcomingCollectionsByDay = useMemo(() => {
    const upcomingInstallments: UpcomingInstallment[] = [];
    assignedSales.forEach(sale => {
        if (sale.installments && sale.paidInstallments !== undefined && sale.paidInstallments < sale.installments) {
            const nextInstallmentNumber = sale.paidInstallments + 1;
            const saleDate = new Date(sale.saleDate);
            const dueDate = addMonths(saleDate, nextInstallmentNumber);
            
            const customer = customers.find(c => c.id === sale.customerId);

            if (customer && sale.monthlyInstallment) {
                 upcomingInstallments.push({
                    sale,
                    customer,
                    dueDate,
                    installmentNumber: nextInstallmentNumber,
                    amount: sale.monthlyInstallment,
                });
            }
        }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const threeMonthsLater = new Date(today);
    threeMonthsLater.setMonth(today.getMonth() + 3);

    const collectionsInNext3Months = upcomingInstallments.filter(inst => inst.dueDate >= today && inst.dueDate < threeMonthsLater);
    
    const groupedByDay = collectionsInNext3Months.reduce((acc, curr) => {
        const dayString = curr.dueDate.toISOString().split('T')[0];
        if (!acc[dayString]) {
            acc[dayString] = [];
        }
        acc[dayString].push(curr);
        return acc;
    }, {} as Record<string, UpcomingInstallment[]>);
    
    return Object.entries(groupedByDay).sort((a,b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

  }, [assignedSales, customers]);
  
  const handleMarkPaid = async (saleId: string) => {
      setProcessingId(saleId);
      try {
          await markInstallmentPaid(saleId);
          toast({
              title: "Installment Collected",
              description: "Status updated successfully.",
              variant: "default",
              className: "bg-success text-success-foreground",
          });
      } catch (error: any) {
          toast({ variant: "destructive", title: "Update Failed", description: error.message });
      } finally {
          setProcessingId(null);
      }
  };

  const getDayLabel = (dateString: string) => {
      const date = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      if (date.toDateString() === today.toDateString()) return "Today";
      if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
      return format(date, "EEEE, MMMM d");
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HandCoins /> My Collection Tasks</CardTitle>
          <CardDescription>Installment collections for the next three months. Mark them as paid once collected.</CardDescription>
        </CardHeader>
      </Card>
      {upcomingCollectionsByDay.length > 0 ? (
        <Accordion type="multiple" defaultValue={upcomingCollectionsByDay.length > 0 ? [upcomingCollectionsByDay[0][0]] : []} className="w-full space-y-4">
            {upcomingCollectionsByDay.map(([date, collections]) => (
                 <AccordionItem value={date} key={date}>
                    <AccordionTrigger className="text-lg font-semibold flex items-center gap-2 p-4 rounded-md bg-muted hover:bg-muted/80">
                        {getDayLabel(date)} ({collections.length} collections)
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                        {collections.map(({ sale, customer, amount, installmentNumber }) => (
                             <Card key={sale.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2"><Package /> {sale.productName}</CardTitle>
                                            <CardDescription>For: {customer.name} (Installment {installmentNumber}/{sale.installments})</CardDescription>
                                        </div>
                                        <div className="text-right">
                                             <p className="font-bold text-lg text-primary">LKR {amount.toLocaleString()}</p>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                         <Button size="sm" className="mt-1" disabled={!!processingId}>
                                                            {processingId === sale.id ? (
                                                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                                            )}
                                                             Mark as Paid
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Confirm Payment Collection</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to mark this installment as paid? This will distribute commissions and cannot be easily undone.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleMarkPaid(sale.id)}
                                                                className={cn("bg-success text-success-foreground hover:bg-success/90")}
                                                            >
                                                                Yes, Mark as Paid
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2 text-sm">
                                            <p className="font-semibold">Customer Details</p>
                                            <p><strong>Name:</strong> {customer?.name}</p>
                                            <p><strong>Address:</strong> {customer?.address}</p>
                                            <p className="flex items-center gap-2">
                                                <Phone className="h-4 w-4" /> {customer?.contactInfo}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm mb-2">Delivery Location</p>
                                            {customer?.location ? (
                                                <MapPicker 
                                                    isDisplayOnly
                                                    initialPosition={{ lat: customer.location.latitude, lng: customer.location.longitude }}
                                                />
                                            ) : <p className="text-sm text-muted-foreground">No location provided.</p>}
                                        </div>
                                    </div>
                                     {sale.installments && sale.paidInstallments !== undefined && (
                                        <div className="border-t pt-4 mt-4">
                                            <h4 className="font-semibold text-md mb-2">Installment Progress</h4>
                                            <div>
                                              <div className="flex justify-between text-sm mb-1">
                                                  <span className="font-medium">Paid Installments</span>
                                                  <span>{sale.paidInstallments} / {sale.installments}</span>
                                              </div>
                                              <Progress value={(sale.paidInstallments / sale.installments) * 100} className="h-2" />
                                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                    <p>{sale.installments - sale.paidInstallments} months remaining.</p>
                                                    {sale.monthlyInstallment && (
                                                    <p className="font-semibold text-card-foreground">
                                                        Balance: LKR {((sale.installments - sale.paidInstallments) * sale.monthlyInstallment).toLocaleString()}
                                                    </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </AccordionContent>
                 </AccordionItem>
            ))}
        </Accordion>
      ) : (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
                You have no collections due in the next three months.
            </CardContent>
          </Card>
      )}
    </div>
  );
};

export default RecoveryOfficerDashboard;
