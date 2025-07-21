

"use client";

import React, { useState, useEffect } from "react";
import { User, ProductSale, Customer, StockItem } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, LoaderCircle, Calendar as CalendarIcon, User as UserIcon } from "lucide-react";
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
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface ShopManagerDashboardProps {
  user: User;
  openDialogOnLoad?: boolean;
}

const ShopManagerDashboard: React.FC<ShopManagerDashboardProps> = ({ user, openDialogOnLoad = false }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(openDialogOnLoad);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    const customersUnsub = onSnapshot(collection(db, "customers"), (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(customersData);
    });

    const salesQuery = query(collection(db, "productSales"), where("shopManagerId", "==", user.id));
    const salesUnsub = onSnapshot(salesQuery, (querySnapshot) => {
      const salesData = querySnapshot.docs.map(doc => doc.data() as ProductSale)
        .sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
      setSales(salesData);
      setLoading(false);
    });
    
    // Listen to stock items for the manager's branch
    const stockQuery = query(collection(db, "stock"), where("branch", "==", user.branch));
    const stockUnsub = onSnapshot(stockQuery, (snapshot) => {
        const items = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as StockItem));
        setStockItems(items);
    });

    return () => {
      customersUnsub();
      salesUnsub();
      stockUnsub();
    };
  }, [user.id, user.branch]);

  const handleSuccess = () => {
    // onSnapshot listeners will update data automatically
  };

  const filteredSales = React.useMemo(() => {
    if (!dateRange || !dateRange.from) {
      return sales;
    }
    const from = dateRange.from;
    const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
    to.setHours(23, 59, 59, 999); // Include the whole 'to' day

    return sales.filter(sale => {
        const saleDate = new Date(sale.saleDate);
        return saleDate >= from && saleDate <= to;
    });
  }, [sales, dateRange]);


  return (
    <>
      <Card>
        <CardHeader className="flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Recent Product Sales</CardTitle>
            <CardDescription>A list of product sales you have recorded.</CardDescription>
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-2 w-full md:w-auto">
             <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
                <div className="p-2 border-t">
                  <Button variant="ghost" className="w-full justify-center" onClick={() => setDateRange(undefined)}>Clear</Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button onClick={() => setIsDialogOpen(true)} className="w-full md:w-auto">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Record New Sale
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex h-48 w-full items-center justify-center">
                <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : filteredSales.length > 0 ? (
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
                    {filteredSales.map((sale) => (
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
                {filteredSales.map((sale) => (
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
                            <CalendarIcon className="w-4 h-4 text-primary/80"/>
                            <p>Date: {new Date(sale.saleDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-24 text-center text-muted-foreground">
                <p>No sales found for the selected period.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ProductSaleDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        shopManager={user}
        customers={customers}
        stockItems={stockItems}
        onSaleSuccess={handleSuccess}
      />
    </>
  );
};

export default ShopManagerDashboard;
