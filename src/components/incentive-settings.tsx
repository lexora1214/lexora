
"use client";

import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getSalesmanIncentiveSettings, updateSalesmanIncentiveSettings } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle } from "lucide-react";
import { SalesmanIncentiveSettings } from "@/types";

const incentiveSchema = z.object({
  target: z.coerce.number().min(0, "Target must be a positive number."),
  incentive: z.coerce.number().min(0, "Incentive must be a positive number."),
});

const formSchema = z.object({
  "BUSINESS PROMOTER (stage 01)": incentiveSchema,
  "MARKETING EXECUTIVE (stage 02)": incentiveSchema,
});

type FormValues = z.infer<typeof formSchema>;

const IncentiveSettings: React.FC = () => {
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
        const settings = await getSalesmanIncentiveSettings();
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
      await updateSalesmanIncentiveSettings(data);
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
          <CardTitle>Salesman Incentive Settings</CardTitle>
          <CardDescription>
            Set the monthly token sale targets and incentive amounts for each salesman stage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h3 className="text-lg font-medium mb-4">BUSINESS PROMOTER (stage 01)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
              <div>
                <Label htmlFor="bp-target">Monthly Token Sale Target</Label>
                <Input id="bp-target" type="number" {...register("BUSINESS PROMOTER (stage 01).target")} />
                {errors["BUSINESS PROMOTER (stage 01)"]?.target && <p className="text-xs text-destructive mt-1">{errors["BUSINESS PROMOTER (stage 01)"]?.target?.message}</p>}
              </div>
              <div>
                <Label htmlFor="bp-incentive">Incentive Amount (LKR)</Label>
                <Input id="bp-incentive" type="number" {...register("BUSINESS PROMOTER (stage 01).incentive")} />
                {errors["BUSINESS PROMOTER (stage 01)"]?.incentive && <p className="text-xs text-destructive mt-1">{errors["BUSINESS PROMOTER (stage 01)"]?.incentive?.message}</p>}
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-4">MARKETING EXECUTIVE (stage 02)</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md">
              <div>
                <Label htmlFor="me-target">Monthly Token Sale Target</Label>
                <Input id="me-target" type="number" {...register("MARKETING EXECUTIVE (stage 02).target")} />
                 {errors["MARKETING EXECUTIVE (stage 02)"]?.target && <p className="text-xs text-destructive mt-1">{errors["MARKETING EXECUTIVE (stage 02)"]?.target?.message}</p>}
              </div>
              <div>
                <Label htmlFor="me-incentive">Incentive Amount (LKR)</Label>
                <Input id="me-incentive" type="number" {...register("MARKETING EXECUTIVE (stage 02).incentive")} />
                {errors["MARKETING EXECUTIVE (stage 02)"]?.incentive && <p className="text-xs text-destructive mt-1">{errors["MARKETING EXECUTIVE (stage 02)"]?.incentive?.message}</p>}
              </div>
            </div>
          </div>
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

export default IncentiveSettings;
