
"use client";

import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { LoaderCircle, User, Users, FileDown, ChevronDown, FileSpreadsheet, FileText } from "lucide-react";
import { IncomeRecord, MonthlySalaryPayout } from "@/types";
import { getIncomeRecordsForPayout } from "@/lib/firestore";
import { format } from "date-fns";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

interface PayoutDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  payout: MonthlySalaryPayout;
}

const PayoutDetailsDialog: React.FC<PayoutDetailsDialogProps> = ({
  isOpen,
  onOpenChange,
  payout,
}) => {
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && payout) {
      setLoading(true);
      getIncomeRecordsForPayout(payout.id)
        .then(setRecords)
        .catch(err => {
          console.error("Failed to fetch payout records:", err);
          setRecords([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, payout]);
  
  const handleGeneratePdf = () => {
    if (!payout || records.length === 0) return;

    const doc = new jsPDF();
    const tableRows: any[] = [];
    const tableColumns = ["Employee", "Role", "Amount Paid (LKR)"];

    records.forEach(record => {
      const recordData = [
        record.salesmanName,
        record.grantedForRole,
        { content: record.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right' } }
      ];
      tableRows.push(recordData);
    });

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Lexora - Payout Details", 14, 22);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Payout Date: ${format(new Date(payout.payoutDate), "PPP p")}`, 14, 30);
    doc.text(`Processed by: ${payout.processedByName}`, 14, 36);

    (doc as any).autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: 45,
      columnStyles: {
        2: { halign: 'right' },
      },
      foot: [
        [{ content: 'Total Payout', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `LKR ${payout.totalAmountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, styles: { halign: 'right', fontStyle: 'bold' } }]
      ],
      footStyles: { fillColor: [239, 241, 245] }
    });

    doc.save(`payout_report_${format(new Date(payout.payoutDate), "yyyy-MM-dd")}.pdf`);
  };
  
  const handleGenerateCsv = () => {
      if (!payout || records.length === 0) return;

      const csvHeader = "Employee,Role,Amount Paid (LKR)\n";
      const csvRows = records.map(record => {
          const employee = `"${record.salesmanName.replace(/"/g, '""')}"`;
          const role = record.grantedForRole;
          const amount = record.amount.toFixed(2);
          return `${employee},${role},${amount}`;
      }).join("\n");
      
      const csvFooter = `\nTotal,,${payout.totalAmountPaid.toFixed(2)}`;
      const csvContent = csvHeader + csvRows + csvFooter;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `payout_report_${format(new Date(payout.payoutDate), "yyyy-MM-dd")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payout Details</DialogTitle>
          <DialogDescription>
            Showing details for the payout on {format(new Date(payout.payoutDate), "PPP p")}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 text-sm mt-4">
            <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Processed by:</span>
                <span className="font-semibold">{payout.processedByName}</span>
            </div>
            <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Total Users Paid:</span>
                <span className="font-semibold">{payout.totalUsersPaid}</span>
            </div>
             {payout.isReversed && (
                <div className="col-span-2">
                     <Badge variant="destructive" className="w-full justify-center p-2">
                        Reversed on {format(new Date(payout.reversalDate!), "PPP")} by {payout.reversedByName}
                    </Badge>
                </div>
            )}
        </div>
        <ScrollArea className="h-[50vh] pr-4 mt-2">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Amount Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.salesmanName}</TableCell>
                      <TableCell>{record.grantedForRole}</TableCell>
                      <TableCell className="text-right font-mono">
                        LKR {record.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="text-right font-bold text-base">
                      Total Payout
                    </TableCell>
                    <TableCell className="text-right font-bold text-base font-mono">
                      LKR {payout.totalAmountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </ScrollArea>
        <DialogFooter className="border-t pt-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={loading || records.length === 0}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Download
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleGenerateCsv}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  <span>Export as CSV</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleGeneratePdf}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Export as PDF</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PayoutDetailsDialog;
