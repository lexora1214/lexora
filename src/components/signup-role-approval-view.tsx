
"use client";

import React, { useEffect, useState } from 'react';
import { User, SignupRoleChangeRequest, Role } from '@/types';
import { getPendingSignupRoleRequests, approveSignupRoleChange, rejectSignupRoleChange } from '@/lib/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoaderCircle, Check, X, ShieldQuestion, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ALL_SIGNUP_ROLES: Role[] = ["Admin", "Regional Director", "Head Group Manager", "Group Operation Manager", "Team Operation Manager", "Branch Admin", "Salesman", "Delivery Boy", "Recovery Officer", "Store Keeper"];

const ViewChangesDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  request: SignupRoleChangeRequest | null;
}> = ({ isOpen, onOpenChange, request }) => {
  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Role Visibility Changes</DialogTitle>
          <DialogDescription>
            Requested by {request.requestedByName} on {format(new Date(request.requestDate), 'PPP')}.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead>Proposed</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ALL_SIGNUP_ROLES.map(role => {
                        const current = request.currentSettings.visibleRoles[role] ? 'Visible' : 'Hidden';
                        const proposed = request.newSettings.visibleRoles[role] ? 'Visible' : 'Hidden';
                        const hasChanged = current !== proposed;
                        return (
                            <TableRow key={role} className={hasChanged ? "bg-muted/50" : ""}>
                                <TableCell className="font-medium">{role}</TableCell>
                                <TableCell>{current}</TableCell>
                                <TableCell className={`font-bold ${hasChanged ? (proposed === 'Visible' ? 'text-success' : 'text-destructive') : ''}`}>
                                    {proposed}
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


interface SignupRoleApprovalViewProps {
  user: User;
}

const SignupRoleApprovalView: React.FC<SignupRoleApprovalViewProps> = ({ user }) => {
  const [requests, setRequests] = useState<SignupRoleChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingRequest, setViewingRequest] = useState<SignupRoleChangeRequest | null>(null);

  const fetchRequests = React.useCallback(async () => {
    try {
      setLoading(true);
      const pendingRequests = await getPendingSignupRoleRequests();
      setRequests(pendingRequests);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch pending requests.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await approveSignupRoleChange(requestId, user);
      toast({ title: 'Request Approved', description: 'The signup role settings have been updated.', className: 'bg-success text-success-foreground' });
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
      await rejectSignupRoleChange(requestId, user);
      toast({ title: 'Request Rejected', description: 'The change request has been rejected.', variant: 'destructive' });
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
          <CardTitle className="flex items-center gap-2"><ShieldQuestion /> Signup Role Approvals</CardTitle>
          <CardDescription>Review and process pending changes to signup role visibility.</CardDescription>
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
                      <TableCell>{format(new Date(request.requestDate), 'PPP')}</TableCell>
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
                      There are no pending requests.
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

export default SignupRoleApprovalView;
