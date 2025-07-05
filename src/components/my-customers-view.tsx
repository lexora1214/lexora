
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
import { UserPlus, LoaderCircle, Calendar, ShieldCheck, Mail } from "lucide-react";
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
        <CardHeader className="flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <CardTitle>My Customer Registrations</CardTitle>
                <CardDescription>A list of customers you have registered.</CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="w-full md:w-auto">
                <UserPlus className="mr-2 h-4 w-4" />
                Register New Customer
            </Button>
        </CardHeader>
        <CardContent>
            {/* Desktop Table View */}
            <div className="hidden rounded-md border md:block">
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

            {/* Mobile Card View */}
            <div className="grid gap-4 md:hidden">
                {myCustomers.length > 0 ? (
                    myCustomers.map((customer) => (
                        <Card key={customer.id} className="p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-card-foreground">{customer.name}</p>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Mail className="w-3 h-3"/>{customer.contactInfo}</p>
                                </div>
                                <Badge className={customer.commissionDistributed
                                    ? "border-transparent bg-success text-success-foreground hover:bg-success/80"
                                    : "border-transparent bg-warning text-warning-foreground hover:bg-warning/80"}>
                                    {customer.commissionDistributed ? 'Paid' : 'Pending'}
                                </Badge>
                            </div>
                            <div className="border-t pt-3 flex justify-between items-center text-sm text-muted-foreground">
                                <Badge variant="outline" className="font-mono text-xs">{customer.tokenSerial}</Badge>
                                <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3"/>{new Date(customer.saleDate).toLocaleDateString()}</div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="text-center text-muted-foreground py-10">
                        You have not registered any customers yet.
                    </div>
                )}
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
