
"use client";

import * as React from "react";
import { ArrowUpDown, ChevronDown, MoreHorizontal, TrendingUp, AlertTriangle } from "lucide-react";
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import { Customer, User, ProductSale } from "@/types";
import { Badge } from "./ui/badge";
import CustomerDetailsDialog from "./customer-details-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Progress } from "./ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { addMonths, isPast } from "date-fns";
import { manuallyAddArrear } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AdminRecoveryViewProps {
  user: User;
  allProductSales: ProductSale[];
  allCustomers: Customer[];
  allUsers: User[];
}

type SaleWithDetails = ProductSale & {
  customer?: Customer;
  branch?: string;
  isOverdue?: boolean;
};

export default function AdminRecoveryView({ user, allProductSales, allCustomers, allUsers }: AdminRecoveryViewProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "saleDate", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const { toast } = useToast();
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const installmentSales = React.useMemo(() => {
    return allProductSales
      .filter(p => p.paymentMethod === 'installments')
      .map(p => {
        const customer = allCustomers.find(c => c.id === p.customerId);
        let isOverdue = false;
        if (p.installments && p.paidInstallments !== undefined && p.paidInstallments < p.installments) {
            const nextDueDate = p.nextDueDateOverride ? new Date(p.nextDueDateOverride) : addMonths(new Date(p.saleDate), p.paidInstallments + 1);
            if (isPast(nextDueDate)) {
                isOverdue = true;
            }
        }

        return {
          ...p,
          customer: customer,
          branch: customer?.branch,
          isOverdue,
        };
      })
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [allProductSales, allCustomers]);
  
  const recoveryOfficers = React.useMemo(() => {
    return allUsers.filter(u => u.role === 'Recovery Officer');
  }, [allUsers]);

  const branches = React.useMemo(() => {
    return Array.from(new Set(allUsers.map(u => u.branch).filter(Boolean))).sort();
  }, [allUsers]);

  const handleViewDetails = React.useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsDialogOpen(true);
  }, []);

  const handleMarkArrears = async (sale: ProductSale) => {
    setProcessingId(sale.id);
    try {
        await manuallyAddArrear(sale.id);
        toast({ title: "Arrear Marked", description: "The arrear has been recorded and the next due date updated."});
    } catch(error: any) {
        toast({ variant: "destructive", title: "Action Failed", description: error.message });
    } finally {
        setProcessingId(null);
    }
  }

  const columns = React.useMemo<ColumnDef<SaleWithDetails>[]>(() => [
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => {
        const sale = row.original;
        return (
          <div className="flex items-center gap-2">
            {sale.isOverdue && <AlertTriangle className="h-4 w-4 text-destructive" />}
            <div>
              <div className="font-medium">{sale.customerName}</div>
              <div className="text-xs text-muted-foreground">{sale.customer?.nic}</div>
            </div>
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
      accessorKey: "price",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Value <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const price = parseFloat(row.getValue("price"))
        const formatted = new Intl.NumberFormat("en-LK", {
          style: "currency",
          currency: "LKR",
        }).format(price)
 
        return <div className="font-medium">{formatted}</div>
      },
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
        id: "remainingBalance",
        header: "Remaining Balance",
        cell: ({ row }) => {
            const sale = row.original;
            if (!sale.installments || sale.paidInstallments === undefined || !sale.monthlyInstallment) return "N/A";
            const remainingBalance = (sale.installments - sale.paidInstallments) * sale.monthlyInstallment;
             const formatted = new Intl.NumberFormat("en-LK", {
                style: "currency",
                currency: "LKR",
            }).format(remainingBalance);
            return <div className="font-semibold">{formatted}</div>
        }
    },
    {
        accessorKey: 'arrears',
        header: 'Arrears',
        cell: ({ row }) => {
            const arrears = row.original.arrears || 0;
            if (arrears === 0) {
                return <span className="text-muted-foreground">-</span>;
            }
            return <Badge variant="destructive" className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3"/>{arrears}</Badge>;
        }
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleViewDetails(sale.customer!)}>
                  View Details
              </DropdownMenuItem>
              {sale.isOverdue && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                        onClick={() => handleMarkArrears(sale)} 
                        disabled={processingId === sale.id}
                        className="text-destructive focus:bg-destructive/10"
                    >
                        Mark as Arrears
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleViewDetails(sale.customer!)}>
                        Change Due Date
                    </DropdownMenuItem>
                  </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [handleViewDetails, processingId]);

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
            <div className="flex flex-col md:flex-row items-center gap-4 py-4">
                <Input
                    placeholder="Filter by customer name or NIC..."
                    value={(table.getColumn("customerName")?.getFilterValue() as string) ?? ""}
                    onChange={(event) => table.getColumn("customerName")?.setFilterValue(event.target.value)}
                    className="max-w-sm"
                />
                 <Select
                  value={(table.getColumn("branch")?.getFilterValue() as string) || "all"}
                  onValueChange={(value) => table.getColumn("branch")?.setFilterValue(value === "all" ? "" : value)}
                 >
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Filter by branch..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Branches</SelectItem>
                      {branches.map(branch => (
                        <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                      ))}
                    </SelectContent>
                </Select>
                 <Select
                    value={(table.getColumn("recoveryOfficerName")?.getFilterValue() as string) || "all"}
                    onValueChange={(value) => table.getColumn("recoveryOfficerName")?.setFilterValue(value === "all" ? "" : value)}
                 >
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Filter by officer..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Officers</SelectItem>
                      {recoveryOfficers.map(officer => (
                        <SelectItem key={officer.id} value={officer.name}>{officer.name}</SelectItem>
                      ))}
                    </SelectContent>
                </Select>
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
                        <TableRow key={row.id} className={cn(row.original.isOverdue && "bg-destructive/10")}>
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
