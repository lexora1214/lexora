
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User, ProductSale, Customer } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, Send, Repeat, HandCoins } from "lucide-react";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { assignRecovery } from "@/lib/firestore";
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

interface ManageRecoveryViewProps {
  manager: User;
  allUsers: User[];
}

const AssignRecoveryDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  productSale: ProductSale;
  recoveryOfficers: User[];
  onAssignmentSuccess: () => void;
}> = ({ isOpen, onOpenChange, productSale, recoveryOfficers, onAssignmentSuccess }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>("");

  const handleSubmit = async () => {
    if (!selectedOfficerId) {
      toast({ variant: "destructive", title: "Assignment Failed", description: "Please select a recovery officer." });
      return;
    }
    
    setIsLoading(true);
    try {
      const selectedOfficer = recoveryOfficers.find(b => b.id === selectedOfficerId);
      if (!selectedOfficer) throw new Error("Could not find the selected recovery officer.");
      
      await assignRecovery(productSale.id, selectedOfficer.id, selectedOfficer.name);
      
      toast({
        title: "Task Assigned",
        description: `Installment recovery for ${productSale.productName} assigned to ${selectedOfficer.name}.`,
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
          <DialogTitle>Assign Recovery Task</DialogTitle>
          <DialogDescription>Select a recovery officer to assign this task to.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">{productSale.productName}</p>
            <p className="text-sm text-muted-foreground">For: {productSale.customerName}</p>
          </div>
          <div>
            <Label htmlFor="recovery-officer">Recovery Officer</Label>
            <Select value={selectedOfficerId} onValueChange={setSelectedOfficerId}>
              <SelectTrigger id="recovery-officer">
                <SelectValue placeholder="Select an officer" />
              </SelectTrigger>
              <SelectContent>
                {recoveryOfficers.map(boy => (
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


const ManageRecoveryView: React.FC<ManageRecoveryViewProps> = ({ manager, allUsers }) => {
  const [productSales, setProductSales] = useState<ProductSale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<ProductSale | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const teamOperationManager = useMemo(() => {
    if (manager.role === 'Branch Admin') {
      return allUsers.find(u => u.id === manager.referrerId);
    }
    return manager;
  }, [manager, allUsers]);

  const recoveryOfficers = useMemo(() => {
    if (!teamOperationManager) return [];
    return allUsers.filter(u => u.role === 'Recovery Officer' && u.referrerId === teamOperationManager.id)
  }, [allUsers, teamOperationManager]);

  useEffect(() => {
    // Listen to product sales from the manager's branch
    const salesQuery = query(collection(db, "productSales"));
    const salesUnsub = onSnapshot(salesQuery, (querySnapshot) => {
      const salesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductSale));
      setProductSales(salesData);
      setLoading(false);
    });

    // Listen to all customers to link details
    const customersUnsub = onSnapshot(collection(db, "customers"), (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(customersData);
    });

    return () => {
      salesUnsub();
      customersUnsub();
    };
  }, [manager.branch]);
  
  const salesWithCustomerInfo = useMemo(() => {
    return productSales
        .filter(sale => sale.paymentMethod === 'installments')
        .map(sale => {
            const customer = customers.find(c => c.id === sale.customerId);
            return { ...sale, customer };
        })
        .filter(sale => sale.customer?.branch === manager.branch); // Filter sales from the manager's branch
  }, [productSales, customers, manager.branch]);

  const pendingRecovery = salesWithCustomerInfo.filter(sale => sale.recoveryStatus === 'pending');
  const assignedRecovery = salesWithCustomerInfo.filter(sale => sale.recoveryStatus === 'assigned');

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
              </TableCell>
              <TableCell>
                 <div className="font-medium">{sale.customer?.name}</div>
                 <div className="text-sm text-muted-foreground">{sale.customer?.contactInfo}</div>
                 <div className="text-xs text-muted-foreground">{sale.customer?.address}</div>
              </TableCell>
               <TableCell>{sale.recoveryOfficerName || "N/A"}</TableCell>
              <TableCell>
                {sale.recoveryStatus === 'pending' && (
                  <Button size="sm" onClick={() => handleAssignClick(sale)}>
                    <Send className="mr-2 h-4 w-4" /> Assign
                  </Button>
                )}
              </TableCell>
            </TableRow>
          )) : (
             <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No recovery tasks in this category.
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
          <CardTitle>Manage Installment Recovery</CardTitle>
          <CardDescription>Oversee and assign installment collection tasks for your branch.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible defaultValue="pending" className="w-full space-y-4">
            <AccordionItem value="pending">
              <AccordionTrigger className="text-lg font-semibold flex items-center gap-2 p-4 rounded-md bg-muted hover:bg-muted/80">
                <Repeat className="h-6 w-6 text-primary" />
                Pending Assignments ({pendingRecovery.length})
              </AccordionTrigger>
              <AccordionContent className="pt-4">{renderTable(pendingRecovery)}</AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="assigned">
              <AccordionTrigger className="text-lg font-semibold flex items-center gap-2 p-4 rounded-md bg-muted hover:bg-muted/80">
                <HandCoins className="h-6 w-6 text-blue-500" />
                Assigned Tasks ({assignedRecovery.length})
              </AccordionTrigger>
              <AccordionContent className="pt-4">{renderTable(assignedRecovery)}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
      {selectedSale && (
        <AssignRecoveryDialog
          isOpen={isAssignDialogOpen}
          onOpenChange={setIsAssignDialogOpen}
          productSale={selectedSale}
          recoveryOfficers={recoveryOfficers}
          onAssignmentSuccess={() => { /* onSnapshot will refresh data */ }}
        />
      )}
    </>
  );
};

export default ManageRecoveryView;
