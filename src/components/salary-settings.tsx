

"use client";

import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { processMonthlySalaries, getSalarySettings, updateSalarySettings, getPendingSalaryChangeRequests, createSalaryPayoutRequest } from "@/lib/firestore";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, AlertTriangle, ShieldQuestion } from "lucide-react";
import { SalarySettings, User, Customer, SalaryChangeRequest } from "@/types";
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
    const [isRequesting, setIsRequesting] = useState(false);
    const [pendingRequest, setPendingRequest] = useState<SalaryChangeRequest | null>(null);
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
            const [settings, pendingReqs] = await Promise.all([
                getSalarySettings(),
                getPendingSalaryChangeRequests(),
            ]);
            reset(settings);
            setPendingRequest(pendingReqs.length > 0 ? pendingReqs[0] : null);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error fetching data",
                description: "Could not load salary settings.",
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
    
    const handleRequestPayout = async () => {
        setIsRequesting(true);
        try {
            const result = await createSalaryPayoutRequest(user, allCustomers);
            toast({
                title: "Payout Requested",
                description: `Request for ${result.totalUsersToPay} users (LKR ${result.totalAmountToPay.toLocaleString()}) sent for HR approval.`,
                variant: 'default',
                className: 'bg-success text-success-foreground'
            });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Request Failed", description: error.message });
        } finally {
            setIsRequesting(false);
        }
    };

    if (isFetching) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center p-8">
                    <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    const isHrUser = user.role === 'HR';
    const canManagePayouts = ['Super Admin'].includes(user.role);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Base Salary Settings</CardTitle>
                    <CardDescription>
                        {isHrUser
                            ? "A read-only view of the current monthly base salary for each role."
                            : "Define the monthly base salary for each role. This does not include commissions."
                        }
                    </CardDescription>
                </CardHeader>
                    {pendingRequest && !isHrUser && (
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
                                <Input id={role} type="number" {...register(role, { valueAsNumber: true })} disabled={!!pendingRequest || isHrUser} />
                            </div>
                        ))}
                    </CardContent>
                    {!isHrUser && (
                        <CardFooter className="border-t px-6 py-4">
                            <Button type="submit" disabled={isLoading || !!pendingRequest}>
                                {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                {['Super Admin'].includes(user.role) ? 'Save Salary Settings' : 'Request Changes'}
                            </Button>
                        </CardFooter>
                    )}
                </form>
            </Card>

            {canManagePayouts && (
                <Card>
                    <CardHeader>
                        <CardTitle>Monthly Salary Payout</CardTitle>
                        <CardDescription>Request a salary payment for all eligible employees for the current month of {currentMonthYear}.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="p-4 rounded-md border border-warning/50 bg-warning/10 text-warning-foreground">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0 text-warning" />
                                <div>
                                    <h3 className="font-semibold">Important</h3>
                                    <p className="text-sm">Clicking this button will generate a payout request for HR to approve. Salaries will only be paid out after HR confirms the request.</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={isRequesting}>
                                    {isRequesting ? (
                                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <AlertTriangle className="mr-2 h-4 w-4" />
                                    )}
                                    Request Payout for {currentMonthYear}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        You are about to submit a payout request for **{currentMonthYear}**. The system will calculate all salaries and incentives and send the request to HR for final approval.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        disabled={isRequesting}
                                        onClick={handleRequestPayout}
                                        className={cn(buttonVariants({ variant: "destructive" }))}
                                    >
                                        {isRequesting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                        Yes, submit request
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardFooter>
                </Card>
            )}
        </div>
    );
};

export default SalarySettingsForm;
