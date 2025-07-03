"use client";

import React from "react";
import { User, Customer as CustomerType } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, Users, LoaderCircle } from "lucide-react";
import { getCustomersForSalesman } from "@/lib/firestore";

interface SalesmanDashboardProps {
  user: User;
}

const SalesmanDashboard: React.FC<SalesmanDashboardProps> = ({ user }) => {
  const [myCustomers, setMyCustomers] = React.useState<CustomerType[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchMyData = async () => {
      setLoading(true);
      const customersData = await getCustomersForSalesman(user.id);
      setMyCustomers(customersData);
      setLoading(false);
    };
    fetchMyData();
  }, [user.id]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Personal Income</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">LKR {user.totalIncome.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Your total accumulated commission</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">My Customers</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{myCustomers.length}</div>
          <p className="text-xs text-muted-foreground">Total customers registered</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesmanDashboard;
