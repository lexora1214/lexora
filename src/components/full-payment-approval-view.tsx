
"use client";

import React, { useEffect, useState } from 'react';
import { User, FullPaymentRequest } from '@/types';
import { getPendingFullPaymentRequests, approveFullPaymentRequest, rejectFullPaymentRequest } from '@/lib/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoaderCircle, Check, X, ShieldQuestion, Calendar, User as UserIcon, FileSignature } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from './ui/badge';

interface FullPaymentApprovalViewProps {
  adminUser: User;
}

const FullPaymentApprovalView: React.FC<FullPaymentApprovalViewProps> = ({ adminUser }) => {
  const [requests, setRequests] = useState<FullPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

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

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await approveFullPaymentRequest(requestId, adminUser);
      toast({ title: 'Request Approved', description: 'The full payment has been processed and commissions distributed.', className: 'bg-success text-success-foreground' });
      fetchRequests(); // Refresh the list
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
      fetchRequests(); // Refresh the list
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Rejection Failed', description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

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
                          <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleReject(request.id)}>
                            <X className="mr-2 h-4 w-4" /> Reject
                          </Button>
                          <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleApprove(request.id)}>
                            <Check className="mr-2 h-4 w-4" /> Approve
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    There are no pending full payment requests.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default FullPaymentApprovalView;
