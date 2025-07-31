
"use client";

import * as React from "react";
import { ArrowUpDown, ChevronDown, MoreHorizontal } from "lucide-react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Customer, User, ProductSale } from "@/types";
import { Badge } from "./ui/badge";
import CustomerDetailsDialog from "./customer-details-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";

interface AdminRecoveryViewProps {
  user: User;
  allProductSales: ProductSale[];
  allCustomers: Customer[];
  allUsers: User[];
}

type SaleWithDetails = ProductSale & {
  customer?: Customer;
};

export default function AdminRecoveryView({ user, allProductSales, allCustomers, allUsers }: AdminRecoveryViewProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "saleDate", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);

  const installmentSales = React.useMemo(() => {
    return allProductSales
      .filter(p => p.paymentMethod === 'installments')
      .map(p => ({
        ...p,
        customer: allCustomers.find(c => c.id === p.customerId),
      }))
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [allProductSales, allCustomers]);

  const handleViewDetails = React.useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsDialogOpen(true);
  }, []);

  const columns = React.useMemo<ColumnDef<SaleWithDetails>[]>(() => [
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => {
        const sale = row.original;
        return (
          <div>
            <div className="font-medium">{sale.customerName}</div>
            <div className="text-xs text-muted-foreground">{sale.customer?.nic}</div>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        const name = row.original.customerName?.toLowerCase() || '';
        const nic = row.original.customer?.nic?.toLowerCase() || '';
        const searchValue = String(value).toLowerCase();
        return name.includes(searchValue) || nic.includes(searchValue);
      },
    },
    {
      accessorKey: "productName",
      header: "Product",
    },
    {
      accessorKey: "saleDate",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Sale Date <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.getValue("saleDate")).toLocaleDateString(),
    },
    {
        id: "progress",
        header: "Installment Progress",
        cell: ({ row }) => {
            const sale = row.original;
            if (!sale.installments || sale.paidInstallments === undefined) return null;
            const progress = (sale.paidInstallments / sale.installments) * 100;
            return (
                <div className="w-[150px]">
                    <Progress value={progress} className="h-2" />
                    <div className="text-xs text-muted-foreground mt-1">
                        {sale.paidInstallments} / {sale.installments} paid
                    </div>
                </div>
            )
        }
    },
    {
      accessorKey: "recoveryStatus",
      header: "Recovery Status",
      cell: ({ row }) => {
        const status = row.getValue("recoveryStatus") as string;
        return <Badge variant={status === 'assigned' ? "default" : "secondary"} className="capitalize">{status || 'pending'}</Badge>;
      },
    },
    {
        accessorKey: "recoveryOfficerName",
        header: "Assigned To",
        cell: ({ row }) => row.original.recoveryOfficerName || 'N/A'
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const sale = row.original;
        if (!sale.customer) return null;
        return (
            <Button variant="outline" size="sm" onClick={() => handleViewDetails(sale.customer!)}>
              View Details
            </Button>
        );
      },
    },
  ], [handleViewDetails]);

  const table = useReactTable({
    data: installmentSales,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { sorting, columnFilters },
  });

  const productSalesForSelectedCustomer = React.useMemo(() => {
    if (!selectedCustomer) return [];
    return allProductSales
      .filter(p => p.customerId === selectedCustomer.id)
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [selectedCustomer, allProductSales]);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Global Recovery Management</CardTitle>
          <CardDescription>A complete overview of all installment sales and their recovery status.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex items-center py-4">
                <Input
                    placeholder="Filter by customer name or NIC..."
                    value={(table.getColumn("customerName")?.getFilterValue() as string) ?? ""}
                    onChange={(event) => table.getColumn("customerName")?.setFilterValue(event.target.value)}
                    className="max-w-sm"
                />
            </div>
            <div className="rounded-md border">
                <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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
                        No results.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
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
        </CardContent>
      </Card>
      <CustomerDetailsDialog
        isOpen={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        customer={selectedCustomer}
        productSales={productSalesForSelectedCustomer}
        allUsers={allUsers}
        currentUser={user}
      />
    </>
  );
}
