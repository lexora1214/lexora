
"use client";

import React, { useMemo, useState } from "react";
import { User, ProductSale } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { startOfMonth, subMonths } from 'date-fns';
import { Badge } from "../ui/badge";

interface RecoveryAdminDashboardProps {
  allUsers: User[];
  allProductSales: ProductSale[];
}

const RecoveryAdminDashboard: React.FC<RecoveryAdminDashboardProps> = ({ allUsers, allProductSales }) => {
  const recoveryStatusByBranch = useMemo(() => {
    const today = new Date();
    const lastMonthStart = startOfMonth(subMonths(today, 1));

    const salesInPeriod = allProductSales.filter(sale => 
      sale.paymentMethod === 'installments' && 
      new Date(sale.saleDate) >= lastMonthStart
    );
    
    const branchData: Record<string, { pending: number; assigned: number }> = {};
    const branches = new Set(allUsers.map(u => u.branch).filter(Boolean));
    
    branches.forEach(branch => {
        branchData[branch] = { pending: 0, assigned: 0 };
    });

    salesInPeriod.forEach(sale => {
      const salesman = allUsers.find(u => u.id === sale.shopManagerId);
      if (salesman && salesman.branch && branchData[salesman.branch]) {
        if (sale.recoveryStatus === 'pending') {
          branchData[salesman.branch].pending++;
        } else if (sale.recoveryStatus === 'assigned') {
          branchData[salesman.branch].assigned++;
        }
      }
    });

    return Object.entries(branchData).map(([branch, counts]) => ({
      branch,
      ...counts
    })).sort((a,b) => (b.pending + b.assigned) - (a.pending + a.assigned));
  }, [allUsers, allProductSales]);
  
  const chartConfig = {
    pending: {
      label: "Pending",
      color: "hsl(var(--warning))",
    },
    assigned: {
      label: "Assigned",
      color: "hsl(var(--primary))",
    },
  };

  return (
    <div className="flex flex-col gap-6">
       <Card>
          <CardHeader>
            <CardTitle>Branch Recovery Status</CardTitle>
            <CardDescription>Installment recovery assignments for all branches in the last two months.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recoveryStatusByBranch} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="branch"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    stroke="#888888"
                    fontSize={12}
                    interval={0}
                    width={150}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Legend />
                  <Bar dataKey="pending" stackId="a" fill="var(--color-pending)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="assigned" stackId="a" fill="var(--color-assigned)" radius={[4, 0, 0, 4]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
    </div>
  );
};

export default RecoveryAdminDashboard;
