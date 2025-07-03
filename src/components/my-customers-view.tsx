"use client";

import React from "react";
import { User, Customer as CustomerType } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UserPlus, LoaderCircle } from "lucide-react";
import CustomerRegistrationDialog from "@/components/customer-registration-dialog";
import { Badge } from "@/components/ui/badge";
import { getCustomersForSalesman } from "@/lib/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

interface MyCustomersViewProps {
  user: User;
}

const MyCustomersView: React.FC<MyCustomersViewProps> = ({ user }) => {
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
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
            <div>
                <CardTitle>My Customer Registrations</CardTitle>
                <CardDescription>A list of customers you have registered.</CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Register New Customer
            </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
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
                {myCustomers.length > 0 ? (
                  myCustomers.map((customer) => (
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      You have not registered any customers yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <CustomerRegistrationDialog 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        salesman={user}
        onRegistrationSuccess={fetchMyData} 
      />
    </>
  );
};

export default MyCustomersView;
