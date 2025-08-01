
"use client";

import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { User, IncomeRecord } from "@/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoaderCircle, FileDown, Calendar as CalendarIcon } from "lucide-react";
import { getIncomeRecordsForUser } from "@/lib/firestore";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface UserIncomeDetailsDialogProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const UserIncomeDetailsDialog: React.FC<UserIncomeDetailsDialogProps> = ({ user, isOpen, onOpenChange }) => {
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

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
    } else {
        // Reset date range when dialog is closed or user changes
        setDateRange({
          from: startOfMonth(new Date()),
          to: endOfMonth(new Date()),
        });
    }
  }, [isOpen, user]);

  const filteredRecords = React.useMemo(() => {
    if (!dateRange || !dateRange.from) {
      return records;
    }
    const from = dateRange.from;
    const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
    to.setHours(23, 59, 59, 999);

    return records.filter(record => {
      const saleDate = new Date(record.saleDate);
      return saleDate >= from && saleDate <= to;
    });
  }, [records, dateRange]);

  const getSourceTypeInfo = (sourceType: 'token_sale' | 'product_sale' | 'salary' | undefined) => {
    switch (sourceType) {
        case 'product_sale':
            return { text: 'Product Sale', variant: 'default' as const };
        case 'token_sale':
            return { text: 'Token Sale', variant: 'secondary' as const };
        case 'salary':
            return { text: 'Salary', variant: 'success' as const };
        default:
            return { text: 'Unknown', variant: 'outline' as const };
    }
  };

  const handleGeneratePdf = () => {
    if (!user || filteredRecords.length === 0) return;

    const doc = new jsPDF();
    const tableRows: any[] = [];
    const tableColumns = ["Date", "Source", "Details", "Role Granted", "Amount (LKR)"];
    
    const totalIncome = filteredRecords.reduce((sum, record) => sum + record.amount, 0);

    filteredRecords.forEach(record => {
      let detailText = "";
       if (record.sourceType === 'product_sale') {
          detailText = `${record.productName || 'Product'} for ${record.customerName}. Sale by: ${record.shopManagerName || 'N/A'}`;
          if (record.installmentNumber) {
            detailText += ` (Installment #${record.installmentNumber})`;
          }
      } else if (record.sourceType === 'token_sale') {
          detailText = `Token Sale for ${record.customerName}. Sale by: ${record.salesmanName || 'N/A'}`;
      } else if (record.sourceType === 'salary') {
          detailText = `Monthly salary for ${format(new Date(record.saleDate), 'MMMM yyyy')}`;
      }

      const recordData = [
        new Date(record.saleDate).toLocaleDateString(),
        getSourceTypeInfo(record.sourceType).text,
        detailText,
        record.grantedForRole,
        record.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      ];
      tableRows.push(recordData);
    });

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Lexora", 14, 22);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Income Report for ${user.name} (${user.role})`, 14, 30);
    
    doc.setFontSize(10);
    const dateSuffix = dateRange?.from ? `Period: ${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to ?? dateRange.from, "LLL dd, y")}` : 'Period: All Time';
    doc.text(dateSuffix, 14, 36);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 42);

    (doc as any).autoTable({
      head: [tableColumns],
      body: tableRows,
      startY: 50,
      columnStyles: {
        4: { halign: 'right' },
      },
      foot: [
        [{ content: 'Total Income', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', textColor: '#000' } }, { content: `LKR ${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, styles: { halign: 'right', fontStyle: 'bold', textColor: '#000' } }]
      ],
      footStyles: { fillColor: [239, 241, 245] }
    });

    const fileNameDateSuffix = dateRange?.from ? `_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to ?? dateRange.from, "yyyy-MM-dd")}` : '_all-time';
    doc.save(`income_report_${user.name.replace(/\s+/g, '_')}${fileNameDateSuffix}.pdf`);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Income Records for {user?.name}</DialogTitle>
          <DialogDescription>
            Role: {user?.role}. A detailed history of all commissions earned by this user.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-2">
            <Popover>
              <PopoverTrigger asChild>
              <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                  "w-full justify-start text-left font-normal md:w-[300px]",
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
                  <span>Filter by date (All time)</span>
                  )}
              </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
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
        </div>

        <div className="max-h-[50vh] overflow-y-auto pr-4">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRecords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Role Granted</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => {
                   const sourceTypeInfo = getSourceTypeInfo(record.sourceType);
                   let detailTitle = '';
                   let detailSubtitle = '';

                   switch (record.sourceType) {
                       case 'product_sale':
                           detailTitle = record.productName || 'Product';
                           detailSubtitle = `Sale by: ${record.shopManagerName || 'N/A'}`;
                           break;
                       case 'token_sale':
                           detailTitle = `Token for ${record.customerName}`;
                           detailSubtitle = `Sale by: ${record.salesmanName || 'N/A'}`;
                           break;
                       case 'salary':
                           detailTitle = 'Monthly Salary';
                           detailSubtitle = `For ${format(new Date(record.saleDate), 'MMMM yyyy')}`;
                           break;
                   }
                  
                  return (
                    <TableRow key={record.id}>
                      <TableCell>{new Date(record.saleDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                          <Badge variant={sourceTypeInfo.variant}>
                              {sourceTypeInfo.text}
                          </Badge>
                      </TableCell>
                      <TableCell>
                          <div className="text-sm">
                              <p className="font-medium">{detailTitle}</p>
                              <p className="text-muted-foreground">{detailSubtitle}</p>
                              {record.installmentNumber && <Badge variant="default" className="mt-1">Installment #{record.installmentNumber}</Badge>}
                          </div>
                      </TableCell>
                      <TableCell>
                          <Badge variant="outline">{record.grantedForRole}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        LKR {record.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-muted-foreground py-10">
              No income records found for this user in the selected period.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleGeneratePdf} disabled={loading || filteredRecords.length === 0}>
            <FileDown className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserIncomeDetailsDialog;
