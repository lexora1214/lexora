
"use client";

import React from "react";
import { User, Customer, CommissionSettings, IncomeRecord } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, Briefcase, ShieldCheck, LoaderCircle, Landmark, Calendar as CalendarIcon } from "lucide-react";
import { getCommissionSettings } from "@/lib/firestore";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { DateRange } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, eachDayOfInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface AdminDashboardProps {
  user: User;
  allUsers: User[];
  allCustomers: Customer[];
  allIncomeRecords: IncomeRecord[];
  setActiveView: (view: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, allUsers, allCustomers, allIncomeRecords, setActiveView }) => {
  const isMobile = useIsMobile();
  const [chartData, setChartData] = React.useState<any[]>([]);
  const [loadingChart, setLoadingChart] = React.useState(true);
  const [commissionSettings, setCommissionSettings] = React.useState<CommissionSettings | null>(null);
  const [isBreakdownOpen, setIsBreakdownOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  const filteredData = React.useMemo(() => {
    if (!dateRange || !dateRange.from) {
        return { filteredCustomers: allCustomers, filteredIncomeRecords: allIncomeRecords };
    }
    const from = dateRange.from;
    const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
    to.setHours(23, 59, 59, 999);

    const filteredCustomers = allCustomers.filter(customer => {
        const saleDate = new Date(customer.saleDate);
        return saleDate >= from && saleDate <= to;
    });

    const filteredIncomeRecords = allIncomeRecords.filter(record => {
        const saleDate = new Date(record.saleDate);
        return saleDate >= from && saleDate <= to;
    });

    return { filteredCustomers, filteredIncomeRecords };
  }, [allCustomers, allIncomeRecords, dateRange]);

  const { filteredCustomers, filteredIncomeRecords } = filteredData;


  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await getCommissionSettings();
        setCommissionSettings(settings);
      } catch (error) {
        console.error("Failed to fetch commission settings:", error);
      }
    };
    fetchSettings();

    const processCustomerGrowthData = () => {
      setLoadingChart(true);
      try {
        const isAllTime = !dateRange || !dateRange.from;

        if (isAllTime) {
          if (allCustomers.length === 0) {
            setChartData([]);
            return;
          }
          const sortedCustomers = [...allCustomers].sort((a, b) => new Date(a.saleDate).getTime() - new Date(b.saleDate).getTime());
          const growthByMonth: Record<string, number> = {};
          sortedCustomers.forEach(customer => {
            const month = format(new Date(customer.saleDate), 'yyyy-MM');
            if (!growthByMonth[month]) growthByMonth[month] = 0;
            growthByMonth[month]++;
          });

          let cumulativeCount = 0;
          const formattedData = Object.keys(growthByMonth).sort().map(monthStr => {
            cumulativeCount += growthByMonth[monthStr];
            const [year, month] = monthStr.split('-').map(Number);
            const date = new Date(year, month - 1, 2);
            return { date: format(date, 'MMM yy'), customers: cumulativeCount };
          });
          setChartData(formattedData);
        } else {
          const startOfRange = dateRange.from!;
          const endOfRange = dateRange.to ?? dateRange.from!;
          
          const countBeforeRange = allCustomers.filter(c => new Date(c.saleDate) < startOfRange).length;
          
          const dailyIncrements: Record<string, number> = {};
          filteredCustomers.forEach(customer => {
              const dayStr = format(new Date(customer.saleDate), 'yyyy-MM-dd');
              dailyIncrements[dayStr] = (dailyIncrements[dayStr] || 0) + 1;
          });

          const allDays = eachDayOfInterval({ start: startOfRange, end: endOfRange });
          
          let cumulativeCount = countBeforeRange;
          const formattedData = allDays.map(day => {
              const dayStr = format(day, 'yyyy-MM-dd');
              cumulativeCount += (dailyIncrements[dayStr] || 0);
              return { date: format(day, 'MMM d'), customers: cumulativeCount };
          });
          setChartData(formattedData);
        }
      } catch (error) {
        console.error("Failed to process customer growth data:", error);
        setChartData([]);
      } finally {
        setLoadingChart(false);
      }
    };

    processCustomerGrowthData();
  }, [allCustomers, filteredCustomers, dateRange]);
  
  const chartConfig = {
    customers: {
      label: "Total Customers",
      color: "hsl(var(--primary))",
    },
  };

  const totalRevenue = commissionSettings ? commissionSettings.tokenPrice * filteredCustomers.length : 0;
  
  const adminUserIds = allUsers.filter(u => u.role === 'Admin').map(u => u.id);
  const adminTeamTotalIncome = filteredIncomeRecords
    .filter(r => adminUserIds.includes(r.userId))
    .reduce((acc, r) => acc + r.amount, 0);

  const adminTeamTokenCommission = filteredIncomeRecords
    .filter(r => adminUserIds.includes(r.userId) && r.sourceType === 'token_sale')
    .reduce((acc, r) => acc + r.amount, 0);
  
  const adminTeamProductCommission = adminTeamTotalIncome - adminTeamTokenCommission;

  return (
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
            <CardTitle className="text-sm font-medium">Total Revenue from Tokens</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Based on {filteredCustomers.length} token sales</p>
          </CardContent>
        </Card>
        <Card onClick={() => setIsBreakdownOpen(true)} className="cursor-pointer hover:bg-muted/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Team Total Income</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {adminTeamTotalIncome.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Includes all token and product sale commissions. Click for breakdown.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allUsers.length}</div>
            <p className="text-xs text-muted-foreground">Employees in the system (all time)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{filteredCustomers.length}</div>
            <p className="text-xs text-muted-foreground">Customers registered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Role</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Full Control</div>
            <p className="text-xs text-muted-foreground">Manage users & settings</p>
          </CardContent>
        </Card>
      </div>
      
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Customer Growth</CardTitle>
          <CardDescription>Cumulative customer growth over the selected period.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {loadingChart ? (
            <div className="flex h-[350px] items-center justify-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: isMobile ? -10 : 10, bottom: 5 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                    domain={['auto', 'auto']}
                  />
                  <ChartTooltip
                    cursor={true}
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <Line
                    dataKey="customers"
                    type="monotone"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="flex h-[350px] items-center justify-center">
              <p className="text-muted-foreground">No customer data available for the selected period.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Team Income Breakdown</DialogTitle>
            <DialogDescription>
              This is the total commission earned by all administrators in the selected period.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground">Total from Token Sales</span>
                <span className="font-bold text-lg">LKR {adminTeamTokenCommission.toLocaleString()}</span>
            </div>
             <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground">Total from Product Sales</span>
                <span className="font-bold text-lg">LKR {adminTeamProductCommission.toLocaleString()}</span>
            </div>
             <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-xl">Total Income</span>
                <span className="font-bold text-xl text-primary">LKR {adminTeamTotalIncome.toLocaleString()}</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
