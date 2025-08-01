
"use client";

import React, { useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, Check, ChevronsUpDown, Coins } from "lucide-react";
import { User } from "@/types";
import { createAdHocSalaryRequest } from "@/lib/firestore";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { cn } from "@/lib/utils";
import { Textarea } from "./ui/textarea";

const formSchema = z.object({
  targetUserId: z.string().min(1, "You must select an employee."),
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
  reason: z.string().min(10, "Please provide a reason for this payment (min. 10 characters)."),
});

type FormValues = z.infer<typeof formSchema>;

interface AddAdhocSalaryViewProps {
  hrUser: User;
  allUsers: User[];
}

export default function AddAdhocSalaryView({ hrUser, allUsers }: AddAdhocSalaryViewProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUserPopoverOpen, setIsUserPopoverOpen] = useState(false);

  const eligibleUsers = useMemo(() => {
    return allUsers.filter(u => u.role !== 'Super Admin');
  }, [allUsers]);

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const targetUser = eligibleUsers.find(u => u.id === data.targetUserId);
      if (!targetUser) {
        throw new Error("Selected user not found or is ineligible.");
      }

      await createAdHocSalaryRequest({
        ...data,
        targetUserName: targetUser.name,
        targetUserRole: targetUser.role,
        requesterId: hrUser.id,
        requesterName: hrUser.name,
      });

      toast({
        title: "Salary Request Submitted",
        description: `Your request to pay LKR ${data.amount.toLocaleString()} to ${targetUser.name} has been sent for Super Admin approval.`,
        className: "bg-success text-success-foreground",
      });
      reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Submit Request",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins />
          Add Ad-hoc Salary Payment
        </CardTitle>
        <CardDescription>Request a special, one-time salary payment for an employee. This will require Super Admin approval.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="targetUserId">Employee</Label>
              <Controller
                control={control}
                name="targetUserId"
                render={({ field }) => (
                  <Popover open={isUserPopoverOpen} onOpenChange={setIsUserPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isUserPopoverOpen}
                        className="w-full justify-between"
                      >
                        {field.value
                          ? eligibleUsers.find((s) => s.id === field.value)?.name
                          : "Select an employee..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search employees..." />
                        <CommandList>
                            <CommandEmpty>No employees found.</CommandEmpty>
                            <CommandGroup>
                            {eligibleUsers.map((user) => (
                                <CommandItem
                                key={user.id}
                                value={`${user.name} ${user.email}`}
                                onSelect={() => {
                                    field.onChange(user.id);
                                    setIsUserPopoverOpen(false);
                                }}
                                >
                                <Check
                                    className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === user.id ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                <div>
                                    <p>{user.name}</p>
                                    <p className="text-xs text-muted-foreground">{user.role}</p>
                                </div>
                                </CommandItem>
                            ))}
                            </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.targetUserId && <p className="text-xs text-destructive mt-1">{errors.targetUserId.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (LKR)</Label>
              <Input id="amount" type="number" placeholder="e.g., 10000" {...register('amount')} />
              {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason for Payment</Label>
              <Textarea id="reason" placeholder="e.g., Special bonus for outstanding performance..." {...register('reason')} />
              {errors.reason && <p className="text-xs text-destructive mt-1">{errors.reason.message}</p>}
            </div>
            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
              {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Submit for Approval
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
