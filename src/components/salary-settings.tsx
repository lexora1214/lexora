

"use client";

import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { processMonthlySalaries, getSalarySettings, updateSalarySettings, getSalaryPayouts, reverseSalaryPayout, getPendingSalaryChangeRequests } from "@/lib/firestore";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, AlertTriangle, History, Undo2, UserCog, CheckCircle2, ShieldQuestion } from "lucide-react";
import { SalarySettings, User, MonthlySalaryPayout, Customer, SalaryChangeRequest } from "@/types";
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
import { Alert, AlertTitle, AlertDescription as AlertDescriptionUI } from "./ui/alert"; // Renamed to avoid conflict

const SALARY_ROLES: (keyof SalarySettings)[] = [
  "BUSINESS PROMOTER (stage 01)",
  "MARKETING EXECUTIVE (stage 02)",
  "Team Operation Manager",
  "Group Operation Manager",
  "Head Group Manager",
  "Regional Director",
];

interface SalarySettingsProps {
    user: User;
    allCustomers: Customer[];
}

const SalarySettingsForm: React.FC<SalarySettingsProps> = ({ user, allCustomers }) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isPaying, setIsPaying] = useState(false);
    const [isReversing, setIsReversing] = useState<string | null>(null);
    const [payouts, setPayouts] = useState<MonthlySalaryPayout[]>([]);
    const [pendingRequest, setPendingRequest] = useState<SalaryChangeRequest | null>(null);
    const [selectedPayout, setSelectedPayout] = useState<MonthlySalaryPayout | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const currentMonthYear = format(new Date(), "MMMM yyyy");

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<SalarySettings>();

    const fetchInitialData = React.useCallback(async () => {
        setIsFetching(true);
        try {
            const [settings, payoutsData, pendingReqs] = await Promise.all([
                getSalarySettings(),
                getSalaryPayouts(),
                getPendingSalaryChangeRequests(),
            ]);
            reset(settings);
            setPayouts(payoutsData);
            setPendingRequest(pendingReqs.length > 0 ? pendingReqs[0] : null);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error fetching data",
                description: "Could not load salary settings or payout history.",
            });
        } finally {
            setIsFetching(false);
        }
    }, [reset, toast]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);
    
    const onSettingsSubmit: SubmitHandler<SalarySettings> = async (data) => {
        setIsLoading(true);
        try {
            await updateSalarySettings(data, user);
            if (user.role === 'Super Admin' || user.role === 'HR') {
                toast({
                    title: "Settings Updated",
                    description: "Salary values have been saved successfully.",
                    variant: 'default',
                    className: 'bg-success text-success-foreground'
                });
            } else {
                 toast({
                    title: "Request Submitted",
                    description: "Your change request has been sent to HR for approval.",
                    variant: 'default',
                });
                await fetchInitialData(); // Refresh to show pending request
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Update Failed", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePaySalaries = async () => {
        setIsPaying(true);
        try {
            const { usersPaid, totalAmount } = await processMonthlySalaries(user, allCustomers);
            toast({
                title: "Salaries Processed!",
                description: `Successfully paid ${usersPaid} employees a total of LKR ${totalAmount.toLocaleString()}.`,
                variant: 'default',
                className: 'bg-success text-success-foreground'
            });
            await fetchInitialData(); // Refresh history
        } catch (error: any) {
             toast({ variant: "destructive", title: "Payment Failed", description: error.message });
        } finally {
            setIsPaying(false);
        }
    };

    const handleReversePayout = async (payoutId: string) => {
        setIsReversing(payoutId);
        try {
            await reverseSalaryPayout(payoutId, user);
            toast({
                title: "Payout Reversed",
                description: "The selected salary payout has been successfully undone.",
                variant: "default",
                className: "bg-success text-success-foreground",
            });
            await fetchInitialData(); // Refresh history
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


    if (isFetching) {
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
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Base Salary Settings</CardTitle>
                        <CardDescription>Define the monthly base salary for each role. This does not include commissions.</CardDescription>
                    </CardHeader>
                     {pendingRequest && (
                        <CardContent className="pt-0">
                            <Alert>
                                <ShieldQuestion className="h-4 w-4" />
                                <AlertTitle>Pending Approval</AlertTitle>
                                <AlertDescriptionUI>
                                   A salary change request is currently pending approval by HR. You cannot make new changes until it is processed. Requested by {pendingRequest.requestedByName} on {format(new Date(pendingRequest.requestDate), 'PPP')}.
                                </AlertDescriptionUI>
                            </Alert>
                        </CardContent>
                    )}
                    <form onSubmit={handleSubmit(onSettingsSubmit)}>
                        <CardContent className="grid gap-6 pt-6">
                            {SALARY_ROLES.map(role => (
                                <div key={role} className="grid gap-3">
                                    <Label htmlFor={role}>{role}</Label>
                                    <Input id={role} type="number" {...register(role, { valueAsNumber: true })} disabled={!!pendingRequest} />
                                </div>
                            ))}
                        </CardContent>
                        <CardFooter className="border-t px-6 py-4">
                            <Button type="submit" disabled={isLoading || !!pendingRequest}>
                                {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                {['Super Admin', 'HR'].includes(user.role) ? 'Save Salary Settings' : 'Request Changes'}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Monthly Salary Payout</CardTitle>
                        <CardDescription>Process the salary payment for all eligible employees for the current month of {currentMonthYear}.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="p-4 rounded-md border border-warning/50 bg-warning/10 text-warning-foreground">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0 text-warning" />
                                <div>
                                    <h3 className="font-semibold">Warning: Handle with Care</h3>
                                    <p className="text-sm">This action can be performed multiple times. Each time you click this button, it will add the defined salary amount to each eligible employee's income. Please ensure you are not making duplicate payments for the same month.</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={isPaying}>
                                    {isPaying ? (
                                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                    )}
                                    Process Salaries for {currentMonthYear}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        You are about to pay salaries for **{currentMonthYear}**. This action is irreversible. The system will add the defined salary and any earned incentives to each eligible employee's total income.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        disabled={isPaying}
                                        onClick={handlePaySalaries}
                                        className={cn(buttonVariants({ variant: "destructive" }))}
                                    >
                                        {isPaying && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                        Yes, pay salaries now
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </Card>

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
            </div>
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

export default SalarySettingsForm;

    