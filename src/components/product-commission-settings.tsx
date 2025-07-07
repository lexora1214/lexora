"use client";

import React, { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getProductCommissionSettings, updateProductCommissionSettings } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, PlusCircle, Trash2 } from "lucide-react";
import { ProductCommissionSettings, ProductCommissionTier, ProductCommissionRole } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { cn } from "@/lib/utils";

const commissionValuesSchema = z.object({
  cash: z.coerce.number().min(0),
  installments: z.coerce.number().min(0),
});

const productCommissionRoleSchema = z.enum(["salesman", "teamOperationManager", "groupOperationManager", "headGroupManager", "regionalDirector", "admin"]);

const productCommissionTierSchema = z.object({
  id: z.string(),
  minPrice: z.coerce.number().min(0),
  maxPrice: z.coerce.number().min(0).nullable(),
  commissions: z.record(productCommissionRoleSchema, commissionValuesSchema),
});

const formSchema = z.object({
  tiers: z.array(productCommissionTierSchema),
});

const roleDisplayNames: Record<ProductCommissionRole, string> = {
    salesman: "Salesman",
    teamOperationManager: "Team Operation Manager",
    groupOperationManager: "Group Operation Manager",
    headGroupManager: "Head Group Manager",
    regionalDirector: "Regional Director",
    admin: "Admin Team",
};

const ProductCommissionSettingsForm: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<ProductCommissionSettings>({
    resolver: zodResolver(formSchema),
    defaultValues: { tiers: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "tiers",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsFetching(true);
      try {
        const settings = await getProductCommissionSettings();
        if (settings) {
          reset(settings);
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error fetching settings",
          description: "Could not load product commission settings.",
        });
      } finally {
        setIsFetching(false);
      }
    };
    fetchSettings();
  }, [reset, toast]);

  const onSubmit: SubmitHandler<ProductCommissionSettings> = async (data) => {
    setIsLoading(true);
    try {
        // Ensure maxPrice is null for the last tier if it's meant to be open-ended
        const finalTiers = data.tiers.map((tier, index) => {
            if (tier.maxPrice === 0 || tier.maxPrice === null) {
                return {...tier, maxPrice: null};
            }
            return tier;
        });

        await updateProductCommissionSettings({ tiers: finalTiers });
        toast({
            title: "Settings Updated",
            description: "Product commission settings have been saved successfully.",
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
      <div className="flex items-center justify-center p-8">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const commissionRoles = Object.keys(roleDisplayNames) as ProductCommissionRole[];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {fields.map((field, index) => (
        <Card key={field.id}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Price Tier {index + 1}</CardTitle>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <CardDescription>Define the commission structure for this price range.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label htmlFor={`tiers.${index}.minPrice`}>Min Price (LKR)</Label>
                <Input id={`tiers.${index}.minPrice`} type="number" {...register(`tiers.${index}.minPrice`)} />
                 {errors.tiers?.[index]?.minPrice && <p className="text-xs text-destructive mt-1">{errors.tiers?.[index]?.minPrice?.message}</p>}
              </div>
              <div>
                <Label htmlFor={`tiers.${index}.maxPrice`}>Max Price (LKR)</Label>
                <Input id={`tiers.${index}.maxPrice`} type="number" {...register(`tiers.${index}.maxPrice`)} placeholder="Leave blank or 0 for no upper limit" />
                {errors.tiers?.[index]?.maxPrice && <p className="text-xs text-destructive mt-1">{errors.tiers?.[index]?.maxPrice?.message}</p>}
              </div>
            </div>
            
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Cash Commission</TableHead>
                        <TableHead className="text-right">Installment Commission</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {commissionRoles.map((role) => (
                        <TableRow key={role}>
                            <TableCell className="font-medium">{roleDisplayNames[role]}</TableCell>
                            <TableCell>
                                <Input type="number" className="text-right" {...register(`tiers.${index}.commissions.${role}.cash`)} />
                            </TableCell>
                            <TableCell>
                                <Input type="number" className="text-right" {...register(`tiers.${index}.commissions.${role}.installments`)} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

       <Card>
            <CardFooter className="p-6 justify-between">
                <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => append({
                        id: `new-tier-${Date.now()}`,
                        minPrice: 0,
                        maxPrice: 0,
                        commissions: { salesman: { cash: 0, installments: 0 }, teamOperationManager: { cash: 0, installments: 0 }, groupOperationManager: { cash: 0, installments: 0 }, headGroupManager: { cash: 0, installments: 0 }, regionalDirector: { cash: 0, installments: 0 }, admin: { cash: 0, installments: 0 } }
                    })}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Tier
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    Save All Changes
                </Button>
            </CardFooter>
       </Card>
    </form>
  );
};

export default ProductCommissionSettingsForm;
