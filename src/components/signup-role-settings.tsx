
"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { getSignupRoleSettings, updateSignupRoleSettings, getPendingSignupRoleRequests, getLoggedInUser } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, ShieldQuestion } from "lucide-react";
import { Role, SignupRoleSettings, SignupRoleChangeRequest, User } from "@/types";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle, AlertDescription as AlertDescriptionUI } from "./ui/alert";
import { format } from "date-fns";

const ALL_SIGNUP_ROLES: Role[] = ["Admin", "Regional Director", "Head Group Manager", "Group Operation Manager", "Team Operation Manager", "Branch Admin", "Salesman", "Delivery Boy", "Recovery Officer", "Store Keeper"];

const SignupRoleSettingsForm: React.FC = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [pendingRequest, setPendingRequest] = useState<SignupRoleChangeRequest | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const { control, handleSubmit, reset } = useForm<SignupRoleSettings>();

    const fetchInitialData = React.useCallback(async () => {
        setIsFetching(true);
        try {
            const [settings, pendingReqs, user] = await Promise.all([
                getSignupRoleSettings(),
                getPendingSignupRoleRequests(),
                getLoggedInUser(),
            ]);

            setCurrentUser(user);

            if (settings) {
                reset(settings);
            }
            if (pendingReqs.length > 0) {
                setPendingRequest(pendingReqs[0]);
            } else {
                setPendingRequest(null);
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error fetching data",
                description: "Could not load signup role settings.",
            });
        } finally {
            setIsFetching(false);
        }
    }, [reset, toast]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const onSubmit: SubmitHandler<SignupRoleSettings> = async (data) => {
        if (!currentUser) {
            toast({ variant: "destructive", title: "Error", description: "Could not identify current user."});
            return;
        }
        setIsLoading(true);
        try {
            await updateSignupRoleSettings(data, currentUser);
            toast({
                title: currentUser.role === 'Super Admin' ? "Settings Updated" : "Request Submitted",
                description: currentUser.role === 'Super Admin' 
                    ? "Signup role visibility has been saved successfully."
                    : "Your change request has been sent for Super Admin approval.",
                variant: 'default',
                className: 'bg-success text-success-foreground'
            });
            await fetchInitialData();
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
    
    const canEdit = !pendingRequest || currentUser?.role === 'Super Admin';

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
        <Card>
            <CardHeader>
                <CardTitle>Signup Role Settings</CardTitle>
                <CardDescription>
                    Control which roles are available for selection on the public signup page.
                </CardDescription>
            </CardHeader>
            {pendingRequest && (
                <CardContent>
                    <Alert>
                        <ShieldQuestion className="h-4 w-4" />
                        <AlertTitle>Pending Approval</AlertTitle>
                        <AlertDescriptionUI>
                            A change request by {pendingRequest.requestedByName} on {format(new Date(pendingRequest.requestDate), 'PPP')} is awaiting Super Admin approval. You cannot make new changes until it is processed.
                        </AlertDescriptionUI>
                    </Alert>
                </CardContent>
            )}
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="grid gap-4">
                    {ALL_SIGNUP_ROLES.map(role => (
                        <div key={role} className="flex items-center justify-between rounded-lg border p-4">
                            <Label htmlFor={`role-${role}`} className="font-medium">
                                {role}
                            </Label>
                            <Controller
                                name={`visibleRoles.${role}`}
                                control={control}
                                render={({ field }) => (
                                    <Switch
                                        id={`role-${role}`}
                                        checked={field.value ?? false}
                                        onCheckedChange={field.onChange}
                                        disabled={!canEdit}
                                    />
                                )}
                            />
                        </div>
                    ))}
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button type="submit" disabled={isLoading || !canEdit}>
                        {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        {currentUser?.role === 'Super Admin' ? 'Save Changes' : 'Request Changes'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};

export default SignupRoleSettingsForm;
