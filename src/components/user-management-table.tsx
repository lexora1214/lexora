
"use client";

import * as React from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { ArrowUpDown, ChevronDown, MoreHorizontal, Calendar as CalendarIcon, FileDown, FileSpreadsheet, FileText } from "lucide-react";
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
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User, IncomeRecord, Role } from "@/types";
import { Badge } from "./ui/badge";
import EditUserDialog from "./edit-user-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { cn } from "@/lib/utils";

interface UserManagementTableProps {
  data: User[];
  allIncomeRecords: IncomeRecord[];
}

type UserWithPeriodIncome = User & { periodIncome: number };

export default function UserManagementTable({ data, allIncomeRecords }: UserManagementTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'createdAt', desc: true }]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  const handleEditClick = React.useCallback((user: User) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  }, []);

  const tableData = React.useMemo(() => {
    if (!dateRange || !dateRange.from) {
      return data.map(user => ({
        ...user,
        periodIncome: user.totalIncome,
      }));
    }

    const from = dateRange.from;
    const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
    to.setHours(23, 59, 59, 999);

    const incomeMap = new Map<string, number>();
    allIncomeRecords.forEach(record => {
      const recordDate = new Date(record.saleDate);
      if (recordDate >= from && recordDate <= to) {
        incomeMap.set(record.userId, (incomeMap.get(record.userId) || 0) + record.amount);
      }
    });

    return data.map(user => ({
      ...user,
      periodIncome: incomeMap.get(user.id) || 0,
    }));
  }, [data, allIncomeRecords, dateRange]);


  const columns = React.useMemo<ColumnDef<UserWithPeriodIncome>[]>(() => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => <Badge variant="secondary">{row.getValue("role")}</Badge>,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Joined Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => new Date(row.getValue("createdAt")).toLocaleDateString(),
    },
    {
      accessorKey: "periodIncome",
      header: ({ column }) => (
         <div className="text-right w-full">
            <Button
                variant="ghost"
                className="w-full justify-end"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Income (Period)
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        </div>
      ),
      cell: ({ row }) => {
        const amount = row.getValue("periodIncome") as number;
        const formatted = new Intl.NumberFormat("en-LK", {
          style: "currency",
          currency: "LKR",
        }).format(amount);
        return <div className="text-right font-medium">{formatted}</div>;
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original;
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
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                Copy user ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleEditClick(user)}>Edit user</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground">Delete user</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], [handleEditClick]);

  const table = useReactTable({
    data: tableData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  const handleGenerateCsv = () => {
    const reportData = table.getRowModel().rows.map(row => row.original);
    
    const roleOrderMap: Record<Role, number> = {
      'Admin': 1,
      'Regional Director': 2,
      'Head Group Manager': 3,
      'Group Operation Manager': 4,
      'Team Operation Manager': 5,
      'Shop Manager': 6,
      'Salesman': 7,
    };
    
    const sortedReportData = [...reportData].sort((a, b) => {
      const roleA = roleOrderMap[a.role] || 99;
      const roleB = roleOrderMap[b.role] || 99;
      return roleA - roleB;
    });

    const csvHeader = "Name,Email,Role,Income (LKR)\n";
    const csvRows = sortedReportData.map(user => {
        const name = `"${user.name.replace(/"/g, '""')}"`;
        const email = user.email;
        const role = user.role;
        const income = user.periodIncome;
        return `${name},${email},${role},${income}`;
    }).join("\n");

    const csvContent = csvHeader + csvRows;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    
    const dateSuffix = dateRange?.from ? `_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to ?? dateRange.from, "yyyy-MM-dd")}` : '_all-time';
    link.setAttribute("download", `user_income_report${dateSuffix}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleGeneratePdf = () => {
    const doc = new jsPDF();
    const tableRows: any[] = [];
    const tableColumns = ["Name", "Email", "Role", "Income (LKR)"];

    const roleOrderMap: Record<Role, number> = {
      'Admin': 1,
      'Regional Director': 2,
      'Head Group Manager': 3,
      'Group Operation Manager': 4,
      'Team Operation Manager': 5,
      'Shop Manager': 6,
      'Salesman': 7,
    };
    
    const reportData = table.getRowModel().rows.map(row => row.original);
    
    const sortedReportData = [...reportData].sort((a, b) => {
      const roleA = roleOrderMap[a.role] || 99;
      const roleB = roleOrderMap[b.role] || 99;
      return roleA - roleB;
    });

    sortedReportData.forEach(user => {
      const userData = [
        user.name,
        user.email,
        user.role,
        `LKR ${user.periodIncome.toLocaleString()}`,
      ];
      tableRows.push(userData);
    });
    
    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Lexora", 14, 22);

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("User Income Report", 14, 30);

    const dateSuffix = dateRange?.from ? `Period: ${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to ?? dateRange.from, "LLL dd, y")}` : 'Period: All Time';
    doc.setFontSize(10);
    doc.text(dateSuffix, 14, 36);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 42);


    (doc as any).autoTable({
        head: [tableColumns],
        body: tableRows,
        startY: 50,
    });
    
    const fileNameSuffix = dateRange?.from ? `_${format(dateRange.from, "yyyy-MM-dd")}_to_${format(dateRange.to ?? dateRange.from, "yyyy-MM-dd")}` : '_all-time';
    doc.save(`user_income_report${fileNameSuffix}.pdf`);
  };

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row items-center gap-4 py-4">
        <Input
          placeholder="Filter by email..."
          value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("email")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
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
                <span>Filter income by date</span>
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
        <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FileDown className="mr-2 h-4 w-4" />
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

            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                    let displayName = column.id.replace(/([A-Z])/g, ' $1');
                    displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                    
                    if (column.id === 'createdAt') displayName = 'Joined Date';
                    if (column.id === 'periodIncome') displayName = 'Income (Period)';
                    if (column.id === 'name') displayName = 'Name';
                    if (column.id === 'email') displayName = 'Email';
                    if (column.id === 'role') displayName = 'Role';

                    return (
                    <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                        {displayName}
                    </DropdownMenuCheckboxItem>
                    );
                })}
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
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
        <div className="space-x-2">
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
      </div>
      <EditUserDialog
        user={selectedUser}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onUserUpdate={() => {
          // No action needed here, onSnapshot in AppLayout will handle the update
        }}
      />
    </div>
  );
}
