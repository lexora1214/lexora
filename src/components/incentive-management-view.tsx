

"use client";

import React, { useEffect, useState } from "react";
import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getIncentiveSettings, updateIncentiveSettings, getPendingIncentiveChangeRequests } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, ShieldQuestion, PlusCircle, Trash2 } from "lucide-react";
import { IncentiveSettings, Role, SalesmanStage, User, IncentiveChangeRequest } from "@/types";
import { Alert, AlertDescription as AlertDescriptionUI, AlertTitle } from "./ui/alert";
import { format } from "date-fns";
import { getAuth } from "firebase/auth";

const incentiveTierSchema = z.object({
  target: z.coerce.number().min(0, "Target must be a positive number."),
  incentive: z.coerce.number().min(0, "Incentive must be a positive number."),
});

const formSchema = z.object({
    "BUSINESS PROMOTER (stage 01)": z.array(incentiveTierSchema).optional(),
    "MARKETING EXECUTIVE (stage 02)": z.array(incentiveTierSchema).optional(),
    "Team Operation Manager": z.array(incentiveTierSchema).optional(),
    "Group Operation Manager": z.array(incentiveTierSchema).optional(),
    "Head Group Manager": z.array(incentiveTierSchema).optional(),
    "Regional Director": z.array(incentiveTierSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

const INCENTIVE_ROLES: (Role | SalesmanStage)[] = [
    "BUSINESS PROMOTER (stage 01)",
    "MARKETING EXECUTIVE (stage 02)",
    "Team Operation Manager",
    "Group Operation Manager",
    "Head Group Manager",
    "Regional Director",
];

const RoleIncentiveForm: React.FC<{
  roleName: Role | SalesmanStage;
  control: any;
  register: any;
  errors: any;
  disabled: boolean;
}> = ({ roleName, control, register, errors, disabled }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: roleName,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{roleName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 border p-4 rounded-md relative">
             <div className="md:col-span-1">
              <Label htmlFor={`${roleName}.${index}.target`}>Target (Tokens)</Label>
              <Input id={`${roleName}.${index}.target`} type="number" {...register(`${roleName}.${index}.target`)} disabled={disabled} />
            </div>
             <div className="md:col-span-1">
              <Label htmlFor={`${roleName}.${index}.incentive`}>Incentive (LKR)</Label>
              <Input id={`${roleName}.${index}.incentive`} type="number" {...register(`${roleName}.${index}.incentive`)} disabled={disabled} />
            </div>
             <div className="md:col-span-1 flex items-end">
                <Button type="button" variant="destructive" onClick={() => remove(index)} disabled={disabled}>
                  <Trash2 className="mr-2 h-4 w-4" /> Remove Tier
                </Button>
            </div>
          </div>
        ))}
         <Button
            type="button"
            variant="outline"
            onClick={() => append({ target: 0, incentive: 0 })}
            disabled={disabled}
        >
            <PlusCircle className="mr-2 h-4 w-4" /> Add Target for {roleName}
        </Button>
      </CardContent>
    </Card>
  );
};


const IncentiveManagementView: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [pendingRequest, setPendingRequest] = useState<IncentiveChangeRequest | null>(null);

  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);


  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });
  
  const fetchInitialData = React.useCallback(async () => {
    if (!currentUser) return;
    setIsFetching(true);
    try {
        const [settings, pendingReqs] = await Promise.all([
            getIncentiveSettings(),
            getPendingIncentiveChangeRequests(),
        ]);
        reset(settings);
        setPendingRequest(pendingReqs.length > 0 ? pendingReqs[0] : null);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Error fetching data",
            description: "Could not load incentive settings.",
        });
    } finally {
        setIsFetching(false);
    }
  }, [reset, toast, currentUser]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!currentUser) {
        toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
        return;
    }
    
    // Ensure tiers for each role are sorted by target
    const sortedData = { ...data };
    for (const role of INCENTIVE_ROLES) {
        if (sortedData[role]) {
            sortedData[role]?.sort((a, b) => a.target - b.target);
        }
    }
    
    setIsLoading(true);
    try {
      await updateIncentiveSettings(sortedData as IncentiveSettings, {
          id: currentUser.uid,
          name: currentUser.displayName || "Admin",
          role: "Admin" // This part might need to be fetched from your own user profile store
      });

      toast({
          title: "Update Submitted",
          description: "Your changes have been processed successfully.",
          variant: "default",
          className: "bg-success text-success-foreground",
      });
      fetchInitialData(); // Refresh data after submission
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
  
  const isSuperAdmin = loggedInUser?.role === 'Super Admin';


  return (
    <div className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
             <Card>
                <CardHeader>
                <CardTitle>Incentive Management</CardTitle>
                <CardDescription>
                    Set tiered monthly token sale targets and incentive amounts for each role.
                    For managers, the target is based on their entire team's sales. Changes made by admins require HR approval.
                </CardDescription>
                </CardHeader>
                 {pendingRequest && !isSuperAdmin && (
                    <CardContent className="pt-0">
                        <Alert>
                            <ShieldQuestion className="h-4 w-4" />
                            <AlertTitle>Pending Approval</AlertTitle>
                            <AlertDescriptionUI>
                                An incentive change request is currently pending approval by HR. You cannot make new changes until it is processed. Requested by {pendingRequest.requestedByName} on {format(new Date(pendingRequest.requestDate), 'PPP')}.
                            </AlertDescriptionUI>
                        </Alert>
                    </CardContent>
                )}
            </Card>

            {INCENTIVE_ROLES.map(role => (
              <RoleIncentiveForm
                key={role}
                roleName={role}
                control={control}
                register={register}
                errors={errors}
                disabled={!!pendingRequest && !isSuperAdmin}
              />
            ))}
        
            <Card>
                <CardFooter className="p-6 justify-end">
                    <Button type="submit" disabled={isLoading || (!!pendingRequest && !isSuperAdmin)}>
                        {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        {isSuperAdmin ? "Save Changes" : "Request Changes"}
                    </Button>
                </CardFooter>
            </Card>
        </form>
    </div>
  );
};

export default IncentiveManagementView;
