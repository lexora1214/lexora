"use client";

import * as React from "react";
import { ArrowUpDown, ChevronDown, MoreHorizontal, Calendar as CalendarIcon } from "lucide-react";
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
import { Customer, User } from "@/types";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { format } from "date-fns";
import { Calendar } from "./ui/calendar";

interface CustomerManagementTableProps {
    data: Customer[];
    users: User[];
}

const getSalesmanNameById = (salesmanId: string, users: User[]): string => {
    const salesman = users.find(u => u.id === salesmanId);
    return salesman ? salesman.name : "Unknown";
};


export const getColumns = (users: User[]): ColumnDef<Customer>[] => [
  {
    accessorKey: "name",
    header: "Customer Name",
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "contactInfo",
    header: "Contact Info",
    filterFn: (row, id, value) => {
        return (row.getValue(id) as string).toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "tokenSerial",
    header: "Token Serial",
    cell: ({ row }) => <Badge variant="outline">{row.getValue("tokenSerial")}</Badge>,
  },
  {
    accessorKey: "saleDate",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Sale Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => new Date(row.getValue("saleDate")).toLocaleDateString(),
  },
  {
    accessorKey: "salesmanId",
    header: "Registered By",
    cell: ({ row }) => getSalesmanNameById(row.getValue("salesmanId"), users),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const customer = row.original;
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
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(customer.id)}>
              Copy customer ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Edit customer</DropdownMenuItem>
             <DropdownMenuItem className="text-destructive focus:bg-destructive/80 focus:text-destructive-foreground">Delete customer</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function CustomerManagementTable({ data, users }: CustomerManagementTableProps) {
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  
  const columns = React.useMemo(() => getColumns(users), [users]);

  const dateFilteredData = React.useMemo(() => {
    if (!dateRange || !dateRange.from) {
      return data;
    }
    const from = dateRange.from;
    const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
    to.setHours(23, 59, 59, 999);

    return data.filter(customer => {
        const saleDate = new Date(customer.saleDate);
        return saleDate >= from && saleDate <= to;
    });
  }, [data, dateRange]);

  const availableData = React.useMemo(() => dateFilteredData.filter(c => c.tokenIsAvailable), [dateFilteredData]);
  const unavailableData = React.useMemo(() => dateFilteredData.filter(c => !c.tokenIsAvailable), [dateFilteredData]);

  const useTable = (tableData: Customer[]) => {
      const [sorting, setSorting] = React.useState<SortingState>([]);
      return useReactTable({
          data: tableData,
          columns,
          onSortingChange: setSorting,
          onColumnFiltersChange: setColumnFilters,
          getCoreRowModel: getCoreRowModel(),
          getPaginationRowModel: getPaginationRowModel(),
          getSortedRowModel: getSortedRowModel(),
          getFilteredRowModel: getFilteredRowModel(),
          onColumnVisibilityChange: setColumnVisibility,
          initialState: {
              pagination: {
                  pageSize: 5,
              }
          },
          state: {
              sorting,
              columnFilters,
              columnVisibility,
          },
      });
  }

  const availableTable = useTable(availableData);
  const unavailableTable = useTable(unavailableData);
  
  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setColumnFilters(prev => {
        const existingFilter = prev.find(f => f.id === 'contactInfo');
        if (!existingFilter) {
            return [...prev, { id: 'contactInfo', value }];
        }
        return prev.map(f => f.id === 'contactInfo' ? { ...f, value } : f);
    });
  }

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row items-center gap-4 py-4">
        <Input
          placeholder="Filter by contact info..."
          value={(columnFilters.find(f => f.id === 'contactInfo')?.value as string) ?? ''}
          onChange={handleFilterChange}
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
                <span>Filter by sale date</span>
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
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableTable
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                const columnNames: { [key: string]: string } = {
                    name: 'Customer Name',
                    contactInfo: 'Contact Info',
                    tokenSerial: 'Token Serial',
                    saleDate: 'Sale Date',
                    salesmanId: 'Registered By',
                    commissionDistributed: 'Commission Status',
                };
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {columnNames[column.id] || column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {availableTable.getHeaderGroups().map((headerGroup) => (
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
            {availableTable.getRowModel().rows?.length ? (
              availableTable.getRowModel().rows.map((row) => (
                <TableRow 
                  key={row.id} 
                  data-state={row.getIsSelected() && "selected"}
                  className="bg-success/10 hover:bg-success/20"
                >
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
                  No available tokens found for the selected period.
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
            onClick={() => availableTable.previousPage()}
            disabled={!availableTable.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => availableTable.nextPage()}
            disabled={!availableTable.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>

      {unavailableData.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="used-tokens">
                  <AccordionTrigger className="text-base font-semibold text-destructive">
                      Used Tokens ({unavailableTable.getRowModel().rows.length})
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                      <div className="rounded-md border">
                          <Table>
                              <TableBody>
                                  {unavailableTable.getRowModel().rows.map((row) => (
                                      <TableRow key={row.id} className="bg-destructive/10 hover:bg-destructive/20">
                                          {row.getVisibleCells().map((cell) => (
                                              <TableCell key={cell.id}>
                                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                              </TableCell>
                                          ))}
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      </div>
                      <div className="flex items-center justify-end space-x-2 py-4">
                          <div className="space-x-2">
                              <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => unavailableTable.previousPage()}
                                  disabled={!unavailableTable.getCanPreviousPage()}
                              >
                                  Previous
                              </Button>
                              <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => unavailableTable.nextPage()}
                                  disabled={!unavailableTable.getCanNextPage()}
                              >
                                  Next
                              </Button>
                          </div>
                      </div>
                  </AccordionContent>
              </AccordionItem>
          </Accordion>
      )}

    </div>
  );
}
