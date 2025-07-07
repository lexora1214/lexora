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
  
  const columns = React.useMemo(() => getColumns(users), [users]);

  const availableData = React.useMemo(() => data.filter(c => c.tokenIsAvailable), [data]);
  const unavailableData = React.useMemo(() => data.filter(c => !c.tokenIsAvailable), [data]);

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

  const TableView = ({ table, isAvailable }: { table: ReturnType<typeof useTable>, isAvailable: boolean}) => (
    <>
      <div className="rounded-md border">
        <Table>
          {!isAvailable && <TableHeader>
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
          </TableHeader>}
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow 
                  key={row.id} 
                  data-state={row.getIsSelected() && "selected"}
                  className={cn(
                    row.original.tokenIsAvailable
                        ? "bg-success/10 hover:bg-success/20"
                        : "bg-destructive/10 hover:bg-destructive/20"
                  )}
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
                  No customers found.
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
    </>
  );

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filter by contact info..."
          value={(availableTable.getColumn("contactInfo")?.getFilterValue() as string) ?? ""}
          onChange={(event) => {
            availableTable.getColumn("contactInfo")?.setFilterValue(event.target.value)
            unavailableTable.getColumn("contactInfo")?.setFilterValue(event.target.value)
          }}
          className="max-w-sm"
        />
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
                  No available tokens.
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
                      Used Tokens ({unavailableTable.getFilteredRowModel().rows.length})
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
