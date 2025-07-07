"use client";

import React from "react";
import { User, Customer, CommissionSettings } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { DollarSign, Users, Briefcase, ShieldCheck, LoaderCircle, Landmark } from "lucide-react";
import { getCommissionSettings } from "@/lib/firestore";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
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
  setActiveView: (view: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, allUsers, allCustomers, setActiveView }) => {
  const [chartData, setChartData] = React.useState<any[]>([]);
  const [loadingChart, setLoadingChart] = React.useState(true);
  const [commissionSettings, setCommissionSettings] = React.useState<CommissionSettings | null>(null);
  const [isBreakdownOpen, setIsBreakdownOpen] = React.useState(false);

  React.useEffect(() => {
    const processDataForChart = async () => {
      setLoadingChart(true);
      try {
        const settings = await getCommissionSettings();
        setCommissionSettings(settings);

        if (!settings || allCustomers.length === 0) {
          setChartData([]);
          setLoadingChart(false);
          return;
        }

        const revenueByMonth = allCustomers.reduce((acc, customer) => {
          const saleDate = new Date(customer.saleDate);
          const month = saleDate.toISOString().slice(0, 7); // YYYY-MM
          if (!acc[month]) {
            acc[month] = 0;
          }
          acc[month] += settings.tokenPrice;
          return acc;
        }, {} as Record<string, number>);

        const sortedMonths = Object.keys(revenueByMonth).sort();

        let cumulativeRevenue = 0;
        const formattedChartData = sortedMonths.map(monthStr => {
          cumulativeRevenue += revenueByMonth[monthStr];
          const date = new Date(monthStr + '-02T00:00:00Z'); // Use a specific day to avoid timezone issues
          return {
            month: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
            revenue: cumulativeRevenue,
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
    revenue: {
      label: "Cumulative Revenue",
      color: "hsl(var(--primary))",
    },
  };

  const totalRevenue = commissionSettings ? commissionSettings.tokenPrice * allCustomers.length : 0;
  const adminTeamTokenCommission = commissionSettings ? allCustomers.length * commissionSettings.admin : 0;
  const adminTeamTotalIncome = allUsers
    .filter(u => u.role === 'Admin')
    .reduce((acc, u) => acc + u.totalIncome, 0);
  const adminTeamProductCommission = adminTeamTotalIncome - adminTeamTokenCommission;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue from Tokens</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">LKR {totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Based on {allCustomers.length} token sales</p>
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
          <CardTitle>Revenue Growth</CardTitle>
          <CardDescription>Cumulative revenue generated from all token sales over time.</CardDescription>
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
                    dataKey="revenue"
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

      <Dialog open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Team Income Breakdown</DialogTitle>
            <DialogDescription>
              This is the total commission earned by all administrators.
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
