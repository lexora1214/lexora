
"use client";

import React, { useState, useMemo } from 'react';
import jsPDF from "jspdf";
import "jspdf-autotable";
import { ProductSale, Customer } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from './ui/button';
import { FileDown, LoaderCircle, TrendingUp, ChevronDown, FileSpreadsheet, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

interface ArrearsReportViewProps {
  allProductSales: ProductSale[];
  allCustomers: Customer[];
}

type ArrearsInfo = ProductSale & {
  customer?: Customer;
  amountDue: number;
  remainingBalance: number;
};

const ArrearsReportView: React.FC<ArrearsReportViewProps> = ({ allProductSales, allCustomers }) => {
  const [filter, setFilter] = useState('');
  const [minArrears, setMinArrears] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  const arrearsData = useMemo(() => {
    return allProductSales
      .filter(sale => sale.paymentMethod === 'installments' && sale.arrears && sale.arrears >= minArrears)
      .map(sale => {
        const customer = allCustomers.find(c => c.id === sale.customerId);
        const amountDue = (sale.arrears || 0) * (sale.monthlyInstallment || 0);
        const remainingInstallments = (sale.installments || 0) - (sale.paidInstallments || 0);
        const remainingBalance = remainingInstallments > 0 ? remainingInstallments * (sale.monthlyInstallment || 0) : 0;
        return { ...sale, customer, amountDue, remainingBalance };
      })
      .filter(item => {
        if (!filter) return true;
        const searchTerm = filter.toLowerCase();
        return item.customerName?.toLowerCase().includes(searchTerm) ||
               item.customer?.nic?.toLowerCase().includes(searchTerm) ||
               item.customer?.contactInfo?.includes(searchTerm);
      })
      .sort((a, b) => (b.arrears || 0) - (a.arrears || 0));
  }, [allProductSales, allCustomers, minArrears, filter]);
  
  const handleGeneratePdf = () => {
    if (arrearsData.length === 0) return;
    setIsGenerating(true);
    
    const doc = new jsPDF();
    const tableRows: any[] = [];
    const tableColumns = ["Customer Name", "Contact", "Product", "Token", "Arrears", "Amount Due (LKR)", "Remaining Bal (LKR)"];
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Arrears Report", 14, 22);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Report generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Showing customers with ${minArrears} or more missed installments.`, 14, 36);

    arrearsData.forEach(item => {
      const row = [
        item.customerName,
        item.customer?.contactInfo || 'N/A',
        item.productName,
        item.tokenSerial,
        item.arrears,
        { content: item.amountDue.toLocaleString(), styles: { halign: 'right' } },
        { content: item.remainingBalance.toLocaleString(), styles: { halign: 'right' } }
      ];
      tableRows.push(row);
    });
    
    (doc as any).autoTable({
        head: [tableColumns],
        body: tableRows,
        startY: 45,
        columnStyles: {
            4: { halign: 'center' },
            5: { halign: 'right' },
            6: { halign: 'right' },
        },
    });

    doc.save(`arrears_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    setIsGenerating(false);
  }

  const handleGenerateCsv = () => {
    if (arrearsData.length === 0) return;
    setIsGenerating(true);

    const headers = ["Customer Name", "Contact", "NIC", "Address", "Product", "Token Serial", "Arrears Count", "Arrears Amount Due (LKR)", "Remaining Balance (LKR)"];
    const csvRows = [headers.join(',')];

    arrearsData.forEach(item => {
        const row = [
            `"${item.customerName?.replace(/"/g, '""') || ''}"`,
            item.customer?.contactInfo || '',
            item.customer?.nic || '',
            `"${item.customer?.address?.replace(/"/g, '""') || ''}"`,
            `"${item.productName.replace(/"/g, '""')}"`,
            item.tokenSerial,
            item.arrears,
            item.amountDue,
            item.remainingBalance
        ];
        csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `arrears_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsGenerating(false);
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-destructive" />
                Customer Arrears Report
            </CardTitle>
            <CardDescription>A centralized view of all customers with missed installment payments.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={minArrears}
              onChange={(e) => setMinArrears(Number(e.target.value))}
              className="w-48"
              min="1"
            />
             <Input
              placeholder="Filter by customer..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-64"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={isGenerating || arrearsData.length === 0}>
                  {isGenerating ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/> : <FileDown className="mr-2 h-4 w-4"/>}
                  Generate Report
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
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-center">Arrears</TableHead>
                <TableHead className="text-right">Arrears Due</TableHead>
                <TableHead className="text-right">Remaining Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arrearsData.length > 0 ? (
                arrearsData.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.customerName}</div>
                      <div className="text-sm text-muted-foreground">{item.tokenSerial}</div>
                    </TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell>
                        {item.paidInstallments || 0} / {item.installments || 0}
                    </TableCell>
                    <TableCell className="text-center">
                        <Badge variant="destructive" className="text-base">
                            {item.arrears}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      LKR {item.amountDue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      LKR {item.remainingBalance.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No customers found with the selected arrears count.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ArrearsReportView;
