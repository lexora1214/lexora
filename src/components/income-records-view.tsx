"use client";

import React, { useEffect, useState } from "react";
import { User, IncomeRecord } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, Calendar as CalendarIcon, CreditCard, LoaderCircle, ShoppingBag, User as UserIcon } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "./ui/calendar";

interface IncomeRecordsViewProps {
  user: User;
}

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
            const amount = parseFloat(row.getValue("amount"));
            const formatted = new Intl.NumberFormat("en-LK", {
                style: "currency",
                currency: "LKR",
            }).format(amount);
            return <div className="text-right font-medium">{formatted}</div>;
        },
    },
    {
        accessorKey: 'sourceType',
        header: 'Source',
        cell: ({row}) => {
            const sourceType = row.original.sourceType;
            return <Badge variant={sourceType === 'product_sale' ? 'default' : 'secondary'}>{sourceType === 'product_sale' ? 'Product Sale' : 'Token Sale'}</Badge>
        }
    },
    {
        id: "details",
        header: "Details",
        cell: ({ row }) => {
            const record = row.original;
            if (record.sourceType === 'product_sale') {
                return (
                    <div>
                        <p className="font-medium">{record.productName}</p>
                        <p className="text-sm text-muted-foreground">
                            LKR {record.productPrice?.toLocaleString()} ({record.paymentMethod}) for {record.customerName}
                        </p>
                        {record.tokenSerial && <Badge variant="outline" className="mt-1 font-mono">{record.tokenSerial}</Badge>}
                    </div>
                );
            }
            return (
                 <div>
                    <p className="font-medium">Token Sale</p>
                    <p className="text-sm text-muted-foreground">For customer: {record.customerName}</p>
                    {record.tokenSerial && <Badge variant="outline" className="mt-1 font-mono">{record.tokenSerial}</Badge>}
                </div>
            )
        },
    },
    {
        id: "originalSaleBy",
        header: "Original Sale By",
        cell: ({ row }) => {
            const record = row.original;
            if (record.sourceType === 'product_sale') {
                return record.shopManagerName || 'N/A';
            }
            return record.salesmanName;
        },
    },
];

const IncomeRecordsView: React.FC<IncomeRecordsViewProps> = ({ user }) => {
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

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
                <span>Pick a date range</span>
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
                    const isProductSale = record.sourceType === 'product_sale';
                    return (
                        <Card key={record.id} className="p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg text-primary">LKR {record.amount.toLocaleString()}</p>
                                    <Badge variant={isProductSale ? 'default' : 'secondary'}>
                                        {isProductSale ? 'Product Sale' : 'Token Sale'}
                                    </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                                    <CalendarIcon className="w-3.5 h-3.5" />
                                    {new Date(record.saleDate).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="border-t pt-3 space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <ShoppingBag className="w-4 h-4 text-primary/80"/>
                                    <p><span className="font-medium text-card-foreground">{isProductSale ? record.productName : 'Token Sale'}</span> for {record.customerName}</p>
                                </div>
                                {record.tokenSerial && (
                                    <div className="flex items-center gap-2">
                                        <CreditCard className="w-4 h-4 text-primary/80"/>
                                        <Badge variant="outline" className="font-mono">{record.tokenSerial}</Badge>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <UserIcon className="w-4 h-4 text-primary/80"/>
                                    <p>Sale by: {isProductSale ? record.shopManagerName : record.salesmanName}</p>
                                </div>
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
