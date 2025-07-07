
"use client";

import React from "react";
import { User, Customer as CustomerType } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UserPlus, LoaderCircle, Calendar as CalendarIcon, Phone } from "lucide-react";
import CustomerRegistrationDialog from "@/components/customer-registration-dialog";
import { Badge } from "@/components/ui/badge";
import { getCustomersForSalesman } from "@/lib/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "./ui/calendar";

interface MyCustomersViewProps {
  user: User;
}

const MyCustomersView: React.FC<MyCustomersViewProps> = ({ user }) => {
  const [myCustomers, setMyCustomers] = React.useState<CustomerType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  const fetchMyData = React.useCallback(async () => {
    setLoading(true);
    const customersData = await getCustomersForSalesman(user.id);
    setMyCustomers(customersData);
    setLoading(false);
  }, [user.id]);
  
  React.useEffect(() => {
    fetchMyData();
  }, [fetchMyData]);

  const filteredCustomers = React.useMemo(() => {
    if (!dateRange || !dateRange.from) {
      return myCustomers;
    }
    const from = dateRange.from;
    const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
    to.setHours(23, 59, 59, 999);

    return myCustomers.filter(customer => {
      const saleDate = new Date(customer.saleDate);
      return saleDate >= from && saleDate <= to;
    });
  }, [myCustomers, dateRange]);


  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <CardTitle>My Customer Registrations</CardTitle>
                <CardDescription>A list of customers you have registered.</CardDescription>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 w-full md:w-auto">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                        dateRange.to ? (
                            <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(dateRange.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Filter by registration date</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                    />
                    <div className="p-2 border-t">
                        <Button variant="ghost" className="w-full justify-center" onClick={() => setDateRange(undefined)}>Clear</Button>
                    </div>
                    </PopoverContent>
                </Popover>
                <Button onClick={() => setIsDialogOpen(true)} className="w-full md:w-auto">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Register New Customer
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            {/* Desktop Table View */}
            <div className="hidden rounded-md border md:block">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Token Serial</TableHead>
                    <TableHead>Sale Date</TableHead>
                    <TableHead>Token Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.contactInfo}</TableCell>
                        <TableCell>
                            <Badge variant="outline">{customer.tokenSerial}</Badge>
                        </TableCell>
                        <TableCell>{new Date(customer.saleDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                            <Badge variant={customer.tokenIsAvailable ? 'success' : 'destructive'}>
                                {customer.tokenIsAvailable ? 'Available' : 'Used'}
                            </Badge>
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                        No customers found for the selected period.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="grid gap-4 md:hidden">
                {filteredCustomers.length > 0 ? (
                    filteredCustomers.map((customer) => (
                        <Card key={customer.id} className="p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-card-foreground">{customer.name}</p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3"/>{customer.contactInfo}</p>
                                </div>
                                 <Badge variant={customer.tokenIsAvailable ? 'success' : 'destructive'}>
                                    {customer.tokenIsAvailable ? 'Available' : 'Used'}
                                </Badge>
                            </div>
                            <div className="border-t pt-3 flex justify-between items-center text-sm text-muted-foreground">
                                <Badge variant="outline" className="font-mono text-xs">{customer.tokenSerial}</Badge>
                                <div className="flex items-center gap-1.5"><CalendarIcon className="w-3 h-3"/>{new Date(customer.saleDate).toLocaleDateString()}</div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        No customers found for the selected period.
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
      <CustomerRegistrationDialog 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        salesman={user}
        onRegistrationSuccess={fetchMyData} 
      />
    </>
  );
};

export default MyCustomersView;
