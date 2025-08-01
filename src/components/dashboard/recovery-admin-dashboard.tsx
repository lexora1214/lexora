
"use client";

import React, { useMemo, useState } from "react";
import { User, ProductSale, Collection } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TrendingUp, Repeat, Send, PackageSearch, Wallet, Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";

interface RecoveryAdminDashboardProps {
  allUsers: User[];
  allProductSales: ProductSale[];
  allCollections: Collection[];
}

const RecoveryAdminDashboard: React.FC<RecoveryAdminDashboardProps> = ({ allUsers, allProductSales, allCollections }) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const recoveryStats = useMemo(() => {
    const from = dateRange?.from;
    const to = dateRange?.to ? new Date(dateRange.to) : from ? new Date(from) : null;
    if (to) to.setHours(23, 59, 59, 999);

    const filteredCollections = from && to 
        ? allCollections.filter(c => {
            const collectedDate = new Date(c.collectedAt);
            return collectedDate >= from && collectedDate <= to;
        })
        : allCollections;

    const installmentSales = allProductSales.filter(sale => sale.paymentMethod === 'installments');

    const totalArrears = installmentSales.reduce((sum, sale) => sum + (sale.arrears || 0), 0);
    const totalInstallments = installmentSales.length;
    const assignedInstallments = installmentSales.filter(sale => sale.recoveryStatus === 'assigned').length;
    const pendingAssignment = installmentSales.filter(sale => sale.recoveryStatus === 'pending').length;
    
    const collectedAmount = filteredCollections.reduce((sum, c) => sum + c.amount, 0);

    return {
        totalArrears,
        totalInstallments,
        assignedInstallments,
        pendingAssignment,
        collectedAmount,
    };
  }, [allProductSales, allCollections, dateRange]);

  return (
    <div className="flex flex-col gap-6">
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
                    <span>All Time</span>
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
                    <CardTitle className="text-sm font-medium">Total Collected in Period</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">LKR {recoveryStats.collectedAmount.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Sum of all payments in the date range.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Arrears Count</CardTitle>
                    <TrendingUp className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{recoveryStats.totalArrears}</div>
                    <p className="text-xs text-muted-foreground">Total current missed installments.</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Installment Plans</CardTitle>
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{recoveryStats.totalInstallments}</div>
                    <p className="text-xs text-muted-foreground">Total active installment sales.</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Assigned for Recovery</CardTitle>
                    <Send className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{recoveryStats.assignedInstallments}</div>
                    <p className="text-xs text-muted-foreground">Customers currently assigned to an officer.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Assignment</CardTitle>
                    <PackageSearch className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{recoveryStats.pendingAssignment}</div>
                    <p className="text-xs text-muted-foreground">Customers needing officer assignment.</p>
                </CardContent>
            </Card>
        </div>
    </div>
  );
};

export default RecoveryAdminDashboard;
