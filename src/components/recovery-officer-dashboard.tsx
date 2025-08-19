
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User, ProductSale, Customer, Collection } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, Phone, HandCoins, Package, CheckCircle2, DollarSign, Navigation, AlertTriangle, MessageSquarePlus, TrendingUp } from "lucide-react";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { markInstallmentPaid, payArrears, createFullPaymentRequest } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import MapPicker from "./map-picker";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';
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
import AddNoteDialog from "./add-note-dialog";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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

const RequestFullPaymentDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sale: ProductSale;
  officer: User;
  remainingBalance: number;
}> = ({ isOpen, onOpenChange, sale, officer, remainingBalance }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [discountedAmount, setDiscountedAmount] = useState(remainingBalance);

  const handleSubmit = async () => {
    if (discountedAmount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Discounted amount must be positive.' });
      return;
    }
    setIsLoading(true);
    try {
      await createFullPaymentRequest({
        productSaleId: sale.id,
        customerId: sale.customerId,
        customerName: sale.customerName,
        recoveryOfficerId: officer.id,
        recoveryOfficerName: officer.name,
        originalRemainingBalance: remainingBalance,
        discountedAmount: discountedAmount,
      });
      toast({
        title: 'Request Submitted',
        description: 'Your full payment request has been sent to the Recovery Admin for approval.',
        className: 'bg-success text-success-foreground',
      });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Request Full Payment Settlement</AlertDialogTitle>
          <AlertDialogDescription>
            Enter the final discounted amount the customer will pay to settle the remaining balance. This will require admin approval.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Original Remaining Balance</Label>
            <Input value={`LKR ${remainingBalance.toLocaleString()}`} disabled />
          </div>
          <div>
            <Label htmlFor="discounted-amount">Final Payment Amount (with discount)</Label>
            <Input
              id="discounted-amount"
              type="number"
              value={discountedAmount}
              onChange={(e) => setDiscountedAmount(Number(e.target.value))}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/>}
            Submit Request
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


const RecoveryOfficerDashboard: React.FC<RecoveryOfficerDashboardProps> = ({ user }) => {
  const [assignedSales, setAssignedSales] = useState<ProductSale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [noteCustomer, setNoteCustomer] = useState<Customer | null>(null);
  const [requestingFullPaymentSale, setRequestingFullPaymentSale] = useState<ProductSale | null>(null);


  useEffect(() => {
    const salesQuery = query(
        collection(db, "productSales"), 
        where("recoveryOfficerId", "==", user.id),
        where("recoveryStatus", "==", "assigned")
    );
    const salesUnsub = onSnapshot(salesQuery, (querySnapshot) => {
        const salesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductSale));
        setAssignedSales(salesData);
        if (loading) setLoading(false);
    });
    
    const customersUnsub = onSnapshot(collection(db, "customers"), (snapshot) => {
        setCustomers(snapshot.docs.map(d => ({id: d.id, ...d.data()} as Customer)));
    });

    const collectionsQuery = query(collection(db, "collections"), where("collectorId", "==", user.id));
    const collectionsUnsub = onSnapshot(collectionsQuery, (snapshot) => {
        const collectionsData = snapshot.docs.map(doc => doc.data() as Collection);
        setCollections(collectionsData);
    });

    return () => {
        salesUnsub();
        customersUnsub();
        collectionsUnsub();
    };
  }, [user.id, loading]);
  
  const upcomingCollectionsByDay = useMemo(() => {
    const upcomingInstallments: UpcomingInstallment[] = [];
    assignedSales.forEach(sale => {
        if (sale.installments && sale.paidInstallments !== undefined && sale.paidInstallments < sale.installments) {
            const nextInstallmentNumber = sale.paidInstallments + 1;
            
            const baseDate = new Date(sale.saleDate);
            const dueDate = sale.nextDueDateOverride ? new Date(sale.nextDueDateOverride) : addMonths(baseDate, sale.paidInstallments + 1);
            
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

    const groupedByDay = upcomingInstallments.reduce((acc, curr) => {
        const dayString = curr.dueDate.toISOString().split('T')[0];
        if (!acc[dayString]) {
            acc[dayString] = [];
        }
        acc[dayString].push(curr);
        return acc;
    }, {} as Record<string, UpcomingInstallment[]>);
    
    return Object.entries(groupedByDay).sort((a,b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

  }, [assignedSales, customers]);
  
  const monthlyCollections = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return collections.filter(c => {
        const collectedDate = new Date(c.collectedAt);
        return collectedDate >= start && collectedDate <= end;
    }).sort((a,b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime());
  }, [collections]);

  const monthlyTotal = monthlyCollections.reduce((sum, c) => sum + c.amount, 0);

  const handleMarkPaid = async (saleId: string) => {
      setProcessingId(saleId);
      try {
          await markInstallmentPaid(saleId, user);
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
  
  const handlePayArrears = async (sale: ProductSale) => {
    setProcessingId(sale.id);
    try {
        await payArrears(sale.id, user);
        toast({
            title: "Arrear Paid",
            description: "An arrear has been marked as paid.",
            variant: "default",
            className: "bg-success text-success-foreground",
        });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
        setProcessingId(null);
    }
  };


  const handleStartRide = (customer: Customer) => {
    if (!customer.location) {
        toast({
            variant: "destructive",
            title: "Navigation Failed",
            description: "No location is available for this customer.",
        });
        return;
    }
    const { latitude, longitude } = customer.location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const handleAddNoteClick = (customer: Customer) => {
    setNoteCustomer(customer);
    setIsNoteDialogOpen(true);
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
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HandCoins /> My Collection Tasks</CardTitle>
            <CardDescription>All your assigned installment collections, sorted by due date.</CardDescription>
          </CardHeader>
           <CardContent>
                <div className="text-sm font-medium">This Month's Collections ({format(new Date(), 'MMMM')})</div>
                <div className="text-3xl font-bold mt-1">LKR {monthlyTotal.toLocaleString()}</div>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Collection History (This Month)</CardTitle>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {monthlyCollections.length > 0 ? monthlyCollections.map(c => (
                            <TableRow key={c.id}>
                                <TableCell>{format(new Date(c.collectedAt), 'PP')}</TableCell>
                                <TableCell>{c.customerName}</TableCell>
                                <TableCell><Badge variant={c.type === 'arrear' ? 'destructive' : 'secondary'} className="capitalize">{c.type}</Badge></TableCell>
                                <TableCell className="text-right font-medium">LKR {c.amount.toLocaleString()}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">No collections this month yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        {upcomingCollectionsByDay.length > 0 ? (
          <Accordion type="multiple" defaultValue={upcomingCollectionsByDay.length > 0 ? [upcomingCollectionsByDay[0][0]] : []} className="w-full space-y-4">
              {upcomingCollectionsByDay.map(([date, collections]) => (
                   <AccordionItem value={date} key={date}>
                      <AccordionTrigger className="text-lg font-semibold flex items-center gap-2 p-4 rounded-md bg-muted hover:bg-muted/80">
                          {getDayLabel(date)} ({collections.length} collections)
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 space-y-4">
                          {collections.map(({ sale, customer, amount, installmentNumber }) => {
                              const remainingInstallments = sale.installments! - sale.paidInstallments!;
                              const remainingBalance = remainingInstallments * sale.monthlyInstallment!;
                              const arrearsAmount = (sale.arrears || 0) * (sale.monthlyInstallment || 0);
                              return (
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
                                                  <div className="flex justify-between items-center">
                                                    <p className="font-semibold">Customer Details</p>
                                                    <Button size="sm" variant="outline" onClick={() => handleAddNoteClick(customer)}>
                                                      <MessageSquarePlus className="mr-2 h-4 w-4" /> Add Note
                                                    </Button>
                                                  </div>
                                                  <p><strong>Name:</strong> {customer?.name}</p>
                                                  <p><strong>Address:</strong> {customer?.address}</p>
                                                  <p className="flex items-center gap-2">
                                                      <Phone className="h-4 w-4" /> {customer?.contactInfo}
                                                  </p>
                                                  {customer.location && (
                                                      <Button
                                                          size="sm"
                                                          className="mt-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20 transition-all hover:shadow-accent/40"
                                                          onClick={() => handleStartRide(customer)}
                                                      >
                                                          <Navigation className="mr-2 h-4 w-4" /> Start Ride
                                                      </Button>
                                                  )}
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
                                                  <div className="flex justify-between items-center">
                                                    <h4 className="font-semibold text-md mb-2">Installment Progress</h4>
                                                    {sale.arrears && sale.arrears > 0 && (
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="destructive" className="flex items-center gap-1 text-base">
                                                                <TrendingUp className="h-4 w-4" />
                                                                {sale.arrears} Arrears (LKR {arrearsAmount.toLocaleString()})
                                                            </Badge>
                                                             <AlertDialog>
                                                              <AlertDialogTrigger asChild>
                                                                <Button size="sm" variant="destructive" disabled={!!processingId}>Pay Arrear</Button>
                                                              </AlertDialogTrigger>
                                                              <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Confirm Arrear Payment</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This will mark one arrear as paid. Commissions are not distributed for arrear payments.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handlePayArrears(sale)}>Confirm</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                              </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    )}
                                                  </div>
                                                  <div>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="font-medium">Paid Installments</span>
                                                        <span>{sale.paidInstallments} / {sale.installments}</span>
                                                    </div>
                                                    <Progress value={(sale.paidInstallments / sale.installments) * 100} className="h-2" />
                                                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                                          <p>{remainingInstallments} months remaining.</p>
                                                          {sale.monthlyInstallment && (
                                                          <p className="font-semibold text-card-foreground">
                                                              Balance: LKR {remainingBalance.toLocaleString()}
                                                          </p>
                                                          )}
                                                      </div>
                                                  </div>
                                                   {remainingInstallments > 1 && (
                                                      <div className="mt-4 p-3 rounded-lg border border-amber-500/50 bg-amber-500/10">
                                                          <div className="flex items-start gap-3">
                                                              <AlertTriangle className="h-5 w-5 mt-1 text-amber-500" />
                                                              <div className="flex-grow">
                                                                  <h5 className="font-semibold text-amber-700">Early Payout Option</h5>
                                                                  <p className="text-xs text-amber-600">The customer can pay off the remaining balance of LKR {remainingBalance.toLocaleString()} now.</p>
                                                              </div>
                                                                <Button size="sm" variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200" onClick={() => setRequestingFullPaymentSale(sale)}>
                                                                    Request Full Payout
                                                                </Button>
                                                          </div>
                                                      </div>
                                                  )}
                                              </div>
                                          )}
                                      </CardContent>
                                  </Card>
                              )
                          })}
                      </AccordionContent>
                   </AccordionItem>
              ))}
          </Accordion>
        ) : (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                  You have no collections assigned.
              </CardContent>
            </Card>
        )}
      </div>
      {noteCustomer && (
        <AddNoteDialog 
            isOpen={isNoteDialogOpen}
            onOpenChange={setIsNoteDialogOpen}
            customer={noteCustomer}
            officer={user}
        />
      )}
       {requestingFullPaymentSale && (
        <RequestFullPaymentDialog
          isOpen={!!requestingFullPaymentSale}
          onOpenChange={() => setRequestingFullPaymentSale(null)}
          sale={requestingFullPaymentSale}
          officer={user}
          remainingBalance={(requestingFullPaymentSale.installments! - requestingFullPaymentSale.paidInstallments!) * requestingFullPaymentSale.monthlyInstallment!}
        />
      )}
    </>
  );
};

export default RecoveryOfficerDashboard;

