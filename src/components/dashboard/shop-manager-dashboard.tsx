
"use client";

import React, { useState, useEffect } from "react";
import { User, ProductSale, Customer } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, LoaderCircle, Calendar, User as UserIcon } from "lucide-react";
import ProductSaleDialog from "../product-sale-dialog";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "../ui/badge";

interface ShopManagerDashboardProps {
  user: User;
  onAddNewSale: () => void;
  openDialogOnLoad?: boolean;
}

const ShopManagerDashboard: React.FC<ShopManagerDashboardProps> = ({ user, onAddNewSale, openDialogOnLoad = false }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(openDialogOnLoad);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener for all customers to get real-time token availability
    const customersUnsub = onSnapshot(collection(db, "customers"), (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(customersData);
    }, (error) => {
        console.error("Failed to fetch customers:", error);
    });

    // Listener for sales recorded by this shop manager
    const salesQuery = query(collection(db, "productSales"), where("shopManagerId", "==", user.id));
    const salesUnsub = onSnapshot(salesQuery, (querySnapshot) => {
      const salesData = querySnapshot.docs.map(doc => doc.data() as ProductSale)
        .sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
      setSales(salesData);
      setLoading(false);
    });

    return () => {
      customersUnsub();
      salesUnsub();
    };
  }, [user.id]);

  const handleSuccess = () => {
    // The onSnapshot listeners will automatically update the sales list and customer data
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Recent Product Sales</CardTitle>
            <CardDescription>A list of product sales you have recorded.</CardDescription>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} className="w-full md:w-auto">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Record New Sale
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex h-48 w-full items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : sales.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden rounded-md border md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{new Date(sale.saleDate).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{sale.productName}</TableCell>
                        <TableCell>{sale.customerName}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end">
                            <span>LKR {sale.price.toLocaleString()}</span>
                            <Badge variant="outline" className="mt-1">{sale.paymentMethod}</Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="grid gap-4 md:hidden">
                {sales.map((sale) => (
                  <Card key={sale.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold text-card-foreground leading-tight">{sale.productName}</p>
                            <Badge variant="outline" className="mt-1.5 capitalize">{sale.paymentMethod}</Badge>
                        </div>
                        <p className="font-bold text-lg text-primary text-right">LKR {sale.price.toLocaleString()}</p>
                    </div>
                    <div className="border-t pt-3 space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <UserIcon className="w-4 h-4 text-primary/80"/>
                            <p>Customer: {sale.customerName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-primary/80"/>
                            <p>Date: {new Date(sale.saleDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-24 text-center text-muted-foreground">
                <p>You have not recorded any sales yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ProductSaleDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        shopManager={user}
        customers={customers}
        onSaleSuccess={handleSuccess}
      />
    </>
  );
};

export default ShopManagerDashboard;
