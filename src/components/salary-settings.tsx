"use client";

import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { processMonthlySalaries, getSalarySettings, updateSalarySettings } from "@/lib/firestore";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, AlertTriangle, PartyPopper } from "lucide-react";
import { SalarySettings, User } from "@/types";
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

const SALARY_ROLES: (keyof SalarySettings)[] = [
  "BUSINESS PROMOTER (stage 01)",
  "MARKETING EXECUTIVE (stage 02)",
  "Team Operation Manager",
  "Group Operation Manager",
  "Head Group Manager",
];

interface SalarySettingsProps {
    user: User;
}

const SalarySettingsForm: React.FC<SalarySettingsProps> = ({ user }) => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isPaying, setIsPaying] = useState(false);
    const currentMonthYear = format(new Date(), "MMMM yyyy");

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<SalarySettings>();

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsFetching(true);
            try {
                const settings = await getSalarySettings();
                reset(settings);
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Error fetching data",
                    description: "Could not load salary settings.",
                });
            } finally {
                setIsFetching(false);
            }
        };
        fetchInitialData();
    }, [reset, toast]);
    
    const onSettingsSubmit: SubmitHandler<SalarySettings> = async (data) => {
        setIsLoading(true);
        try {
            await updateSalarySettings(data);
            toast({
                title: "Settings Updated",
                description: "Salary values have been saved successfully.",
                variant: 'default',
                className: 'bg-success text-success-foreground'
            });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Update Failed", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handlePaySalaries = async () => {
        setIsPaying(true);
        try {
            const { usersPaid, totalAmount } = await processMonthlySalaries(user);
            toast({
                title: "Salaries Processed!",
                description: `Successfully paid ${usersPaid} employees a total of LKR ${totalAmount.toLocaleString()}.`,
                variant: 'default',
                className: 'bg-success text-success-foreground'
            });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Payment Failed", description: error.message });
        } finally {
            setIsPaying(false);
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

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Base Salary Settings</CardTitle>
                    <CardDescription>Define the monthly base salary for each role. This does not include commissions.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit(onSettingsSubmit)}>
                    <CardContent className="grid gap-6 pt-6">
                        {SALARY_ROLES.map(role => (
                             <div key={role} className="grid gap-3">
                                <Label htmlFor={role}>{role}</Label>
                                <Input id={role} type="number" {...register(role, { valueAsNumber: true })} />
                            </div>
                        ))}
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4">
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Save Salary Settings
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
                                    You are about to pay salaries for **{currentMonthYear}**. This action is irreversible. The system will add the defined salary to each eligible employee's total income.
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
        </div>
    );
};

export default SalarySettingsForm;
