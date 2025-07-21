
"use client";

import React, { useState, useEffect } from "react";
import { User, ProductSale, Customer } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, CheckCircle2, Phone, Truck, Package, Navigation } from "lucide-react";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { markAsDelivered } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import MapPicker from "./map-picker";
import { Badge } from "./ui/badge";

interface DeliveryBoyDashboardProps {
  user: User;
}

const DeliveryBoyDashboard: React.FC<DeliveryBoyDashboardProps> = ({ user }) => {
  const [assignedSales, setAssignedSales] = useState<ProductSale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const salesQuery = query(collection(db, "productSales"), where("assignedTo", "==", user.id), where("deliveryStatus", "==", "assigned"));
    const salesUnsub = onSnapshot(salesQuery, (querySnapshot) => {
      const salesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductSale));
      setAssignedSales(salesData);
      setLoading(false);
    });
    
    // Fetch all customers once to show details. In a larger app, this might be optimized.
    const fetchCustomers = async () => {
        const customersSnap = await getDocs(collection(db, "customers"));
        setCustomers(customersSnap.docs.map(d => ({id: d.id, ...d.data()} as Customer)));
    };
    fetchCustomers();

    return () => salesUnsub();
  }, [user.id]);
  
  const handleMarkDelivered = async (saleId: string) => {
      try {
          await markAsDelivered(saleId);
          toast({
              title: "Delivery Completed",
              description: "Status updated successfully.",
              variant: "default",
              className: "bg-success text-success-foreground",
          });
      } catch (error: any) {
          toast({ variant: "destructive", title: "Update Failed", description: error.message });
      }
  };

  const handleStartRide = (customer: Customer) => {
    if (!customer.location) {
        toast({
            variant: "destructive",
            title: "Navigation Failed",
            description: "No location is available for this customer.",
        });
        return;
    }
    const { latitude, longitude } = customer.location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const getCustomerForSale = (customerId: string) => customers.find(c => c.id === customerId);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Truck /> My Delivery Tasks</CardTitle>
          <CardDescription>Here are the deliveries assigned to you. Mark them as delivered once completed.</CardDescription>
        </CardHeader>
      </Card>
      {assignedSales.length > 0 ? (
          assignedSales.map(sale => {
              const customer = getCustomerForSale(sale.customerId);
              return (
                <Card key={sale.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="flex items-center gap-2"><Package /> {sale.productName}</CardTitle>
                                <CardDescription>For: {sale.customerName}</CardDescription>
                            </div>
                            <Button size="sm" onClick={() => handleMarkDelivered(sale.id)}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark as Delivered
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2 text-sm">
                                <p className="font-semibold">Customer Details</p>
                                <p><strong>Name:</strong> {customer?.name}</p>
                                <p><strong>Address:</strong> {customer?.address}</p>
                                <p className="flex items-center gap-2">
                                    <Phone className="h-4 w-4" /> {customer?.contactInfo}
                                </p>
                                 <Badge variant="outline" className="capitalize">{sale.paymentMethod} Payment</Badge>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <p className="font-semibold text-sm">Delivery Location</p>
                                    {customer?.location && (
                                        <Button
                                            size="sm"
                                            className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/20 transition-all hover:shadow-accent/40"
                                            onClick={() => handleStartRide(customer)}
                                        >
                                            <Navigation className="mr-2 h-4 w-4" /> Start Ride
                                        </Button>
                                    )}
                                </div>
                                {customer?.location ? (
                                    <MapPicker 
                                        isDisplayOnly
                                        initialPosition={{ lat: customer.location.latitude, lng: customer.location.longitude }}
                                    />
                                ) : <p className="text-sm text-muted-foreground">No location provided.</p>}
                            </div>
                        </div>
                    </CardContent>
                </Card>
              )
          })
      ) : (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
                You have no pending deliveries.
            </CardContent>
          </Card>
      )}
    </div>
  );
};

export default DeliveryBoyDashboard;
