"use client";

import React, { useEffect, useState } from "react";
import { User, IncomeRecord } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoaderCircle } from "lucide-react";
import { getIncomeRecordsForUser } from "@/lib/firestore";
import { Badge } from "./ui/badge";

interface UserIncomeDetailsDialogProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const UserIncomeDetailsDialog: React.FC<UserIncomeDetailsDialogProps> = ({ user, isOpen, onOpenChange }) => {
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      const fetchRecords = async () => {
        setLoading(true);
        try {
            const incomeData = await getIncomeRecordsForUser(user.id);
            setRecords(incomeData);
        } catch (error) {
            console.error("Failed to fetch income records:", error);
            setRecords([]);
        } finally {
            setLoading(false);
        }
      };
      fetchRecords();
    }
  }, [isOpen, user]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Income Records for {user?.name}</DialogTitle>
          <DialogDescription>
            A detailed history of all commissions earned by this user.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-4">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{new Date(record.saleDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                        <Badge variant={record.sourceType === 'product_sale' ? 'default' : 'secondary'}>
                            {record.sourceType === 'product_sale' ? 'Product' : 'Token'}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        <div className="text-sm">
                            <p className="font-medium">{record.sourceType === 'product_sale' ? record.productName : `Token for ${record.customerName}`}</p>
                            <p className="text-muted-foreground">Sale by: {record.sourceType === 'product_sale' ? record.shopManagerName : record.salesmanName}</p>
                        </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      LKR {record.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-muted-foreground py-10">
              No income records found for this user.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserIncomeDetailsDialog;
