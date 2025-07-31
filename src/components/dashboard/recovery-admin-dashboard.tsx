"use client";

import React, { useMemo } from "react";
import { User, ProductSale } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { TrendingUp, Repeat, Send, PackageSearch, Wallet } from "lucide-react";

interface RecoveryAdminDashboardProps {
  allUsers: User[];
  allProductSales: ProductSale[];
}

const RecoveryAdminDashboard: React.FC<RecoveryAdminDashboardProps> = ({ allUsers, allProductSales }) => {

  const recoveryStats = useMemo(() => {
    const installmentSales = allProductSales.filter(sale => sale.paymentMethod === 'installments');

    const totalArrears = installmentSales.reduce((sum, sale) => sum + (sale.arrears || 0), 0);
    const totalInstallments = installmentSales.reduce((sum, sale) => sum + (sale.installments || 0), 0);
    const assignedInstallments = installmentSales.filter(sale => sale.recoveryStatus === 'assigned').length;
    const pendingAssignment = installmentSales.filter(sale => sale.recoveryStatus === 'pending').length;
    const collectedAmount = installmentSales.reduce((sum, sale) => {
        const collected = (sale.paidInstallments || 0) * (sale.monthlyInstallment || 0);
        return sum + collected;
    }, 0);

    return {
        totalArrears,
        totalInstallments,
        assignedInstallments,
        pendingAssignment,
        collectedAmount,
    };
  }, [allProductSales]);

  return (
    <div className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Arrears Count</CardTitle>
                    <TrendingUp className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{recoveryStats.totalArrears}</div>
                    <p className="text-xs text-muted-foreground">Total missed installments across all customers.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Installments Value</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">LKR {recoveryStats.collectedAmount.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Total amount collected from all installments paid so far.</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Installment Plans</CardTitle>
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{recoveryStats.totalInstallments}</div>
                    <p className="text-xs text-muted-foreground">Total number of monthly installments to be collected.</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Assigned for Recovery</CardTitle>
                    <Send className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{recoveryStats.assignedInstallments}</div>
                    <p className="text-xs text-muted-foreground">Customers currently assigned to a recovery officer.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Assignment</CardTitle>
                    <PackageSearch className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{recoveryStats.pendingAssignment}</div>
                    <p className="text-xs text-muted-foreground">Customers waiting for a recovery officer assignment.</p>
                </CardContent>
            </Card>
        </div>
    </div>
  );
};

export default RecoveryAdminDashboard;
