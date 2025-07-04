"use client";

import React from "react";
import { User, Customer, CommissionSettings } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { DollarSign, Users, Briefcase, ShieldCheck, LoaderCircle, Landmark } from "lucide-react";
import { getCommissionSettings } from "@/lib/firestore";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface AdminDashboardProps {
  user: User;
  allUsers: User[];
  allCustomers: Customer[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, allUsers, allCustomers }) => {
  const totalIncomeAllUsers = allUsers.reduce((acc, user) => acc + user.totalIncome, 0);
  const [chartData, setChartData] = React.useState<any[]>([]);
  const [loadingChart, setLoadingChart] = React.useState(true);
  const [commissionSettings, setCommissionSettings] = React.useState<CommissionSettings | null>(null);

  React.useEffect(() => {
    const processDataForChart = async () => {
      setLoadingChart(true);
      try {
        const settings = await getCommissionSettings();
        setCommissionSettings(settings);

        // Exclude admin commission from per-sale calculation for the chart
        const { admin, ...distributedCommissions } = settings;
        const totalCommissionPerSale = Object.values(distributedCommissions).reduce((sum, val) => sum + val, 0);


        if (allCustomers.length === 0) {
          setChartData([]);
          setLoadingChart(false);
          return;
        }

        const salesByMonth = allCustomers.reduce((acc, customer) => {
          const saleDate = new Date(customer.saleDate);
          const month = saleDate.toISOString().slice(0, 7); // YYYY-MM
          if (!acc[month]) {
            acc[month] = 0;
          }
          acc[month] += totalCommissionPerSale;
          return acc;
        }, {} as Record<string, number>);

        const sortedMonths = Object.keys(salesByMonth).sort();

        let cumulativeIncome = 0;
        const formattedChartData = sortedMonths.map(monthStr => {
          cumulativeIncome += salesByMonth[monthStr];
          const date = new Date(monthStr + '-02T00:00:00Z'); // Use a specific day to avoid timezone issues
          return {
            month: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
            income: cumulativeIncome,
          };
        });

        setChartData(formattedChartData);
      } catch (error) {
        console.error("Failed to process chart data:", error);
        setChartData([]);
      } finally {
        setLoadingChart(false);
      }
    };

    processDataForChart();
  }, [allCustomers]);
  
  const chartConfig = {
    income: {
      label: "Cumulative Income",
      color: "hsl(var(--primary))",
    },
  };

  const adminTeamCommission = commissionSettings ? allCustomers.length * commissionSettings.admin : 0;
  const adminCommissionPerSale = commissionSettings ? commissionSettings.admin : '...';

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {totalIncomeAllUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allUsers.length}</div>
            <p className="text-xs text-muted-foreground">Employees in the system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{allCustomers.length}</div>
            <p className="text-xs text-muted-foreground">Customers registered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Team Commission</CardTitle>
            <Landmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {adminTeamCommission.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From all sales (LKR {adminCommissionPerSale.toLocaleString()} per sale)</p>
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
      
      <Card>
        <CardHeader>
          <CardTitle>Income Growth</CardTitle>
          <CardDescription>Cumulative income generated from all sales over time.</CardDescription>
        </CardHeader>
        <CardContent className="pl-2">
          {loadingChart ? (
            <div className="flex h-[350px] items-center justify-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
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
                    tickFormatter={(value) => `LKR ${value / 1000}k`}
                  />
                  <ChartTooltip
                    cursor={true}
                    content={<ChartTooltipContent indicator="line" />}
                  />
                  <Line
                    dataKey="income"
                    type="monotone"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          ) : (
            <div className="flex h-[350px] items-center justify-center">
              <p className="text-muted-foreground">No sales data available to display the chart.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
