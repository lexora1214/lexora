

"use client";

import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getCommissionSettings, updateCommissionSettings, resetAllIncomes, getPendingCommissionChangeRequests } from "@/lib/firestore";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, AlertTriangle, ShieldQuestion } from "lucide-react";
import { CommissionSettings, User } from "@/types";
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
import { getAuth } from "firebase/auth";
import { Alert, AlertDescription as AlertDescriptionUI, AlertTitle } from "./ui/alert";
import { format } from "date-fns";

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
    const [pendingRequest, setPendingRequest] = useState<any | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });
    
    useEffect(() => {
        const auth = getAuth();
        const user = auth.currentUser;
        if(user) {
            // In a real app, you'd fetch your detailed user profile
            setCurrentUser({ id: user.uid, name: user.displayName || 'Admin', role: 'Admin' } as User);
        }

        const fetchInitialData = async () => {
            setIsFetching(true);
            try {
                const [settings, pendingReqs] = await Promise.all([
                    getCommissionSettings(),
                    getPendingCommissionChangeRequests(),
                ]);
                reset(settings);
                const tokenChangeRequest = pendingReqs.find(req => req.type === 'token');
                setPendingRequest(tokenChangeRequest || null);
            } catch (error) {
                toast({ variant: "destructive", title: "Error fetching data", description: "Could not load settings." });
            } finally {
                setIsFetching(false);
            }
        };

        fetchInitialData();
    }, [reset, toast]);
    
    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        if (!currentUser) {
            toast({ variant: "destructive", title: "Authentication Error", description: "Could not identify the current user." });
            return;
        }

        setIsLoading(true);
        try {
            await updateCommissionSettings(data, currentUser);
            toast({
                title: "Update Submitted",
                description: "Your changes have been sent for Super Admin approval.",
                variant: 'default',
            });
            // Re-fetch to show pending alert
             const pendingReqs = await getPendingCommissionChangeRequests();
             const tokenChangeRequest = pendingReqs.find(req => req.type === 'token');
             setPendingRequest(tokenChangeRequest || null);

        } catch (error: any) {
            toast({ variant: "destructive", title: "Update Failed", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return (
            <div className="flex items-center justify-center p-8">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    const isSuperAdmin = currentUser?.role === 'Super Admin';

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            {pendingRequest && (
                <CardContent className="pt-6">
                     <Alert>
                        <ShieldQuestion className="h-4 w-4" />
                        <AlertTitle>Pending Approval</AlertTitle>
                        <AlertDescriptionUI>
                            A change request by {pendingRequest.requestedByName} on {format(new Date(pendingRequest.requestDate), 'PPP')} is awaiting Super Admin approval. You cannot make new changes until it is processed.
                        </AlertDescriptionUI>
                    </Alert>
                </CardContent>
            )}
            <CardContent className="grid gap-6 pt-6">
                 <div className="grid gap-3">
                    <Label htmlFor="tokenPrice">Token Price (LKR)</Label>
                    <Input id="tokenPrice" type="number" {...register("tokenPrice")} disabled={!!pendingRequest} />
                    {errors.tokenPrice && <p className="text-xs text-destructive mt-1">{errors.tokenPrice.message}</p>}
                </div>
                 <div className="grid gap-3">
                    <Label htmlFor="salesman">Salesman Commission</Label>
                    <Input id="salesman" type="number" {...register("salesman")} disabled={!!pendingRequest} />
                    {errors.salesman && <p className="text-xs text-destructive mt-1">{errors.salesman.message}</p>}
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="teamOperationManager">Team Operation Manager Commission</Label>
                    <Input id="teamOperationManager" type="number" {...register("teamOperationManager")} disabled={!!pendingRequest} />
                    {errors.teamOperationManager && <p className="text-xs text-destructive mt-1">{errors.teamOperationManager.message}</p>}
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="groupOperationManager">Group Operation Manager Commission</Label>
                    <Input id="groupOperationManager" type="number" {...register("groupOperationManager")} disabled={!!pendingRequest} />
                    {errors.groupOperationManager && <p className="text-xs text-destructive mt-1">{errors.groupOperationManager.message}</p>}
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="headGroupManager">Head Group Manager Commission</Label>
                    <Input id="headGroupManager" type="number" {...register("headGroupManager")} disabled={!!pendingRequest} />
                    {errors.headGroupManager && <p className="text-xs text-destructive mt-1">{errors.headGroupManager.message}</p>}
                </div>
                 <div className="grid gap-3">
                    <Label htmlFor="regionalDirector">Regional Director Commission</Label>
                    <Input id="regionalDirector" type="number" {...register("regionalDirector")} disabled={!!pendingRequest} />
                    {errors.regionalDirector && <p className="text-xs text-destructive mt-1">{errors.regionalDirector.message}</p>}
                </div>
                <div className="grid gap-3">
                    <Label htmlFor="admin">Admin Team Commission</Label>
                    <Input id="admin" type="number" {...register("admin")} disabled={!!pendingRequest} />
                    {errors.admin && <p className="text-xs text-destructive mt-1">{errors.admin.message}</p>}
                </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 justify-between items-center">
                 <Button type="submit" disabled={isLoading || !!pendingRequest}>
                    {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    {isSuperAdmin ? "Save Changes" : "Request Changes"}
                </Button>
            </CardFooter>
        </form>
    );
};

export default CommissionSettingsForm;
