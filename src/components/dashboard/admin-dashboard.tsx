"use client";

import React from "react";
import { User, Customer } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Users, Briefcase, Network as NetworkIcon, LoaderCircle, ShieldCheck } from "lucide-react";
import UserManagementTable from "@/components/user-management-table";
import CustomerManagementTable from "@/components/customer-management-table";
import NetworkView from "@/components/network-view";
import ActionableInsights from "@/components/actionable-insights";
import CommissionSettings from "@/components/commission-settings";
import { getAllUsers, getAllCustomers } from "@/lib/firestore";

interface AdminDashboardProps {
  user: User;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [usersData, customersData] = await Promise.all([
        getAllUsers(),
        getAllCustomers(),
      ]);
      setUsers(usersData);
      setCustomers(customersData);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalIncomeAllUsers = users.reduce((acc, user) => acc + user.totalIncome, 0);

  return (
    <div className="flex flex-col gap-6">
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
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Employees in the system</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{customers.length}</div>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <Tabs defaultValue="user-management">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="user-management">User Management</TabsTrigger>
                    <TabsTrigger value="customer-management">Customer Management</TabsTrigger>
                    <TabsTrigger value="network-view">Network View</TabsTrigger>
                    <TabsTrigger value="commission-settings">Commission Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="user-management">
                    <Card>
                        <CardHeader>
                            <CardTitle>Employees</CardTitle>
                            <CardDescription>Manage all employees and system users.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UserManagementTable data={users} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="customer-management">
                    <Card>
                        <CardHeader>
                            <CardTitle>Customers</CardTitle>
                            <CardDescription>View all registered customers in the system.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <CustomerManagementTable data={customers} users={users} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="network-view">
                    <Card>
                        <CardHeader>
                            <CardTitle>Organizational Network</CardTitle>
                            <CardDescription>View the hierarchical structure of employees.</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-2">
                            <NetworkView allUsers={users} />
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="commission-settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Commission Settings</CardTitle>
                            <CardDescription>Adjust commission amounts for each role.</CardDescription>
                        </CardHeader>
                        <CommissionSettings />
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
        <div className="lg:col-span-1">
            <ActionableInsights user={user} allUsers={users} allCustomers={customers} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
