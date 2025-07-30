
"use client";

import React, { useEffect, useState } from "react";
import { User, MonthlySalaryPayout } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, History, Undo2, UserCog } from "lucide-react";
import { getSalaryPayouts, reverseSalaryPayout } from "@/lib/firestore";
import { getAuth } from "firebase/auth";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "./ui/badge";
import PayoutDetailsDialog from "./payout-details-dialog";

const PayoutHistoryView: React.FC = () => {
    const [payouts, setPayouts] = useState<MonthlySalaryPayout[]>([]);
    const [loading, setLoading] = useState(true);
    const [isReversing, setIsReversing] = useState<string | null>(null);
    const [selectedPayout, setSelectedPayout] = useState<MonthlySalaryPayout | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const { toast } = useToast();
    const auth = getAuth();
    const user = auth.currentUser;

    const fetchPayouts = React.useCallback(async () => {
        setLoading(true);
        try {
            const payoutsData = await getSalaryPayouts();
            setPayouts(payoutsData);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error fetching data",
                description: "Could not load payout history.",
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchPayouts();
    }, [fetchPayouts]);

    const handleReversePayout = async (payoutId: string) => {
        if (!user) {
            toast({ variant: "destructive", title: "Error", description: "You must be logged in to perform this action." });
            return;
        }

        const currentUserDetails = { id: user.uid, name: user.displayName || "HR User", role: "HR" } as User;

        setIsReversing(payoutId);
        try {
            await reverseSalaryPayout(payoutId, currentUserDetails);
            toast({
                title: "Payout Reversed",
                description: "The selected salary payout has been successfully undone.",
                variant: "default",
                className: "bg-success text-success-foreground",
            });
            await fetchPayouts(); // Refresh history
        } catch (error: any) {
            toast({ variant: "destructive", title: "Reversal Failed", description: error.message });
        } finally {
            setIsReversing(null);
        }
    }

    const handleViewDetails = (payout: MonthlySalaryPayout) => {
        setSelectedPayout(payout);
        setIsDetailsOpen(true);
    }
    
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
                    <CardTitle className="flex items-center gap-2"><History /> Payout History</CardTitle>
                    <CardDescription>A log of all salary payouts. You can reverse a payout if it was made in error.</CardDescription>
                </CardHeader>
                <CardContent>
                <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Payout Details</TableHead>
                                    <TableHead>Users Paid</TableHead>
                                    <TableHead className="text-right">Total Amount</TableHead>
                                    <TableHead className="text-center">Status / Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payouts.length > 0 ? (
                                    payouts.map(payout => (
                                        <TableRow 
                                            key={payout.id} 
                                            className={cn(payout.isReversed && "bg-muted/50 text-muted-foreground", "cursor-pointer")}
                                            onClick={() => handleViewDetails(payout)}
                                        >
                                            <TableCell>
                                                <div className="font-medium">{format(new Date(payout.payoutDate), "PPP p")}</div>
                                                <div className="text-xs flex items-center gap-1.5 mt-1">
                                                    <UserCog className="h-3 w-3" /> Processed by: {payout.processedByName}
                                                </div>
                                            </TableCell>
                                            <TableCell>{payout.totalUsersPaid}</TableCell>
                                            <TableCell className="text-right font-mono">LKR {payout.totalAmountPaid.toLocaleString()}</TableCell>
                                            <TableCell className="text-center">
                                                {payout.isReversed ? (
                                                    <div className="flex flex-col items-center justify-center gap-1 text-xs">
                                                        <Badge variant="destructive">Reversed</Badge>
                                                        <span className="flex items-center gap-1.5"><UserCog className="h-3 w-3"/>{payout.reversedByName}</span>
                                                        <span>on {format(new Date(payout.reversalDate!), "PPP")}</span>
                                                    </div>
                                                ) : (
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                disabled={!!isReversing}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {isReversing === payout.id ? (
                                                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Undo2 className="mr-2 h-4 w-4" />
                                                                )}
                                                                Reverse
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Reverse this payout?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This will permanently delete this payout record and subtract the salary amounts from all respective employees' income. This action cannot be undone.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction
                                                                    disabled={!!isReversing}
                                                                    onClick={() => handleReversePayout(payout.id)}
                                                                    className={cn(buttonVariants({ variant: "destructive" }))}
                                                                >
                                                                    {isReversing === payout.id && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                                                    Yes, reverse payout
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No payout history found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                </div>
                </CardContent>
            </Card>
             {selectedPayout && (
                 <PayoutDetailsDialog 
                    isOpen={isDetailsOpen}
                    onOpenChange={setIsDetailsOpen}
                    payout={selectedPayout}
                />
            )}
        </>
    );
};

export default PayoutHistoryView;
