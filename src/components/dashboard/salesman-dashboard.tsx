
"use client";

import React from "react";
import { User, Customer as CustomerType, IncomeRecord } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { DollarSign, Users, UserPlus, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomerRegistrationDialog from "@/components/customer-registration-dialog";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SalesmanDashboardProps {
  user: User;
  allCustomers: CustomerType[];
  allIncomeRecords: IncomeRecord[];
}

const SalesmanDashboard: React.FC<SalesmanDashboardProps> = ({ user, allCustomers, allIncomeRecords }) => {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  const filteredData = React.useMemo(() => {
    const myCustomers = allCustomers.filter(c => c.salesmanId === user.id);
    const myIncomeRecords = allIncomeRecords.filter(r => r.userId === user.id);

    if (!dateRange || !dateRange.from) {
      return { filteredCustomers: myCustomers, filteredIncomeRecords: myIncomeRecords };
    }
    const from = dateRange.from;
    const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
    to.setHours(23, 59, 59, 999);

    const filteredCustomers = myCustomers.filter(c => {
        const saleDate = new Date(c.saleDate);
        return saleDate >= from && saleDate <= to;
    });
    
    const filteredIncomeRecords = myIncomeRecords.filter(r => {
        const saleDate = new Date(r.saleDate);
        return saleDate >= from && saleDate <= to;
    });

    return { filteredCustomers, filteredIncomeRecords };

  }, [user.id, allCustomers, allIncomeRecords, dateRange]);

  const { filteredCustomers, filteredIncomeRecords } = filteredData;
  const personalIncome = filteredIncomeRecords.reduce((acc, r) => acc + r.amount, 0);

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <Popover>
              <PopoverTrigger asChild>
              <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                  "w-full justify-start text-left font-normal md:w-[300px]",
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
                  <span>Filter by date (All time)</span>
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
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Personal Income</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">LKR {personalIncome.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Your accumulated commission for the period</p>
            </CardContent>
          </Card>
          <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-2xl font-bold">+{filteredCustomers.length}</div>
              <p className="text-xs text-muted-foreground">Customers registered in the period</p>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => setIsDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Register New Customer
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      <CustomerRegistrationDialog 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        salesman={user}
        onRegistrationSuccess={() => {
          // Data is updated via the top-level snapshot listener in AppLayout
        }} 
      />
    </>
  );
};

export default SalesmanDashboard;
