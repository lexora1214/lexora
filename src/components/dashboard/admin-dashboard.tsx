"use client";

import React from "react";
import { User, Customer } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DollarSign, Users, Briefcase, ShieldCheck } from "lucide-react";

interface AdminDashboardProps {
  user: User;
  allUsers: User[];
  allCustomers: Customer[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, allUsers, allCustomers }) => {
  const totalIncomeAllUsers = allUsers.reduce((acc, user) => acc + user.totalIncome, 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <CardTitle className="text-sm font-medium">Admin Role</CardTitle>
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">Full Control</div>
          <p className="text-xs text-muted-foreground">Manage users & settings</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
