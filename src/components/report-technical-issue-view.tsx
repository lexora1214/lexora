
"use client";

import React, { useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Customer, TechnicalIssue } from '@/types';
import { createTechnicalIssue } from '@/lib/firestore';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
  } from '@/components/ui/command';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoaderCircle, Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';

const formSchema = z.object({
    customerId: z.string().min(1, "You must select a customer."),
    technicalOfficerId: z.string().min(1, "You must select a technical officer."),
    requestType: z.enum(['Normal', 'Red Zone'], { required_error: "Request type is required."}),
    description: z.string().min(10, "Please provide a detailed description (min. 10 characters)."),
});

type FormValues = z.infer<typeof formSchema>;

interface ReportTechnicalIssueViewProps {
  operator: User;
  allUsers: User[];
  allCustomers: Customer[];
}

const ReportTechnicalIssueView: React.FC<ReportTechnicalIssueViewProps> = ({ operator, allUsers, allCustomers }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);

  const {
    handleSubmit,
    control,
    reset,
    register,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        requestType: 'Normal',
        description: '',
    }
  });
  
  const technicalOfficers = useMemo(() => {
    return allUsers.filter(u => u.role === 'Technical Officer' && !u.isDisabled);
  }, [allUsers]);

  const customers = useMemo(() => {
    return allCustomers.sort((a,b) => a.name.localeCompare(b.name));
  }, [allCustomers]);

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
        const customer = customers.find(c => c.id === data.customerId);
        const technicalOfficer = technicalOfficers.find(o => o.id === data.technicalOfficerId);

        if (!customer || !technicalOfficer) {
            throw new Error("Selected customer or officer not found.");
        }

        const issueData: Omit<TechnicalIssue, 'id' | 'createdAt' | 'status'> = {
            callCentreOperatorId: operator.id,
            callCentreOperatorName: operator.name,
            technicalOfficerId: technicalOfficer.id,
            technicalOfficerName: technicalOfficer.name,
            customerId: customer.id,
            customerName: customer.name,
            customerContact: customer.contactInfo,
            requestType: data.requestType,
            description: data.description,
        };
        
        await createTechnicalIssue(issueData);

        toast({
            title: "Issue Reported",
            description: `The issue for ${customer.name} has been assigned to ${technicalOfficer.name}.`,
            className: "bg-success text-success-foreground",
        });
        reset();
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Failed to Report Issue",
            description: error.message,
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Report a New Technical Issue</CardTitle>
        <CardDescription>Select the customer and technical officer, then describe the issue.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-2">
            <Label>Customer</Label>
            <Controller
                control={control}
                name="customerId"
                render={({ field }) => (
                  <Popover open={isCustomerPopoverOpen} onOpenChange={setIsCustomerPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isCustomerPopoverOpen}
                        className="w-full justify-between"
                      >
                        {field.value
                          ? customers.find((c) => c.id === field.value)?.name
                          : "Search by name, NIC, or contact..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[375px] p-0">
                      <Command filter={(value, search) => {
                          const customer = customers.find(c => c.id === value);
                          if (!customer) return 0;
                          const keywords = `${customer.name} ${customer.nic} ${customer.contactInfo}`.toLowerCase();
                          return keywords.includes(search.toLowerCase()) ? 1 : 0;
                      }}>
                        <CommandInput placeholder="Search customer..." />
                        <CommandList>
                            <CommandEmpty>No customers found.</CommandEmpty>
                            <CommandGroup>
                            {customers.map((customer) => (
                                <CommandItem
                                key={customer.id}
                                value={customer.id}
                                onSelect={() => {
                                    field.onChange(customer.id);
                                    setIsCustomerPopoverOpen(false);
                                }}
                                >
                                <Check
                                    className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === customer.id ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                <div>
                                    <p>{customer.name}</p>
                                    <p className="text-xs text-muted-foreground">{customer.nic} - {customer.contactInfo}</p>
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
              {errors.customerId && <p className="text-xs text-destructive mt-1">{errors.customerId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="grid gap-2">
                <Label>Technical Officer</Label>
                <Controller
                    name="technicalOfficerId"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an officer..." />
                            </SelectTrigger>
                            <SelectContent>
                                {technicalOfficers.map(officer => (
                                    <SelectItem key={officer.id} value={officer.id}>{officer.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
                {errors.technicalOfficerId && <p className="text-xs text-destructive mt-1">{errors.technicalOfficerId.message}</p>}
             </div>
             <div className="grid gap-2">
                <Label>Request Type</Label>
                 <Controller
                    name="requestType"
                    control={control}
                    render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Normal">Normal</SelectItem>
                                <SelectItem value="Red Zone">Red Zone</SelectItem>
                            </SelectContent>
                        </Select>
                    )}
                />
             </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Issue Description</Label>
            <Textarea id="description" {...register('description')} rows={6} />
            {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Report Issue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReportTechnicalIssueView;
