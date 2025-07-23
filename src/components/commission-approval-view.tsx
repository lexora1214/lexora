
"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { User, CommissionRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, Check, X, ShieldCheck, Users } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { approveTokenCommission, rejectTokenCommission } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CommissionApprovalViewProps {
  user: User;
}

// New component for viewing the slip
const ViewSlipDialog: React.FC<{ slipUrl: string; isOpen: boolean; onOpenChange: (open: boolean) => void; }> = ({ slipUrl, isOpen, onOpenChange }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Bank Deposit Slip</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                    <div className="relative w-full h-96">
                        <Image src={slipUrl} alt="Deposit Slip" layout="fill" objectFit="contain" data-ai-hint="deposit slip" />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};


const CommissionApprovalView: React.FC<CommissionApprovalViewProps> = ({ user }) => {
  const [pendingRequests, setPendingRequests] = useState<CommissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [slipToView, setSlipToView] = useState<string | null>(null);

  useEffect(() => {
    const requestsQuery = query(collection(db, "commissionRequests"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommissionRequest))
        .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
      setPendingRequests(requestsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await approveTokenCommission(requestId, user);
      toast({
        title: "Request Approved",
        description: "Commissions have been successfully distributed.",
        variant: "default",
        className: "bg-success text-success-foreground",
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Approval Failed", description: error.message });
    } finally {
      setProcessingId(null);
    }
  };
  
  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await rejectTokenCommission(requestId, user);
      toast({
        title: "Request Rejected",
        description: "The commission request has been rejected.",
        variant: "destructive",
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Rejection Failed", description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const groupedRequests = useMemo(() => {
    const grouped: { [key: string]: CommissionRequest[] } = {};
    const ungrouped: CommissionRequest[] = [];
    
    pendingRequests.forEach(req => {
        if (req.slipGroupId) {
            if (!grouped[req.slipGroupId]) {
                grouped[req.slipGroupId] = [];
            }
            grouped[req.slipGroupId].push(req);
        } else {
            ungrouped.push(req);
        }
    });
    
    return { grouped: Object.values(grouped), ungrouped };
  }, [pendingRequests]);


  const renderRequestRow = (request: CommissionRequest) => (
     <TableRow key={request.id}>
        <TableCell>{new Date(request.requestDate).toLocaleDateString()}</TableCell>
        <TableCell className="font-medium">{request.customerName}</TableCell>
        <TableCell>{request.salesmanName}</TableCell>
        <TableCell><Badge variant="outline">{request.tokenSerial}</Badge></TableCell>
        <TableCell>
            <Button
                variant="outline"
                size="sm"
                disabled={!request.depositSlipUrl}
                onClick={() => setSlipToView(request.depositSlipUrl!)}
            >
                View Slip
            </Button>
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
  );

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ShieldCheck /> Token Commission Approvals</CardTitle>
          <CardDescription>Review and process pending commission requests for new token sales.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendingRequests.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Salesman</TableHead>
                    <TableHead>Token Serial</TableHead>
                    <TableHead>Deposit Slip</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedRequests.ungrouped.map(renderRequestRow)}
                  {groupedRequests.grouped.map((group, index) => (
                    <React.Fragment key={`group-${index}`}>
                        <TableRow className="bg-muted/50 hover:bg-muted">
                           <TableCell colSpan={6} className="p-2">
                               <div className="flex items-center gap-2 font-semibold text-sm">
                                   <Users className="h-4 w-4 text-primary" />
                                   Grouped Submission ({group.length} requests)
                               </div>
                           </TableCell>
                        </TableRow>
                        {group.map(renderRequestRow)}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-10">
              There are no pending commission requests.
            </div>
          )}
        </CardContent>
      </Card>
      {slipToView && (
        <ViewSlipDialog
            isOpen={!!slipToView}
            onOpenChange={(open) => !open && setSlipToView(null)}
            slipUrl={slipToView}
        />
      )}
    </>
  );
};

export default CommissionApprovalView;
