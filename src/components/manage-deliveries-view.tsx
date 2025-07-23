
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User, ProductSale, Customer } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, PackageSearch, PackageCheck, Send, Calendar, User as UserIcon } from "lucide-react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { assignDelivery } from "@/lib/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";

interface ManageDeliveriesViewProps {
  manager: User;
  allUsers: User[];
}

const AssignDeliveryDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  productSale: ProductSale;
  deliveryBoys: User[];
  onAssignmentSuccess: () => void;
}> = ({ isOpen, onOpenChange, productSale, deliveryBoys, onAssignmentSuccess }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBoyId, setSelectedBoyId] = useState<string>("");

  const handleSubmit = async () => {
    if (!selectedBoyId) {
      toast({ variant: "destructive", title: "Assignment Failed", description: "Please select a delivery boy." });
      return;
    }
    
    setIsLoading(true);
    try {
      const selectedBoy = deliveryBoys.find(b => b.id === selectedBoyId);
      if (!selectedBoy) throw new Error("Could not find the selected delivery boy.");
      
      await assignDelivery(productSale.id, selectedBoy.id, selectedBoy.name);
      
      toast({
        title: "Task Assigned",
        description: `${productSale.productName} assigned to ${selectedBoy.name}.`,
        variant: "default",
        className: "bg-success text-success-foreground",
      });
      onAssignmentSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Assignment Failed", description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Delivery Task</DialogTitle>
          <DialogDescription>Select a delivery boy to assign this task to.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">{productSale.productName}</p>
            <p className="text-sm text-muted-foreground">For: {productSale.customerName}</p>
          </div>
          <div>
            <Label htmlFor="delivery-boy">Delivery Boy</Label>
            <Select value={selectedBoyId} onValueChange={setSelectedBoyId}>
              <SelectTrigger id="delivery-boy">
                <SelectValue placeholder="Select a delivery boy" />
              </SelectTrigger>
              <SelectContent>
                {deliveryBoys.map(boy => (
                  <SelectItem key={boy.id} value={boy.id}>{boy.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
            Assign Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const ManageDeliveriesView: React.FC<ManageDeliveriesViewProps> = ({ manager, allUsers }) => {
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<ProductSale | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const relevantManagerIds = useMemo(() => {
    if (manager.role === 'Branch Admin') {
      return manager.assignedManagerIds || [];
    }
    return [manager.id];
  }, [manager]);

  const deliveryBoys = useMemo(() => {
    if (relevantManagerIds.length === 0) return [];
    return allUsers.filter(u => u.role === 'Delivery Boy' && u.referrerId && relevantManagerIds.includes(u.referrerId))
  }, [allUsers, relevantManagerIds]);

  const relevantBranches = useMemo(() => {
      const managerUsers = allUsers.filter(u => relevantManagerIds.includes(u.id));
      const branches = new Set(managerUsers.map(u => u.branch).filter(Boolean));
      return Array.from(branches);
  }, [allUsers, relevantManagerIds]);


  useEffect(() => {
    if (relevantBranches.length === 0) {
        setLoading(false);
        return;
    }
    const salesQuery = query(collection(db, "productSales"));
    const salesUnsub = onSnapshot(salesQuery, (querySnapshot) => {
      const salesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductSale));
      setProductSales(salesData);
      setLoading(false);
    });

    const customersUnsub = onSnapshot(collection(db, "customers"), (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(customersData);
    });

    return () => {
      salesUnsub();
      customersUnsub();
    };
  }, [relevantBranches]);
  
  const salesWithCustomerInfo = useMemo(() => {
    return productSales.map(sale => {
      const customer = customers.find(c => c.id === sale.customerId);
      return { ...sale, customer };
    }).filter(sale => sale.customer?.branch && relevantBranches.includes(sale.customer.branch));
  }, [productSales, customers, relevantBranches]);
  
  const sortSalesByRequestedDate = (
    a: ProductSale,
    b: ProductSale
  ) => {
    const aDate = a.requestedDeliveryDate ? new Date(a.requestedDeliveryDate) : null;
    const bDate = b.requestedDeliveryDate ? new Date(b.requestedDeliveryDate) : null;

    if (aDate && bDate) return aDate.getTime() - bDate.getTime();
    if (aDate) return -1; // a has date, b doesn't, so a comes first
    if (bDate) return 1;  // b has date, a doesn't, so b comes first
    return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime(); // fallback to sale date
  };

  const pendingDeliveries = salesWithCustomerInfo
    .filter(sale => sale.deliveryStatus === 'pending')
    .sort(sortSalesByRequestedDate);

  const assignedDeliveries = salesWithCustomerInfo
    .filter(sale => sale.deliveryStatus === 'assigned')
    .sort(sortSalesByRequestedDate);

  const deliveredDeliveries = salesWithCustomerInfo
    .filter(sale => sale.deliveryStatus === 'delivered')
    .sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());


  const handleAssignClick = (sale: ProductSale) => {
    setSelectedSale(sale);
    setIsAssignDialogOpen(true);
  };
  
  const renderTable = (sales: (ProductSale & { customer: Customer | undefined })[]) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.length > 0 ? sales.map(sale => (
            <TableRow key={sale.id}>
              <TableCell>
                <div className="font-medium">{sale.productName}</div>
                <div className="text-sm text-muted-foreground">{new Date(sale.saleDate).toLocaleDateString()}</div>
                {sale.requestedDeliveryDate && (
                    <div className="text-xs text-primary font-medium mt-1 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        Req: {format(new Date(sale.requestedDeliveryDate), "PPP")}
                    </div>
                )}
              </TableCell>
              <TableCell>
                 <div className="font-medium">{sale.customer?.name}</div>
                 <div className="text-sm text-muted-foreground">{sale.customer?.contactInfo}</div>
                 <div className="text-xs text-muted-foreground">{sale.customer?.address}</div>
              </TableCell>
               <TableCell>{sale.assignedToName || "N/A"}</TableCell>
              <TableCell>
                {sale.deliveryStatus === 'pending' && (
                  <Button size="sm" onClick={() => handleAssignClick(sale)}>
                    <Send className="mr-2 h-4 w-4" /> Assign
                  </Button>
                )}
              </TableCell>
            </TableRow>
          )) : (
             <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No deliveries in this category.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Manage Deliveries</CardTitle>
          <CardDescription>Oversee and assign product deliveries for your branch.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="pending" className="w-full space-y-4">
            <AccordionItem value="pending">
              <AccordionTrigger className="text-lg font-semibold flex items-center gap-2 p-4 rounded-md bg-muted hover:bg-muted/80">
                <PackageSearch className="h-6 w-6 text-primary" />
                Pending Deliveries ({pendingDeliveries.length})
              </AccordionTrigger>
              <AccordionContent className="pt-4">{renderTable(pendingDeliveries)}</AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="assigned">
              <AccordionTrigger className="text-lg font-semibold flex items-center gap-2 p-4 rounded-md bg-muted hover:bg-muted/80">
                <Send className="h-6 w-6 text-blue-500" />
                Assigned Deliveries ({assignedDeliveries.length})
              </AccordionTrigger>
              <AccordionContent className="pt-4">{renderTable(assignedDeliveries)}</AccordionContent>
            </AccordionItem>

            <AccordionItem value="delivered">
              <AccordionTrigger className="text-lg font-semibold flex items-center gap-2 p-4 rounded-md bg-muted hover:bg-muted/80">
                 <PackageCheck className="h-6 w-6 text-green-500" />
                Completed Deliveries ({deliveredDeliveries.length})
              </AccordionTrigger>
              <AccordionContent className="pt-4">{renderTable(deliveredDeliveries)}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
      {selectedSale && (
        <AssignDeliveryDialog
          isOpen={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          productSale={selectedSale}
          deliveryBoys={deliveryBoys}
          onAssignmentSuccess={() => { /* onSnapshot will refresh data */ }}
        />
      )}
    </>
  );
};

export default ManageDeliveriesView;
