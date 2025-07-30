
"use client";

import React, { useEffect, useState } from 'react';
import { User, IncentiveChangeRequest, IncentiveSettings, Role, SalesmanStage } from '@/types';
import { getPendingIncentiveChangeRequests, approveIncentiveChangeRequest, rejectIncentiveChangeRequest } from '@/lib/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoaderCircle, Check, X, ShieldQuestion, Calendar, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const INCENTIVE_ROLES: (Role | SalesmanStage)[] = [
    "BUSINESS PROMOTER (stage 01)",
    "MARKETING EXECUTIVE (stage 02)",
    "Team Operation Manager",
    "Group Operation Manager",
    "Head Group Manager",
    "Regional Director",
];

const ViewIncentiveChangesDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  request: IncentiveChangeRequest | null;
}> = ({ isOpen, onOpenChange, request }) => {
  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Incentive Change Details</DialogTitle>
          <DialogDescription>
            Requested by {request.requestedByName} on {format(new Date(request.requestDate), 'PPP')}.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Role / Stage</TableHead>
                        <TableHead className="text-right">Current Target</TableHead>
                        <TableHead className="text-right">Proposed Target</TableHead>
                        <TableHead className="text-right">Current Incentive</TableHead>
                        <TableHead className="text-right">Proposed Incentive</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {INCENTIVE_ROLES.map(role => {
                        const current = request.currentSettings[role];
                        const proposed = request.newSettings[role];
                        const targetChanged = current?.target !== proposed?.target;
                        const incentiveChanged = current?.incentive !== proposed?.incentive;
                        const hasChanged = targetChanged || incentiveChanged;

                        return (
                            <TableRow key={role} className={hasChanged ? "bg-muted/50" : ""}>
                                <TableCell className="font-medium">{role}</TableCell>
                                <TableCell className="text-right">{current?.target?.toLocaleString() ?? 'N/A'}</TableCell>
                                <TableCell className={`text-right font-bold ${targetChanged ? 'text-primary' : ''}`}>
                                    {proposed?.target?.toLocaleString() ?? 'N/A'}
                                </TableCell>
                                <TableCell className="text-right">LKR {current?.incentive?.toLocaleString() ?? 'N/A'}</TableCell>
                                <TableCell className={`text-right font-bold ${incentiveChanged ? (proposed?.incentive ?? 0) > (current?.incentive ?? 0) ? 'text-success' : 'text-destructive' : ''}`}>
                                    LKR {proposed?.incentive?.toLocaleString() ?? 'N/A'}
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


interface IncentiveApprovalViewProps {
  user: User;
}

const IncentiveApprovalView: React.FC<IncentiveApprovalViewProps> = ({ user }) => {
  const [requests, setRequests] = useState<IncentiveChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingRequest, setViewingRequest] = useState<IncentiveChangeRequest | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const pendingRequests = await getPendingIncentiveChangeRequests();
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
      await approveIncentiveChangeRequest(requestId, user);
      toast({ title: 'Request Approved', description: 'The incentive settings have been updated.', className: 'bg-success text-success-foreground' });
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
      await rejectIncentiveChangeRequest(requestId, user);
      toast({ title: 'Request Rejected', description: 'The incentive change request has been rejected.', variant: 'destructive' });
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
          <CardTitle className="flex items-center gap-2"><ShieldQuestion /> Incentive Change Approvals</CardTitle>
          <CardDescription>Review and process pending changes to the incentive settings.</CardDescription>
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
                      There are no pending incentive change requests.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <ViewIncentiveChangesDialog 
        isOpen={!!viewingRequest}
        onOpenChange={(isOpen) => !isOpen && setViewingRequest(null)}
        request={viewingRequest}
      />
    </>
  );
};

export default IncentiveApprovalView;
