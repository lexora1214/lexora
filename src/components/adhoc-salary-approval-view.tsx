
"use client";

import React, { useEffect, useState } from 'react';
import { User, AdHocSalaryRequest } from '@/types';
import { getPendingAdHocSalaryRequests, approveAdHocSalaryRequest, rejectAdHocSalaryRequest } from '@/lib/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoaderCircle, Check, X, ShieldQuestion, Calendar, User as UserIcon, Coins } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from './ui/badge';

interface AdhocSalaryApprovalViewProps {
  superAdminUser: User;
}

const AdhocSalaryApprovalView: React.FC<AdhocSalaryApprovalViewProps> = ({ superAdminUser }) => {
  const [requests, setRequests] = useState<AdHocSalaryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const pendingRequests = await getPendingAdHocSalaryRequests();
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
      await approveAdHocSalaryRequest(requestId, superAdminUser);
      toast({ title: 'Request Approved', description: 'The salary payment has been processed.', className: 'bg-success text-success-foreground' });
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
      await rejectAdHocSalaryRequest(requestId, superAdminUser);
      toast({ title: 'Request Rejected', description: 'The salary payment request has been rejected.', variant: 'destructive' });
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
        <CardTitle className="flex items-center gap-2"><ShieldQuestion /> Ad-hoc Salary Approvals</CardTitle>
        <CardDescription>Review and process special salary payment requests initiated by HR.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Amount (LKR)</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length > 0 ? (
                requests.map(request => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <div className="font-medium">{request.targetUserName}</div>
                      <Badge variant="outline">{request.targetUserRole}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {request.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <p className="max-w-xs truncate" title={request.reason}>{request.reason}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                         <UserIcon className="h-4 w-4 text-muted-foreground" />
                         <div>
                            <p className="font-medium">{request.requesterName}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(request.requestDate), 'PPP')}</p>
                         </div>
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
                    There are no pending ad-hoc salary requests from HR.
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

export default AdhocSalaryApprovalView;
