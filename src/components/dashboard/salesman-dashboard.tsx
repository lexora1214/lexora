"use client";

import React from "react";
import { User, Customer as CustomerType } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, UserPlus, LoaderCircle } from "lucide-react";
import CustomerRegistrationDialog from "@/components/customer-registration-dialog";
import { Badge } from "@/components/ui/badge";
import { getCustomersForSalesman } from "@/lib/firestore";

interface SalesmanDashboardProps {
  user: User;
}

const SalesmanDashboard: React.FC<SalesmanDashboardProps> = ({ user }) => {
  const [myCustomers, setMyCustomers] = React.useState<CustomerType[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const fetchMyData = React.useCallback(async () => {
    setLoading(true);
    const customersData = await getCustomersForSalesman(user.id);
    setMyCustomers(customersData);
    setLoading(false);
  }, [user.id]);
  
  React.useEffect(() => {
    fetchMyData();
  }, [fetchMyData]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
       <div className="flex justify-end">
          <Button onClick={() => setIsDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Register New Customer
          </Button>
      </div>
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

      <Card>
        <CardHeader>
          <CardTitle>My Customer Registrations</CardTitle>
          <CardDescription>A list of customers you have registered.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Token Serial</TableHead>
                <TableHead>Sale Date</TableHead>
                <TableHead>Commission Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.contactInfo}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{customer.tokenSerial}</Badge>
                  </TableCell>
                  <TableCell>{new Date(customer.saleDate).toLocaleDateString()}</TableCell>
                   <TableCell>
                    <Badge className={customer.commissionDistributed
                        ? "border-transparent bg-success text-success-foreground hover:bg-success/80"
                        : "border-transparent bg-warning text-warning-foreground hover:bg-warning/80"}>
                        {customer.commissionDistributed ? 'Paid' : 'Pending'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <CustomerRegistrationDialog 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        salesman={user}
        onRegistrationSuccess={fetchMyData} 
      />
    </div>
  );
};

export default SalesmanDashboard;
