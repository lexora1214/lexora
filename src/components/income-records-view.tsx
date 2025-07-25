
"use client";

import React, { useEffect, useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { User, IncomeRecord } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, Calendar as CalendarIcon, CreditCard, LoaderCircle, ShoppingBag, User as UserIcon, FileDown, Award, Wallet, ChevronDown, FileSpreadsheet, FileText, MinusCircle } from "lucide-react";
import { getIncomeRecordsForUser } from "@/lib/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  getPaginationRowModel,
} from "@tanstack/react-table";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

interface IncomeRecordsViewProps {
  user: User;
}

const IncomeRecordsView: React.FC<IncomeRecordsViewProps> = ({ user }) => {
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      const incomeData = await getIncomeRecordsForUser(user.id);
      setRecords(incomeData);
      setLoading(false);
    };
    fetchRecords();
  }, [user.id]);

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
  
  const columns: ColumnDef<IncomeRecord>[] = [
    {
        accessorKey: "saleDate",
        header: ({ column }) => (
            <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
                Date
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => new Date(row.getValue("saleDate")).toLocaleDateString(),
    },
    {
        accessorKey: "amount",
        header: ({ column }) => (
            <div className="text-right">
                <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="w-full justify-end">
                    Amount
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            </div>
        ),
        cell: ({ row }) => {
            const record = row.original;
            const isExpense = record.sourceType === 'expense';
            const amount = parseFloat(row.getValue("amount"));
            const formatted = new Intl.NumberFormat("en-LK", {
                style: "currency",
                currency: "LKR",
            }).format(amount);
            return <div className={cn("text-right font-medium", isExpense && "text-destructive")}>{isExpense ? `- ${formatted}` : formatted}</div>;
        },
    },
    {
        accessorKey: 'sourceType',
        header: 'Source',
        cell: ({row}) => {
            const record = row.original;
            let badgeText: string;
            let badgeVariant: 'default' | 'secondary' | 'success' | 'destructive' | 'outline' = 'secondary';

            switch (record.sourceType) {
                case 'product_sale':
                    badgeText = 'Product Sale';
                    badgeVariant = 'default';
                    break;
                case 'token_sale':
                    badgeText = 'Token Sale';
                    badgeVariant = 'secondary';
                    break;
                case 'salary':
                    badgeText = 'Salary';
                    badgeVariant = 'success';
                    break;
                case 'incentive':
                    badgeText = 'Incentive';
                    badgeVariant = 'destructive';
                    break;
                case 'expense':
                    badgeText = 'Expense';
                    badgeVariant = 'destructive';
                    break;
                default:
                    badgeText = 'Unknown';
            }
            return <Badge variant={badgeVariant}>{badgeText}</Badge>
        }
    },
    {
        id: "details",
        header: "Details",
        cell: ({ row }) => {
            const record = row.original;
            switch (record.sourceType) {
                case 'product_sale':
                    return (
                        <div>
                            <p className="font-medium">{record.productName}</p>
                            <p className="text-sm text-muted-foreground">
                                LKR {record.productPrice?.toLocaleString()} ({record.paymentMethod}) for {record.customerName}
                            </p>
                            <div className="flex gap-2 items-center mt-1">
                              {record.installmentNumber && <Badge variant="default">Installment #{record.installmentNumber}</Badge>}
                              {record.tokenSerial && <Badge variant="outline" className="font-mono">{record.tokenSerial}</Badge>}
                            </div>
                        </div>
                    );
                case 'token_sale':
                    return (
                         <div>
                            <p className="font-medium">Token Sale</p>
                            <p className="text-sm text-muted-foreground">For customer: {record.customerName}</p>
                            {record.tokenSerial && <Badge variant="outline" className="mt-1 font-mono">{record.tokenSerial}</Badge>}
                        </div>
                    )
                case 'salary':
                     return (
                        <div>
                            <p className="font-medium">Monthly Salary</p>
                            <p className="text-sm text-muted-foreground">For {format(new Date(record.saleDate), 'MMMM yyyy')}</p>
                        </div>
                    );
                case 'incentive':
                    return (
                        <div>
                            <p className="font-medium">Monthly Incentive</p>
                            <p className="text-sm text-muted-foreground">For {format(new Date(record.saleDate), 'MMMM yyyy')} Target</p>
                        </div>
                    );
                case 'expense':
                    return (
                        <div>
                            <p className="font-medium">{record.expenseDescription}</p>
                            <p className="text-sm text-muted-foreground">Added by: {record.managerName}</p>
                        </div>
                    );
                default:
                    return null;
            }
        },
    },
    {
        id: "originalSaleBy",
        header: "Original Sale By",
        cell: ({ row }) => {
            const record = row.original;
            switch(record.sourceType) {
                case 'product_sale':
                    return record.shopManagerName || 'N/A';
                case 'token_sale':
                    return record.salesmanName;
                case 'salary':
                    return 'System Payroll';
                case 'incentive':
                    return 'System Payroll';
                case 'expense':
                    return 'N/A';
                default:
                    return 'N/A'
            }
        },
    },
];

  const table = useReactTable({
    data: filteredRecords,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 10 },
      sorting: [{ id: 'saleDate', desc: true }],
    },
  });
  
  const getSourceTypeInfo = (sourceType: 'token_sale' | 'product_sale' | 'salary' | 'incentive' | 'expense' | undefined) => {
    switch (sourceType) {
        case 'product_sale':
            return { text: 'Product Sale', variant: 'default' as const };
        case 'token_sale':
            return { text: 'Token Sale', variant: 'secondary' as const };
        case 'salary':
            return { text: 'Salary', variant: 'success' as const };
        case 'incentive':
            return { text: 'Incentive', variant: 'destructive' as const };
        case 'expense':
            return { text: 'Expense', variant: 'destructive' as const };
        default:
            return { text: 'Unknown', variant: 'outline' as const };
    }
  };

  const getDetailText = (record: IncomeRecord) => {
    if (record.sourceType === 'product_sale') {
        let text = `${record.productName || 'Product'} for ${record.customerName}. Sale by: ${record.shopManagerName || 'N/A'}`;
        if (record.installmentNumber) {
            text += ` (Installment #${record.installmentNumber})`;
        }
        return text;
    } else if (record.sourceType === 'token_sale') {
        return `Token Sale for ${record.customerName}. Sale by: ${record.salesmanName || 'N/A'}`;
    } else if (record.sourceType === 'salary') {
        return `Monthly salary for ${format(new Date(record.saleDate), 'MMMM yyyy')}`;
    } else if (record.sourceType === 'incentive') {
        return `Incentive for ${format(new Date(record.saleDate), 'MMMM yyyy')} target`;
    } else if (record.sourceType === 'expense') {
        return `${record.expenseDescription}. Added by: ${record.managerName || 'N/A'}`;
    }
    return 'N/A';
  };

  const handleGeneratePdf = () => {
    if (!user || filteredRecords.length === 0) return;

    const doc = new jsPDF();
    const tableRows: any[] = [];
    const tableColumns = ["Date", "Source", "Details", "Role Granted", "Amount (LKR)"];

    const totalIncome = filteredRecords.reduce((sum, record) => {
        return record.sourceType === 'expense' ? sum - record.amount : sum + record.amount;
    }, 0);

    filteredRecords.forEach(record => {
      const isExpense = record.sourceType === 'expense';
      const amount = record.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const recordData = [
        new Date(record.saleDate).toLocaleDateString(),
        getSourceTypeInfo(record.sourceType).text,
        getDetailText(record),
        record.grantedForRole,
        { content: isExpense ? `- ${amount}` : amount, styles: { textColor: isExpense ? '#dc2626' : '#000' } }
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
    doc.save(`my_income_report${fileNameDateSuffix}.pdf`);
  };

  const handleGenerateCsv = () => {
    if (!user || filteredRecords.length === 0) return;

    const totalIncome = filteredRecords.reduce((sum, record) => {
        return record.sourceType === 'expense' ? sum - record.amount : sum + record.amount;
    }, 0);

    const csvHeader = "Date,Source,Details,Role Granted,Amount (LKR)\n";
    const csvRows = filteredRecords.map(record => {
        const date = new Date(record.saleDate).toLocaleDateString();
        const source = getSourceTypeInfo(record.sourceType).text;
        const details = `"${getDetailText(record).replace(/"/g, '""')}"`;
        const role = record.grantedForRole;
        const amount = record.sourceType === 'expense' ? -record.amount : record.amount;
        return `${date},${source},${details},${role},${amount.toFixed(2)}`;
    }).join("\n");
    
    const csvFooter = `\n,,,Total,${totalIncome.toFixed(2)}`;
    const csvContent = csvHeader + csvRows + csvFooter;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const dateSuffix = dateRange?.from ? `_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to ?? dateRange.from, "yyyy-MM-dd")}` : '_all-time';
    link.setAttribute("download", `my_income_report${dateSuffix}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
            <CardTitle>My Income Records</CardTitle>
            <CardDescription>A detailed history of all commissions you have earned.</CardDescription>
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
                    <span>Filter by date (All time)</span>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={loading || filteredRecords.length === 0}>
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
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop Table View */}
        <div className="hidden rounded-md border md:block">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No records found for the selected period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="grid gap-4 md:hidden">
            {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                    const record = row.original;
                    const sourceTypeInfo = getSourceTypeInfo(record.sourceType);
                    const isExpense = record.sourceType === 'expense';
                    
                    let detailTitle = '';
                    let detailSubtitle = '';
                    let Icon = ShoppingBag;

                    switch (record.sourceType) {
                        case 'product_sale':
                            detailTitle = record.productName || 'Product';
                            detailSubtitle = `for ${record.customerName}`;
                            Icon = ShoppingBag;
                            break;
                        case 'token_sale':
                            detailTitle = 'Token Sale';
                            detailSubtitle = `for ${record.customerName}`;
                            Icon = CreditCard;
                            break;
                        case 'salary':
                            detailTitle = 'Monthly Salary';
                            detailSubtitle = `For ${format(new Date(record.saleDate), 'MMMM yyyy')}`;
                            Icon = Wallet;
                            break;
                         case 'incentive':
                            detailTitle = 'Monthly Incentive';
                            detailSubtitle = `For ${format(new Date(record.saleDate), 'MMMM yyyy')}`;
                            Icon = Award;
                            break;
                         case 'expense':
                            detailTitle = record.expenseDescription || 'Expense';
                            detailSubtitle = `Added by: ${record.managerName}`;
                            Icon = MinusCircle;
                            break;
                    }

                    return (
                        <Card key={record.id} className="p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className={cn("font-bold text-lg", isExpense ? "text-destructive" : "text-primary")}>
                                      {isExpense ? '-' : ''} LKR {record.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                    <Badge variant={sourceTypeInfo.variant}>
                                        {sourceTypeInfo.text}
                                    </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                    {new Date(record.saleDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="border-t pt-3 space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Icon className={cn("w-4 h-4", isExpense ? "text-destructive/80" : "text-primary/80")}/>
                                    <p><span className="font-medium text-card-foreground">{detailTitle}</span> {detailSubtitle}</p>
                                </div>
                                {record.installmentNumber && (
                                    <div className="flex items-center gap-2">
                                        <Badge variant="default">Installment #{record.installmentNumber}</Badge>
                                    </div>
                                )}
                                {record.tokenSerial && record.sourceType === 'token_sale' && (
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-primary/80"/>
                                        <Badge variant="outline" className="font-mono">{record.tokenSerial}</Badge>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )
                })
            ) : (
                <div className="text-center text-muted-foreground py-10">
                    No records found for the selected period.
                </div>
            )}
        </div>
        
        {filteredRecords.length > table.getState().pagination.pageSize && (
            <div className="flex items-center justify-end space-x-2 py-4">
            <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
            >
                Previous
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
            >
                Next
            </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IncomeRecordsView;
