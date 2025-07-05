"use client";

import React, { useState, useEffect, useCallback } from "react";
import { User, ProductSale, Customer } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, LoaderCircle } from "lucide-react";
import ProductSaleDialog from "../product-sale-dialog";
import { getAllCustomers } from "@/lib/firestore";
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

  const fetchInitialData = useCallback(async () => {
    try {
      const customerData = await getAllCustomers();
      setCustomers(customerData);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
    
    const q = query(collection(db, "productSales"), where("shopManagerId", "==", user.id));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const salesData = querySnapshot.docs.map(doc => doc.data() as ProductSale)
        .sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
      setSales(salesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.id, fetchInitialData]);

  const handleSuccess = () => {
    // The onSnapshot will automatically update the sales list
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
          ) : (
            <div className="rounded-md border">
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
                  {sales.length > 0 ? (
                    sales.map((sale) => (
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
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        You have not recorded any sales yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
