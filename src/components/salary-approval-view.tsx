
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { User, SalaryChangeRequest, SalarySettings } from '@/types';
import { getPendingSalaryChangeRequests, approveSalaryChangeRequest, rejectSalaryChangeRequest } from '@/lib/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoaderCircle, Check, X, ShieldQuestion, Calendar, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SALARY_ROLES: (keyof SalarySettings)[] = [
  "BUSINESS PROMOTER (stage 01)",
  "MARKETING EXECUTIVE (stage 02)",
  "Team Operation Manager",
  "Group Operation Manager",
  "Head Group Manager",
  "Regional Director",
];

const ViewChangesDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  request: SalaryChangeRequest | null;
}> = ({ isOpen, onOpenChange, request }) => {
  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Salary Change Details</DialogTitle>
          <DialogDescription>
            Requested by {request.requestedByName} on {format(new Date(request.requestDate), 'PPP')}.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Current Salary</TableHead>
                        <TableHead className="text-right">Proposed Salary</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {SALARY_ROLES.map(role => {
                        const current = request.currentSettings[role] ?? 0;
                        const proposed = request.newSettings[role] ?? 0;
                        const hasChanged = current !== proposed;
                        return (
                            <TableRow key={role} className={hasChanged ? "bg-muted/50" : ""}>
                                <TableCell className="font-medium">{role}</TableCell>
                                <TableCell className="text-right">LKR {current.toLocaleString()}</TableCell>
                                <TableCell className={`text-right font-bold ${hasChanged ? (proposed > current ? 'text-success' : 'text-destructive') : ''}`}>
                                    LKR {proposed.toLocaleString()}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};


interface SalaryApprovalViewProps {
  user: User;
}

const SalaryApprovalView: React.FC<SalaryApprovalViewProps> = ({ user }) => {
  const [requests, setRequests] = useState<SalaryChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingRequest, setViewingRequest] = useState<SalaryChangeRequest | null>(null);

  const fetchRequests = async () => {
    try {
      const pendingRequests = await getPendingSalaryChangeRequests();
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
      await approveSalaryChangeRequest(requestId, user);
      toast({ title: 'Request Approved', description: 'The salary settings have been updated.', className: 'bg-success text-success-foreground' });
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
      await rejectSalaryChangeRequest(requestId, user);
      toast({ title: 'Request Rejected', description: 'The salary change request has been rejected.', variant: 'destructive' });
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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldQuestion /> Salary Change Approvals</CardTitle>
          <CardDescription>Review and process pending changes to the salary settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length > 0 ? (
                  requests.map(request => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <UserIcon className="h-4 w-4 text-muted-foreground" />
                           <span className="font-medium">{request.requestedByName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                           <span>{format(new Date(request.requestDate), 'PPP')}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {processingId === request.id ? (
                          <LoaderCircle className="h-5 w-5 animate-spin ml-auto" />
                        ) : (
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setViewingRequest(request)}>View Changes</Button>
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
                    <TableCell colSpan={3} className="h-24 text-center">
                      There are no pending salary change requests.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <ViewChangesDialog 
        isOpen={!!viewingRequest}
        onOpenChange={(isOpen) => !isOpen && setViewingRequest(null)}
        request={viewingRequest}
      />
    </>
  );
};

export default SalaryApprovalView;
