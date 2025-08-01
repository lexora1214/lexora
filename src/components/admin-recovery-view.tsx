
"use client";

import * as React from "react";
import { ArrowUpDown, Calendar as CalendarIcon, MoreHorizontal, TrendingUp, AlertTriangle } from "lucide-react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
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
import { addMonths, isPast, startOfMonth, endOfMonth, format } from "date-fns";
import { manuallyAddArrear, reassignRecoveryOfficer } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { DateRange } from "react-day-picker";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { DialogContent } from "@radix-ui/react-dialog";
import { Label } from "./ui/label";
import { LoaderCircle } from "lucide-react";


interface ReassignOfficerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  sale: SaleWithDetails;
  officers: User[];
}

const ReassignOfficerDialog: React.FC<ReassignOfficerDialogProps> = ({ isOpen, onOpenChange, sale, officers }) => {
    const [selectedOfficerId, setSelectedOfficerId] = React.useState<string>('');
    const [isLoading, setIsLoading] = React.useState(false);
    const { toast } = useToast();

    const handleReassign = async () => {
        if (!selectedOfficerId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select an officer.' });
            return;
        }
        setIsLoading(true);
        try {
            const officer = officers.find(o => o.id === selectedOfficerId);
            if (!officer) throw new Error("Selected officer not found.");
            await reassignRecoveryOfficer(sale.id, officer.id, officer.name);
            toast({ title: 'Officer Re-assigned', description: `${sale.productName} has been assigned to ${officer.name}.`, className: 'bg-success text-success-foreground' });
            onOpenChange(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Re-assign Recovery Officer</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <p>Customer: <span className="font-semibold">{sale.customerName}</span></p>
                    <p>Branch: <span className="font-semibold">{sale.customer?.branch}</span></p>
                    <div>
                        <Label htmlFor="officer-select">Select New Officer</Label>
                        <Select onValueChange={setSelectedOfficerId}>
                            <SelectTrigger id="officer-select">
                                <SelectValue placeholder="Select an officer..." />
                            </SelectTrigger>
                            <SelectContent>
                                {officers.length > 0 ? officers.map(officer => (
                                    <SelectItem key={officer.id} value={officer.id}>{officer.name} ({officer.branch || 'No Branch'})</SelectItem>
                                )) : <p className="p-2 text-sm text-muted-foreground">No recovery officers found.</p>}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleReassign} disabled={isLoading || !selectedOfficerId}>
                        {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/>}
                        Confirm Assignment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

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
  nextDueDate?: Date | null;
};

export default function AdminRecoveryView({ user, allProductSales, allCustomers, allUsers }: AdminRecoveryViewProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "saleDate", desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = React.useState(false);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = React.useState(false);
  const [selectedSale, setSelectedSale] = React.useState<SaleWithDetails | null>(null);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const { toast } = useToast();
  const [processingId, setProcessingId] = React.useState<string | null>(null);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const installmentSales = React.useMemo(() => {
    let sales = allProductSales
      .filter(p => p.paymentMethod === 'installments' && p.paidInstallments !== undefined && p.paidInstallments < p.installments!)
      .map(p => {
        const customer = allCustomers.find(c => c.id === p.customerId);
        let nextDueDate: Date | null = p.nextDueDateOverride ? new Date(p.nextDueDateOverride) : null;
        let isOverdue = false;

        if (nextDueDate && isPast(nextDueDate)) {
            isOverdue = true;
        }

        return {
          ...p,
          customer: customer,
          branch: customer?.branch,
          isOverdue,
          nextDueDate,
        };
      });
      
    if (dateRange && dateRange.from) {
        const from = dateRange.from;
        const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
        to.setHours(23, 59, 59, 999);
        
        sales = sales.filter(s => s.nextDueDate && new Date(s.nextDueDate) >= from && new Date(s.nextDueDate) <= to);
    }
      
    return sales.sort((a, b) => {
        const dateA = a.nextDueDate ? new Date(a.nextDueDate).getTime() : 0;
        const dateB = b.nextDueDate ? new Date(b.nextDueDate).getTime() : 0;
        return dateA - dateB;
    });

  }, [allProductSales, allCustomers, dateRange]);
  
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

  const handleReassignClick = React.useCallback((sale: SaleWithDetails) => {
    setSelectedSale(sale);
    setIsReassignDialogOpen(true);
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
        accessorKey: "tokenSerial",
        header: "Token Serial",
        cell: ({ row }) => {
            const tokenSerial = row.original.tokenSerial;
            return tokenSerial ? <Badge variant="outline" className="font-mono">{tokenSerial}</Badge> : 'N/A';
        }
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
              <DropdownMenuItem onClick={() => handleReassignClick(sale)}>
                  Re-assign Officer
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
                  </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [handleViewDetails, handleReassignClick, processingId]);

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
                        <span>Filter by due date</span>
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
      {selectedSale && (
        <ReassignOfficerDialog 
            isOpen={isReassignDialogOpen}
            onOpenChange={setIsReassignDialogOpen}
            sale={selectedSale}
            officers={recoveryOfficers}
        />
      )}
    </>
  );
}
