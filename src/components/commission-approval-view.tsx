

"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { User, CommissionRequest, CommissionChangeRequest, CommissionSettings, ProductCommissionSettings, TokenCommissionChangeRequest, ProductCommissionChangeRequest } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, Check, X, ShieldCheck, Users, CheckCheck, ZoomIn, ZoomOut, RotateCcw, Settings, FileText } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { approveTokenCommission, rejectTokenCommission, approveGroupedCommissions, rejectGroupedCommissions, getPendingCommissionChangeRequests, approveCommissionChange, rejectCommissionChange } from "@/lib/firestore";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// New component for viewing the slip with zoom
const ViewSlipDialog: React.FC<{ slipUrl: string; isOpen: boolean; onOpenChange: (open: boolean) => void; }> = ({ slipUrl, isOpen, onOpenChange }) => {
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        // Reset zoom when dialog is closed
        if (!isOpen) {
            setTimeout(() => setZoom(1), 200); // Reset after closing animation
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Bank Deposit Slip</DialogTitle>
                </DialogHeader>
                <div className="mt-4 relative bg-muted rounded-lg overflow-hidden h-[70vh]">
                    <div className="absolute inset-0 overflow-auto">
                        <div
                            className="relative w-full h-full flex items-center justify-center transition-transform duration-200"
                            style={{ transform: `scale(${zoom})` }}
                        >
                            <Image src={slipUrl} alt="Deposit Slip" layout="fill" objectFit="contain" data-ai-hint="deposit slip" />
                        </div>
                    </div>
                </div>
                 <DialogFooter className="sm:justify-center pt-2">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}>
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setZoom(1)}>
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}>
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ViewChangesDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  request: CommissionChangeRequest | null;
}> = ({ isOpen, onOpenChange, request }) => {
  if (!request) return null;

  const renderContent = () => {
    if (request.type === 'token') {
        const req = request as TokenCommissionChangeRequest;
        return (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">Proposed</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Object.keys(req.currentSettings).map(key => {
                        const role = key as keyof CommissionSettings;
                        const current = req.currentSettings[role];
                        const proposed = req.newSettings[role];
                        const hasChanged = current !== proposed;
                        return (
                             <TableRow key={role} className={hasChanged ? "bg-muted/50" : ""}>
                                <TableCell className="font-medium capitalize">{role.replace(/([A-Z])/g, ' $1')}</TableCell>
                                <TableCell className="text-right">LKR {current.toLocaleString()}</TableCell>
                                <TableCell className={`text-right font-bold ${hasChanged ? 'text-primary' : ''}`}>
                                    LKR {proposed.toLocaleString()}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        )
    }
     if (request.type === 'product') {
      const req = request as ProductCommissionChangeRequest;
      // For simplicity, just showing a summary. A full diff would be complex.
      return (
        <div className="space-y-4">
          <p>This request modifies the tiered commission structure for products.</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="border p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Current Settings</h4>
                <p>{req.currentSettings.tiers.length} tiers</p>
            </div>
             <div className="border p-4 rounded-lg border-primary bg-primary/5">
                <h4 className="font-semibold mb-2">Proposed Settings</h4>
                <p>{req.newSettings.tiers.length} tiers</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Due to the complexity, a detailed breakdown is not shown here. Please review the request carefully before approving.</p>
        </div>
      );
    }
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Commission Change Details</DialogTitle>
           <DialogDescription>
            Requested by {request.requestedByName} on {format(new Date(request.requestDate), 'PPP')}.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
            {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};


const CommissionApprovalView: React.FC<{ user: User }> = ({ user }) => {
  const [pendingTokenRequests, setPendingTokenRequests] = useState<CommissionRequest[]>([]);
  const [pendingSettingRequests, setPendingSettingRequests] = useState<CommissionChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [slipToView, setSlipToView] = useState<string | null>(null);
  const [changesToView, setChangesToView] = useState<CommissionChangeRequest | null>(null);
  
  const isSuperAdmin = user.role === 'Super Admin';


  useEffect(() => {
    const tokenRequestsQuery = query(collection(db, "commissionRequests"), where("status", "==", "pending"));
    const tokenUnsubscribe = onSnapshot(tokenRequestsQuery, (snapshot) => {
      const requestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommissionRequest))
        .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
      setPendingTokenRequests(requestsData);
      setLoading(false);
    });
    
    if (isSuperAdmin) {
        const settingsUnsubscribe = getPendingCommissionChangeRequests().then(setPendingSettingRequests);
    }


    return () => {
        tokenUnsubscribe();
    };
  }, [isSuperAdmin]);

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
  
  const handleApproveGroup = async (slipGroupId: string) => {
    setProcessingId(slipGroupId);
    try {
      await approveGroupedCommissions(slipGroupId, user);
      toast({
        title: "Group Approved",
        description: "All requests in the group have been approved.",
        variant: "default",
        className: "bg-success text-success-foreground",
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Group Approval Failed", description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectGroup = async (slipGroupId: string) => {
    setProcessingId(slipGroupId);
    try {
      await rejectGroupedCommissions(slipGroupId, user);
      toast({
        title: "Group Rejected",
        description: "All requests in the group have been rejected.",
        variant: "destructive",
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Group Rejection Failed", description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveSettings = async (requestId: string) => {
    setProcessingId(requestId);
    try {
        await approveCommissionChange(requestId, user);
        toast({ title: "Request Approved", description: "Settings have been updated.", className: "bg-success text-success-foreground" });
        setPendingSettingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch(e: any) {
        toast({ variant: "destructive", title: "Approval Failed", description: e.message });
    } finally {
        setProcessingId(null);
    }
  };

  const handleRejectSettings = async (requestId: string) => {
    setProcessingId(requestId);
    try {
        await rejectCommissionChange(requestId, user);
        toast({ title: "Request Rejected", variant: "destructive" });
        setPendingSettingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch(e: any) {
        toast({ variant: "destructive", title: "Rejection Failed", description: e.message });
    } finally {
        setProcessingId(null);
    }
  };


  const groupedRequests = useMemo(() => {
    const grouped: { [key: string]: CommissionRequest[] } = {};
    const ungrouped: CommissionRequest[] = [];
    
    pendingTokenRequests.forEach(req => {
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
  }, [pendingTokenRequests]);


  const renderRequestRow = (request: CommissionRequest, isGrouped: boolean = false) => (
     <TableRow key={request.id}>
        <TableCell>{new Date(request.requestDate).toLocaleDateString()}</TableCell>
        <TableCell className="font-medium">{request.customerName}</TableCell>
        <TableCell>{request.salesmanName}</TableCell>
        <TableCell><Badge variant="outline">{request.tokenSerial}</Badge></TableCell>
        <TableCell className="text-right">
            {!isGrouped && processingId === request.id ? (
                <LoaderCircle className="h-5 w-5 animate-spin ml-auto" />
            ) : !isGrouped ? (
                <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleReject(request.id)}>
                    <X className="mr-2 h-4 w-4" /> Reject
                </Button>
                    <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleApprove(request.id)}>
                    <Check className="mr-2 h-4 w-4" /> Approve
                </Button>
                </div>
            ) : null}
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
          <CardTitle className="flex items-center gap-2"><ShieldCheck /> Approvals Center</CardTitle>
          <CardDescription>Review and process pending commission requests and setting changes.</CardDescription>
        </CardHeader>
        <CardContent>
           <Tabs defaultValue="token-sales">
              <TabsList className={cn("grid w-full", isSuperAdmin ? "grid-cols-2" : "grid-cols-1")}>
                <TabsTrigger value="token-sales">
                    <Users className="mr-2 h-4 w-4" /> Token Sales ({pendingTokenRequests.length})
                </TabsTrigger>
                {isSuperAdmin && (
                    <TabsTrigger value="setting-changes">
                        <Settings className="mr-2 h-4 w-4" /> Setting Changes ({pendingSettingRequests.length})
                    </TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="token-sales" className="mt-4">
                 {pendingTokenRequests.length > 0 ? (
                    <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Salesman</TableHead>
                            <TableHead>Token Serial</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {/* Render individual ungrouped requests */}
                        {groupedRequests.ungrouped.map(req => (
                            <TableRow key={req.id}>
                            <TableCell>{new Date(req.requestDate).toLocaleDateString()}</TableCell>
                            <TableCell className="font-medium">{req.customerName}</TableCell>
                            <TableCell>{req.salesmanName}</TableCell>
                            <TableCell><Badge variant="outline">{req.tokenSerial}</Badge></TableCell>
                            <TableCell className="text-right">
                                {processingId === req.id ? (
                                    <div className="flex justify-end"><LoaderCircle className="h-5 w-5 animate-spin" /></div>
                                ) : (
                                <div className="flex gap-2 justify-end">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={!req.depositSlipUrl}
                                        onClick={() => setSlipToView(req.depositSlipUrl!)}
                                    >
                                        View Slip
                                    </Button>
                                    <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleReject(req.id)}>
                                        <X className="mr-2 h-4 w-4" />
                                    </Button>
                                    <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleApprove(req.id)} disabled={!req.depositSlipUrl}>
                                        <Check className="mr-2 h-4 w-4" />
                                    </Button>
                                </div>
                                )}
                            </TableCell>
                            </TableRow>
                        ))}
                        
                        {/* Render grouped requests */}
                        {groupedRequests.grouped.map((group, index) => {
                            const slipGroupId = group[0].slipGroupId!;
                            return (
                            <React.Fragment key={`group-${slipGroupId}`}>
                                <TableRow className="bg-muted/50 hover:bg-muted">
                                    <TableCell colSpan={3}>
                                        <div className="flex items-center gap-2 font-semibold text-sm">
                                            <Users className="h-4 w-4 text-primary" />
                                            Grouped Submission ({group.length} requests) by {group[0].salesmanName}
                                        </div>
                                    </TableCell>
                                    <TableCell colSpan={2} className="text-right">
                                        {processingId === slipGroupId ? (
                                            <LoaderCircle className="h-5 w-5 animate-spin ml-auto" />
                                        ) : (
                                            <div className="flex gap-2 justify-end">
                                            <Button variant="outline" size="sm" onClick={() => setSlipToView(group[0].depositSlipUrl!)}>View Shared Slip</Button>
                                            <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleRejectGroup(slipGroupId)}><X className="mr-2 h-4 w-4" />Reject All</Button>
                                            <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleApproveGroup(slipGroupId)}><CheckCheck className="mr-2 h-4 w-4" />Approve All</Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                                {group.map(req => renderRequestRow(req, true))}
                            </React.Fragment>
                            )
                        })}
                        </TableBody>
                    </Table>
                    </div>
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                    There are no pending token sale commission requests.
                    </div>
                )}
              </TabsContent>
               {isSuperAdmin && (
                <TabsContent value="setting-changes" className="mt-4">
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Requested By</TableHead>
                                    <TableHead>Change Type</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pendingSettingRequests.length > 0 ? (
                                    pendingSettingRequests.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell>{format(new Date(req.requestDate), 'PPp')}</TableCell>
                                            <TableCell>{req.requestedByName}</TableCell>
                                            <TableCell><Badge variant="outline" className="capitalize">{req.type} Commissions</Badge></TableCell>
                                            <TableCell className="text-right">
                                                {processingId === req.id ? (
                                                    <LoaderCircle className="h-5 w-5 animate-spin ml-auto"/>
                                                ) : (
                                                    <div className="flex gap-2 justify-end">
                                                        <Button variant="outline" size="sm" onClick={() => setChangesToView(req)}><FileText className="mr-2 h-4 w-4"/> View Changes</Button>
                                                        <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleRejectSettings(req.id)}><X className="mr-2 h-4 w-4"/>Reject</Button>
                                                        <Button size="sm" className="bg-success hover:bg-success/90 text-success-foreground" onClick={() => handleApproveSettings(req.id)}><Check className="mr-2 h-4 w-4"/>Approve</Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No pending setting changes.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
               )}
           </Tabs>
        </CardContent>
      </Card>
      {slipToView && (
        <ViewSlipDialog
            isOpen={!!slipToView}
            onOpenChange={(open) => !open && setSlipToView(null)}
            slipUrl={slipToView}
        />
      )}
      {changesToView && (
         <ViewChangesDialog
            isOpen={!!changesToView}
            onOpenChange={(open) => !open && setChangesToView(null)}
            request={changesToView}
        />
      )}
    </>
  );
};

export default CommissionApprovalView;

    