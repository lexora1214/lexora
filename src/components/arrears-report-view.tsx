
"use client";

import React, { useState, useMemo } from 'react';
import jsPDF from "jspdf";
import "jspdf-autotable";
import { ProductSale, Customer } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from './ui/button';
import { FileDown, LoaderCircle, TrendingUp } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { Badge } from './ui/badge';

interface ArrearsReportViewProps {
  allProductSales: ProductSale[];
  allCustomers: Customer[];
}

type ArrearsInfo = ProductSale & {
  customer?: Customer;
  amountDue: number;
};

const ArrearsReportView: React.FC<ArrearsReportViewProps> = ({ allProductSales, allCustomers }) => {
  const [filter, setFilter] = useState('');
  const [minArrears, setMinArrears] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  const arrearsData = useMemo(() => {
    return allProductSales
      .filter(sale => sale.arrears && sale.arrears >= minArrears)
      .map(sale => {
        const customer = allCustomers.find(c => c.id === sale.customerId);
        const amountDue = (sale.arrears || 0) * (sale.monthlyInstallment || 0);
        return { ...sale, customer, amountDue };
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
    const tableColumns = ["Customer Name", "Contact", "Address", "Product", "Arrears", "Amount Due (LKR)"];
    
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
        item.customer?.address || 'N/A',
        item.productName,
        item.arrears,
        { content: item.amountDue.toLocaleString(), styles: { halign: 'right' } }
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
        },
    });

    doc.save(`arrears_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    setIsGenerating(false);
  }

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
            <Button onClick={handleGeneratePdf} disabled={isGenerating || arrearsData.length === 0}>
                {isGenerating ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/> : <FileDown className="mr-2 h-4 w-4"/>}
                Generate Report
            </Button>
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
                <TableHead className="text-center">Arrears Count</TableHead>
                <TableHead className="text-right">Amount Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {arrearsData.length > 0 ? (
                arrearsData.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.customerName}</div>
                      <div className="text-sm text-muted-foreground">{item.customer?.nic}</div>
                    </TableCell>
                    <TableCell>{item.productName}</TableCell>
                    <TableCell className="text-center">
                        <Badge variant="destructive" className="text-base">
                            {item.arrears}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      LKR {item.amountDue.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
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
