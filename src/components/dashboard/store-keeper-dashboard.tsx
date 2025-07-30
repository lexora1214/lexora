
"use client";

import React from "react";
import { StockItem } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Boxes, ListChecks } from "lucide-react";

interface StoreKeeperDashboardProps {
  allStockItems: StockItem[];
  setActiveView: (view: string) => void;
}

const StoreKeeperDashboard: React.FC<StoreKeeperDashboardProps> = ({ allStockItems, setActiveView }) => {
  const totalUniqueProducts = React.useMemo(() => {
    return new Set(allStockItems.map(item => item.productName)).size;
  }, [allStockItems]);

  const totalStockQuantity = React.useMemo(() => {
    return allStockItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [allStockItems]);

  const branchesWithStock = React.useMemo(() => {
    return new Set(allStockItems.map(item => item.branch)).size;
  }, [allStockItems]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unique Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUniqueProducts}</div>
            <p className="text-xs text-muted-foreground">Different product lines in stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Quantity</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStockQuantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total units across all products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Branches with Stock</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{branchesWithStock}</div>
            <p className="text-xs text-muted-foreground">Includes Main Stock and all branches</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Global Stock Management</CardTitle>
            <CardDescription>
                You have full access to view and manage the stock levels for all products across all branches.
            </CardDescription>
        </CardHeader>
        <CardFooter>
            <Button onClick={() => setActiveView('Global Stock View')}>
                Go to Global Stock View
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default StoreKeeperDashboard;
