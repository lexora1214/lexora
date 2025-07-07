"use client";

import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { User, IncomeRecord } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoaderCircle, FileDown } from "lucide-react";
import { getIncomeRecordsForUser } from "@/lib/firestore";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

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

  const handleGeneratePdf = () => {
    if (!user || records.length === 0) return;

    const doc = new jsPDF();
    const tableRows: any[] = [];
    const tableColumns = ["Date", "Source", "Details", "Amount (LKR)"];

    records.forEach(record => {
      let detailText = "";
      if (record.sourceType === 'product_sale') {
          detailText = `${record.productName || 'Product'} for ${record.customerName}. Sale by: ${record.shopManagerName || 'N/A'}`;
      } else {
          detailText = `Token Sale for ${record.customerName}. Sale by: ${record.salesmanName || 'N/A'}`;
      }

      const recordData = [
        new Date(record.saleDate).toLocaleDateString(),
        record.sourceType === 'product_sale' ? 'Product' : 'Token',
        detailText,
        record.amount.toLocaleString(),
      ];
      tableRows.push(recordData);
    });

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(`Income Report for ${user.name}`, 14, 22);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    (doc as any).autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: 40,
      styles: {
        cellPadding: 2,
        fontSize: 8,
      },
      headStyles: {
        fillColor: [34, 139, 34], // Forest Green
        fontSize: 9,
      },
      columnStyles: {
        3: { halign: 'right' },
      }
    });

    doc.save(`income_report_${user.name.replace(/\s+/g, '_')}.pdf`);
  };


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
        <DialogFooter>
          <Button onClick={handleGeneratePdf} disabled={loading || records.length === 0}>
            <FileDown className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserIncomeDetailsDialog;
