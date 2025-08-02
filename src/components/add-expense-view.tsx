
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
import { LoaderCircle, UserPlus, MinusCircle, Check, ChevronsUpDown } from "lucide-react";
import { User } from "@/types";
import { addExpenseForSalesman, getAllUsers } from "@/lib/firestore";
import { getDownlineIdsAndUsers } from "@/lib/hierarchy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  salesmanId: z.string().min(1, "You must select a salesman."),
  amount: z.coerce.number().min(1, "Expense amount must be greater than 0."),
  description: z.string().min(3, "Please provide a brief description for the expense."),
});

type FormValues = z.infer<typeof formSchema>;

interface AddExpenseViewProps {
  manager: User;
  allUsers: User[];
}

export default function AddExpenseView({ manager, allUsers }: AddExpenseViewProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSalesmanPopoverOpen, setIsSalesmanPopoverOpen] = useState(false);

  const downlineSalesmen = useMemo(() => {
    if (manager.role === 'Branch Admin') {
      const branchUsers = allUsers.filter(u => u.branch === manager.branch && u.role === 'Salesman');
      return branchUsers;
    }
    const { users } = getDownlineIdsAndUsers(manager.id, allUsers);
    return users.filter(u => u.role === 'Salesman');
  }, [manager, allUsers]);

  const {
    register,
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
      await addExpenseForSalesman(data.salesmanId, data.amount, data.description, manager);
      toast({
        title: "Expense Added",
        description: `An expense of LKR ${data.amount.toLocaleString()} has been recorded.`,
        variant: "default",
        className: "bg-success text-success-foreground",
      });
      reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to Add Expense",
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
          <MinusCircle />
          Add Expense for Salesman
        </CardTitle>
        <CardDescription>Select a salesman from your team and enter the expense details. This amount will be deducted from their total income.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="salesmanId">Salesman</Label>
              <Controller
                control={control}
                name="salesmanId"
                render={({ field }) => (
                  <Popover open={isSalesmanPopoverOpen} onOpenChange={setIsSalesmanPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isSalesmanPopoverOpen}
                        className="w-full justify-between"
                      >
                        {field.value
                          ? downlineSalesmen.find((s) => s.id === field.value)?.name
                          : "Select salesman..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search salesman..." />
                        <CommandList>
                            <CommandEmpty>No salesmen found.</CommandEmpty>
                            <CommandGroup>
                            {downlineSalesmen.map((salesman) => (
                                <CommandItem
                                key={salesman.id}
                                value={salesman.name}
                                onSelect={() => {
                                    field.onChange(salesman.id);
                                    setIsSalesmanPopoverOpen(false);
                                }}
                                >
                                <Check
                                    className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === salesman.id ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                {salesman.name}
                                </CommandItem>
                            ))}
                            </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.salesmanId && <p className="text-xs text-destructive mt-1">{errors.salesmanId.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (LKR)</Label>
              <Input id="amount" type="number" placeholder="e.g., 500" {...register('amount')} />
              {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" placeholder="e.g., Fuel allowance" {...register('description')} />
              {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
            </div>
            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
              {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Add Expense
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
