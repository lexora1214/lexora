
"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { getSignupRoleSettings, updateSignupRoleSettings } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle } from "lucide-react";
import { Role, SignupRoleSettings } from "@/types";
import { Switch } from "@/components/ui/switch";

const ALL_SIGNUP_ROLES: Role[] = ["Admin", "Regional Director", "Head Group Manager", "Group Operation Manager", "Team Operation Manager", "Branch Manager", "Salesman", "Delivery Boy", "Recovery Officer"];

const SignupRoleSettingsForm: React.FC = () => {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);

    const { control, handleSubmit, reset } = useForm<SignupRoleSettings>();

    useEffect(() => {
        const fetchSettings = async () => {
            setIsFetching(true);
            try {
                const settings = await getSignupRoleSettings();
                if (settings) {
                    reset(settings);
                }
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "Error fetching settings",
                    description: "Could not load signup role settings.",
                });
            } finally {
                setIsFetching(false);
            }
        };
        fetchSettings();
    }, [reset, toast]);

    const onSubmit: SubmitHandler<SignupRoleSettings> = async (data) => {
        setIsLoading(true);
        try {
            await updateSignupRoleSettings(data);
            toast({
                title: "Settings Updated",
                description: "Signup role visibility has been saved successfully.",
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
                                    />
                                )}
                            />
                        </div>
                    ))}
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};

export default SignupRoleSettingsForm;
