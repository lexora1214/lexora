
"use client";

import React from "react";
import { User, IncomeRecord, Customer, IncentiveSettings } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { DollarSign, Users, Activity, Calendar as CalendarIcon, Target } from "lucide-react";
import { getDownlineIdsAndUsers } from "@/lib/hierarchy";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useIsMobile } from "@/hooks/use-mobile";
import { DateRange } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { getIncentiveSettings } from "@/lib/firestore";
import { Progress } from "../ui/progress";

interface ManagerDashboardProps {
  user: User;
  allUsers: User[];
  allIncomeRecords: IncomeRecord[];
  allCustomers: Customer[];
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ user, allUsers, allIncomeRecords, allCustomers }) => {
  const isMobile = useIsMobile();
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [incentiveTarget, setIncentiveTarget] = React.useState(0);
  const [monthlyTeamSales, setMonthlyTeamSales] = React.useState(0);


  const { users: downlineUsers, ids: downlineUserIds } = getDownlineIdsAndUsers(user.id, allUsers);
  
  React.useEffect(() => {
      const fetchIncentiveData = async () => {
          const incentiveSettings = await getIncentiveSettings();
          const roleSettings = incentiveSettings[user.role];
          if (roleSettings) {
              setIncentiveTarget(roleSettings.target);
          }
      };

      const countMonthlySales = () => {
          if (!allCustomers) return; // Guard against undefined array
          const today = new Date();
          const start = startOfMonth(today);
          const end = endOfMonth(today);

          const salesCount = allCustomers.filter(c => 
              downlineUserIds.includes(c.salesmanId) &&
              c.commissionStatus === 'approved' &&
              new Date(c.saleDate) >= start &&
              new Date(c.saleDate) <= end
          ).length;

          setMonthlyTeamSales(salesCount);
      }

      fetchIncentiveData();
      countMonthlySales();
  }, [user.role, allCustomers, downlineUserIds]);

  const filteredIncomeRecords = React.useMemo(() => {
    if (!dateRange || !dateRange.from) {
      return allIncomeRecords;
    }
    const from = dateRange.from;
    const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
    to.setHours(23, 59, 59, 999);

    return allIncomeRecords.filter(record => {
        const saleDate = new Date(record.saleDate);
        return saleDate >= from && saleDate <= to;
    });
  }, [allIncomeRecords, dateRange]);

  const personalIncome = filteredIncomeRecords
    .filter(r => r.userId === user.id)
    .reduce((acc, r) => acc + r.amount, 0);

  const teamIncome = filteredIncomeRecords
    .filter(r => downlineUserIds.includes(r.userId))
    .reduce((acc, r) => acc + r.amount, 0);

  const chartData = downlineUsers
    .map(u => ({
        name: u.name.split(' ')[0],
        income: filteredIncomeRecords
                    .filter(r => r.userId === u.id)
                    .reduce((acc, r) => acc + r.amount, 0),
    }))
    .filter(u => u.income > 0)
    .sort((a,b) => b.income - a.income)
    .slice(0, 5);

  const chartConfig = {
    income: {
      label: "Income (LKR)",
      color: "hsl(var(--primary))",
    },
  };
  
  const targetProgress = incentiveTarget > 0 ? (monthlyTeamSales / incentiveTarget) * 100 : 0;

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
            <p className="text-xs text-muted-foreground">Your total accumulated commission</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Income</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {teamIncome.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total from your downline</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{downlineUsers.length} Members</div>
            <p className="text-xs text-muted-foreground">Direct and indirect reports</p>
          </CardContent>
        </Card>
      </div>

      {incentiveTarget > 0 && (
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Monthly Team Target
                </CardTitle>
                <CardDescription>
                    Your team's progress for {format(new Date(), 'MMMM yyyy')}.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                    <span>Progress</span>
                    <span>{monthlyTeamSales} / {incentiveTarget} Tokens</span>
                </div>
                <Progress value={targetProgress} className="h-3" />
                 <p className="text-xs text-muted-foreground mt-2">
                    {incentiveTarget - monthlyTeamSales > 0 
                        ? `${incentiveTarget - monthlyTeamSales} more approved sales to go!`
                        : `Congratulations! Your team has reached the monthly target.`
                    }
                </p>
            </CardContent>
          </Card>
        )}

      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Top Team Performers</CardTitle>
          <CardDescription>Income generated by your top 5 team members for the selected period.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} accessibilityLayer margin={{ top: 5, right: 20, left: isMobile ? -20 : 10, bottom: 5 }}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `LKR ${value / 1000}k`}
                  />
                    <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={isMobile ? 30 : undefined} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
             <div className="flex h-[300px] items-center justify-center">
              <p className="text-muted-foreground">No team income data available for the selected period.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerDashboard;
