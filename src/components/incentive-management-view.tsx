

"use client";

import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getIncentiveSettings, updateIncentiveSettings } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle } from "lucide-react";
import { IncentiveSettings, Role, SalesmanStage } from "@/types";

const incentiveSchema = z.object({
  target: z.coerce.number().min(0, "Target must be a positive number."),
  incentive: z.coerce.number().min(0, "Incentive must be a positive number."),
});

const formSchema = z.object({
    "BUSINESS PROMOTER (stage 01)": incentiveSchema.optional(),
    "MARKETING EXECUTIVE (stage 02)": incentiveSchema.optional(),
    "Team Operation Manager": incentiveSchema.optional(),
    "Group Operation Manager": incentiveSchema.optional(),
    "Head Group Manager": incentiveSchema.optional(),
    "Regional Director": incentiveSchema.optional(),
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

const IncentiveManagementView: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

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
        const settings = await getIncentiveSettings();
        if (settings) {
          reset(settings);
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error fetching settings",
          description: "Could not load incentive settings.",
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
      await updateIncentiveSettings(data as IncentiveSettings);
      toast({
        title: "Settings Updated",
        description: "Incentive settings have been saved successfully.",
        variant: "default",
        className: "bg-success text-success-foreground",
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
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Incentive Management</CardTitle>
          <CardDescription>
            Set the monthly token sale targets and incentive amounts for each role.
            For managers, the target is based on their entire team's sales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {INCENTIVE_ROLES.map(role => (
              <div key={role}>
                <h3 className="text-lg font-medium mb-4">{role}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
                  <div>
                    <Label htmlFor={`${role}-target`}>Monthly Token Sale Target</Label>
                    <Input id={`${role}-target`} type="number" {...register(`${role}.target`)} />
                    {errors[role as keyof FormValues]?.target && <p className="text-xs text-destructive mt-1">{errors[role as keyof FormValues]?.target?.message}</p>}
                  </div>
                  <div>
                    <Label htmlFor={`${role}-incentive`}>Incentive Amount (LKR)</Label>
                    <Input id={`${role}-incentive`} type="number" {...register(`${role}.incentive`)} />
                    {errors[role as keyof FormValues]?.incentive && <p className="text-xs text-destructive mt-1">{errors[role as keyof FormValues]?.incentive?.message}</p>}
                  </div>
                </div>
              </div>
          ))}
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Save Incentive Settings
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default IncentiveManagementView;
