
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { User, SalaryPayoutRequest, Customer } from '@/types';
import { getPendingSalaryPayoutRequests, approveSalaryPayout, rejectSalaryPayoutRequest } from '@/lib/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoaderCircle, Check, X, ShieldCheck, Calendar, User as UserIcon, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SalaryPayoutApprovalViewProps {
  user: User;
  allCustomers: Customer[];
}

const SalaryPayoutApprovalView: React.FC<SalaryPayoutApprovalViewProps> = ({ user, allCustomers }) => {
  const [requests, setRequests] = useState<SalaryPayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const pendingRequests = await getPendingSalaryPayoutRequests();
      setRequests(pendingRequests);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch pending payout requests.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (request: SalaryPayoutRequest) => {
    setProcessingId(request.id);
    try {
      await approveSalaryPayout(request.id, user, allCustomers);
      toast({ title: 'Request Approved', description: `Salaries for ${request.month} have been processed.`, className: 'bg-success text-success-foreground' });
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
      await rejectSalaryPayoutRequest(requestId, user);
      toast({ title: 'Request Rejected', description: 'The salary payout request has been rejected.', variant: 'destructive' });
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
        <CardTitle className="flex items-center gap-2"><ShieldCheck /> Salary Payout Approvals</CardTitle>
        <CardDescription>Review and process pending salary payout requests.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length > 0 ? (
                requests.map(request => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium text-lg">{format(new Date(request.month), 'MMMM yyyy')}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(request.requestDate), 'PPP')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                         <UserIcon className="h-4 w-4 text-muted-foreground" />
                         <span className="font-medium">{request.requesterName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                           <Users className="h-4 w-4 text-muted-foreground" />
                           {request.totalUsersToPay} Users / LKR {request.totalAmountToPay.toLocaleString()}
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {processingId === request.id ? (
                        <LoaderCircle className="h-5 w-5 animate-spin ml-auto" />
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleReject(request.id)}>
                            <X className="mr-2 h-4 w-4" /> Reject
                          </Button>
                          <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleApprove(request)}>
                            <Check className="mr-2 h-4 w-4" /> Approve & Pay
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    There are no pending salary payout requests.
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

export default SalaryPayoutApprovalView;

    