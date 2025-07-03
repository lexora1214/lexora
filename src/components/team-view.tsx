"use client";

import React from "react";
import { User, Customer } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  getPaginationRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpDown } from "lucide-react";

interface TeamViewProps {
  downlineUsers: User[];
  allCustomers: Customer[];
}

type UserWithCustomerCount = User & { customerCount: number };

const columns: ColumnDef<UserWithCustomerCount>[] = [
    {
        accessorKey: "name",
        header: ({ column }) => (
             <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Member
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const user = row.original;
            return (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar} alt={user.name} data-ai-hint="profile avatar" />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="grid gap-0.5">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                </div>
            );
        },
        filterFn: (row, id, value) => {
            const name = row.original.name;
            return name.toLowerCase().includes(value.toLowerCase());
        },
    },
    {
        accessorKey: "role",
        header: ({ column }) => (
             <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Role
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => <Badge variant="outline">{row.getValue("role")}</Badge>,
    },
    {
        accessorKey: "totalIncome",
        header: ({ column }) => (
            <div className="text-right w-full">
                <Button
                    variant="ghost"
                    className="w-full justify-end"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Income
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            </div>
        ),
        cell: ({ row }) => {
            const amount = row.getValue("totalIncome") as number;
            return <div className="text-right font-medium">LKR {amount.toLocaleString()}</div>;
        },
    },
    {
        accessorKey: "customerCount",
        header: ({ column }) => (
            <div className="text-right w-full">
                <Button
                    variant="ghost"
                    className="w-full justify-end"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Customers
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            </div>
        ),
        cell: ({ row }) => <div className="text-right font-medium">{row.getValue("customerCount")}</div>,
    }
];

const TeamView: React.FC<TeamViewProps> = ({ downlineUsers, allCustomers }) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const data: UserWithCustomerCount[] = React.useMemo(() => {
    const salesmanCustomerCounts = new Map<string, number>();
    allCustomers.forEach(c => {
        if (c.salesmanId) {
            salesmanCustomerCounts.set(c.salesmanId, (salesmanCustomerCounts.get(c.salesmanId) || 0) + 1);
        }
    });
    
    return downlineUsers.map(user => ({
        ...user,
        customerCount: salesmanCustomerCounts.get(user.id) || 0,
    }));
  }, [downlineUsers, allCustomers]);


  const table = useReactTable({
    data,
    columns,
    state: {
        sorting,
        columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
        pagination: {
            pageSize: 5,
        }
    },
  });


  if (downlineUsers.length === 0) {
    return <p className="text-center text-muted-foreground p-4">You have no team members in your downline yet.</p>;
  }

  return (
    <div className="w-full">
        <div className="flex items-center py-4">
            <Input
                placeholder="Filter by member name..."
                value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                    table.getColumn("name")?.setFilterValue(event.target.value)
                }
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
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
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
                                No team members found.
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
    </div>
  );
};

export default TeamView;
