
"use client";

import React, { useEffect, useState } from 'react';
import { User, IncentiveChangeRequest, IncentiveSettings, Role, SalesmanStage, IncentiveTier } from '@/types';
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
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';


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

  const compareTiers = (current: IncentiveTier[] = [], proposed: IncentiveTier[] = []) => {
    const allTiers: { current?: IncentiveTier, proposed?: IncentiveTier, changed: boolean }[] = [];
    const proposedMap = new Map(proposed.map(p => [p.id, p]));

    // Check current tiers against proposed
    for (const c of current) {
      const p = proposedMap.get(c.id);
      if (p) {
        // Tier exists in both
        const changed = c.target !== p.target || c.incentive !== p.incentive;
        allTiers.push({ current: c, proposed: p, changed });
        proposedMap.delete(c.id);
      } else {
        // Tier was removed
        allTiers.push({ current: c, proposed: undefined, changed: true });
      }
    }

    // Add new tiers
    for (const p of proposedMap.values()) {
      allTiers.push({ current: undefined, proposed: p, changed: true });
    }

    return allTiers;
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Incentive Change Details</DialogTitle>
          <DialogDescription>
            Requested by {request.requestedByName} on {format(new Date(request.requestDate), 'PPP')}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="mt-4">
            <div className="space-y-6 pr-4">
                {INCENTIVE_ROLES.map(role => {
                    const comparison = compareTiers(request.currentSettings[role], request.newSettings[role]);
                    const hasAnyChanges = comparison.some(c => c.changed);

                    if (!hasAnyChanges) return null;

                    return (
                        <Card key={role} className="bg-muted/30">
                            <CardHeader>
                                <CardTitle>{role}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div>
                                        <h4 className="font-semibold mb-2">Current Tiers</h4>
                                        <div className="space-y-2">
                                        {(request.currentSettings[role] || []).map(tier => {
                                            const isRemoved = !request.newSettings[role]?.some(p => p.id === tier.id);
                                            return (
                                                <div key={tier.id} className={cn("p-2 rounded-md border", isRemoved && "bg-destructive/10 border-destructive/20")}>
                                                    <div className="flex justify-between">
                                                        <span>Target: {tier.target.toLocaleString()}</span>
                                                        <span className="font-semibold">LKR {tier.incentive.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {(request.currentSettings[role] || []).length === 0 && <p className="text-sm text-muted-foreground">No tiers defined.</p>}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold mb-2">Proposed Tiers</h4>
                                        <div className="space-y-2">
                                        {(request.newSettings[role] || []).map(tier => {
                                            const original = request.currentSettings[role]?.find(c => c.id === tier.id);
                                            const isNew = !original;
                                            const isModified = original && (original.target !== tier.target || original.incentive !== tier.incentive);
                                            return (
                                                <div key={tier.id} className={cn("p-2 rounded-md border", isNew && "bg-success/10 border-success/20", isModified && "bg-blue-500/10 border-blue-500/20")}>
                                                     <div className="flex justify-between">
                                                        <span>Target: <span className={cn(isModified && original?.target !== tier.target && "font-bold")}>{tier.target.toLocaleString()}</span></span>
                                                        <span className={cn("font-semibold", isModified && original?.incentive !== tier.incentive && "font-bold")}>LKR {tier.incentive.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {(request.newSettings[role] || []).length === 0 && <p className="text-sm text-muted-foreground">No tiers defined.</p>}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </ScrollArea>
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
