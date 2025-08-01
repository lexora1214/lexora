
"use client";

import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getCommissionSettings, updateCommissionSettings, resetAllIncomes } from "@/lib/firestore";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, AlertTriangle } from "lucide-react";
import { CommissionSettings } from "@/types";
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

const formSchema = z.object({
  tokenPrice: z.coerce.number().min(0, "Price must be a positive number."),
  salesman: z.coerce.number().min(0, "Commission must be a positive number."),
  teamOperationManager: z.coerce.number().min(0, "Commission must be a positive number."),
  groupOperationManager: z.coerce.number().min(0, "Commission must be a positive number."),
  headGroupManager: z.coerce.number().min(0, "Commission must be a positive number."),
  regionalDirector: z.coerce.number().min(0, "Commission must be a positive number."),
  admin: z.coerce.number().min(0, "Commission must be a positive number."),
});

type FormValues = z.infer<typeof formSchema>;

const CommissionSettingsForm: React.FC = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [isResetting, setIsResetting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    useEffect(() => {
        const fetchSettings = async () => {
            setIsFetching(true);
            try {
                const settings = await getCommissionSettings();
                if (settings) {
                    reset(settings);
                }
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Error fetching settings",
                    description: "Could not load commission settings.",
                });
            } finally {
                setIsFetching(false);
            }
        };
        fetchSettings();
    }, [reset, toast]);
    
    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        setIsLoading(true);
        try {
            await updateCommissionSettings(data);
            toast({
                title: "Settings Updated",
                description: "Commission values have been saved successfully.",
                variant: 'default',
                className: 'bg-success text-success-foreground'
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: error.message,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = async () => {
        setIsResetting(true);
        try {
            await resetAllIncomes();
            toast({
                title: "Income Records Cleared",
                description: "All income history and user totals have been reset to zero.",
                variant: 'default',
                className: 'bg-success text-success-foreground'
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Reset Failed",
                description: "There was an error resetting the data. Please try again.",
            });
        } finally {
            setIsResetting(false);
        }
    };

    if (isFetching) {
        return (
            <div className="flex items-center justify-center p-8">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="grid gap-6 pt-6">
                 <div className="grid gap-3">
                    <Label htmlFor="tokenPrice">Token Price (LKR)</Label>
                    <Input id="tokenPrice" type="number" {...register("tokenPrice")} />
                    {errors.tokenPrice && <p className="text-xs text-destructive mt-1">{errors.tokenPrice.message}</p>}
                </div>
                 <div className="grid gap-3">
                    <Label htmlFor="salesman">Salesman Commission</Label>
                    <Input id="salesman" type="number" {...register("salesman")} />
                    {errors.salesman && <p className="text-xs text-destructive mt-1">{errors.salesman.message}</p>}
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="teamOperationManager">Team Operation Manager Commission</Label>
                    <Input id="teamOperationManager" type="number" {...register("teamOperationManager")} />
                    {errors.teamOperationManager && <p className="text-xs text-destructive mt-1">{errors.teamOperationManager.message}</p>}
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="groupOperationManager">Group Operation Manager Commission</Label>
                    <Input id="groupOperationManager" type="number" {...register("groupOperationManager")} />
                    {errors.groupOperationManager && <p className="text-xs text-destructive mt-1">{errors.groupOperationManager.message}</p>}
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="headGroupManager">Head Group Manager Commission</Label>
                    <Input id="headGroupManager" type="number" {...register("headGroupManager")} />
                    {errors.headGroupManager && <p className="text-xs text-destructive mt-1">{errors.headGroupManager.message}</p>}
                </div>
                 <div className="grid gap-3">
                    <Label htmlFor="regionalDirector">Regional Director Commission</Label>
                    <Input id="regionalDirector" type="number" {...register("regionalDirector")} />
                    {errors.regionalDirector && <p className="text-xs text-destructive mt-1">{errors.regionalDirector.message}</p>}
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="admin">Admin Team Commission</Label>
                    <Input id="admin" type="number" {...register("admin")} />
                    {errors.admin && <p className="text-xs text-destructive mt-1">{errors.admin.message}</p>}
                </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 justify-between items-center">
                 <Button type="submit" disabled={isLoading}>
                    {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                </Button>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" type="button" disabled={isResetting}>
                             {isResetting ? (
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <AlertTriangle className="mr-2 h-4 w-4" />
                            )}
                            Reset All Income
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete all income records and reset every user's total income to LKR 0.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                disabled={isResetting}
                                onClick={handleReset}
                                className={cn(buttonVariants({ variant: "destructive" }))}
                            >
                                {isResetting && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                                Yes, reset data
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
        </form>
    );
};

export default CommissionSettingsForm;
