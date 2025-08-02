
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { User, FullPaymentRequest, Customer, ProductSale } from '@/types';
import { getPendingFullPaymentRequests, approveFullPaymentRequest, rejectFullPaymentRequest } from '@/lib/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoaderCircle, Check, X, ShieldQuestion, Calendar, User as UserIcon, FileSignature, MoreHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import CustomerDetailsDialog from './customer-details-dialog';
import { getAllCustomers, getAllUsers } from '@/lib/firestore';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface FullPaymentApprovalViewProps {
  adminUser: User;
}

const FullPaymentApprovalView: React.FC<FullPaymentApprovalViewProps> = ({ adminUser }) => {
  const [requests, setRequests] = useState<FullPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allProductSales, setAllProductSales] = useState<ProductSale[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const pendingRequests = await getPendingFullPaymentRequests();
        setRequests(pendingRequests);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch pending requests.' });
      } finally {
        setLoading(false);
      }
    };
    
    const fetchRelatedData = async () => {
        const [customers, users] = await Promise.all([
            getAllCustomers(),
            getAllUsers(),
        ]);
        setAllCustomers(customers);
        setAllUsers(users);
    }

    const salesUnsub = onSnapshot(collection(db, "productSales"), (snapshot) => {
        setAllProductSales(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as ProductSale));
    });

    fetchRequests();
    fetchRelatedData();

    return () => salesUnsub();
  }, [toast]);

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await approveFullPaymentRequest(requestId, adminUser);
      toast({ title: 'Request Approved', description: 'The full payment has been processed and commissions distributed.', className: 'bg-success text-success-foreground' });
       setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Approval Failed', description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await rejectFullPaymentRequest(requestId, adminUser);
      toast({ title: 'Request Rejected', description: 'The full payment request has been rejected.', variant: 'destructive' });
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Rejection Failed', description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleViewDetails = (customerId: string) => {
    const customer = allCustomers.find(c => c.id === customerId);
    if(customer) {
        setSelectedCustomer(customer);
        setIsDetailsDialogOpen(true);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: 'Customer details not found.' });
    }
  };
  
  const productSalesForSelectedCustomer = useMemo(() => {
    if (!selectedCustomer) return [];
    return allProductSales
      .filter(p => p.customerId === selectedCustomer.id)
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [selectedCustomer, allProductSales]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><FileSignature /> Full Payment Approvals</CardTitle>
        <CardDescription>Review and process discounted full payment settlement requests from Recovery Officers.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Original Balance</TableHead>
                <TableHead>Discounted Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length > 0 ? (
                requests.map(request => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.customerName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                         <UserIcon className="h-4 w-4 text-muted-foreground" />
                         <div>
                            <p className="font-medium">{request.recoveryOfficerName}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(request.requestDate), 'PPP')}</p>
                         </div>
                      </div>
                    </TableCell>
                    <TableCell>
                        <Badge variant="outline" className="font-mono">{request.tokenSerial}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-muted-foreground">
                      LKR {request.originalRemainingBalance.toLocaleString()}
                    </TableCell>
                    <TableCell className="font-bold text-lg text-primary">
                      LKR {request.discountedAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {processingId === request.id ? (
                        <LoaderCircle className="h-5 w-5 animate-spin ml-auto" />
                      ) : (
                        <div className="flex gap-2 justify-end">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleViewDetails(request.customerId)}>
                                        View Customer Details
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleApprove(request.id)} className="text-success focus:bg-success/10">Approve</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleReject(request.id)} className="text-destructive focus:bg-destructive/10">Reject</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    There are no pending full payment requests.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
    <CustomerDetailsDialog
        isOpen={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        customer={selectedCustomer}
        productSales={productSalesForSelectedCustomer}
        allUsers={allUsers}
        currentUser={adminUser}
      />
    </>
  );
};

export default FullPaymentApprovalView;
