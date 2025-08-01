
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { User, ProductSale, Collection } from "@/types";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar } from "./ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, LoaderCircle, Wallet, Users } from "lucide-react";

interface RecoveryReportViewProps {
  allUsers: User[];
  allProductSales: ProductSale[];
}

const RecoveryReportView: React.FC<RecoveryReportViewProps> = ({ allUsers, allProductSales }) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('all');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  
  const recoveryOfficers = useMemo(() => {
    return allUsers.filter(u => u.role === 'Recovery Officer');
  }, [allUsers]);

  useEffect(() => {
    const collectionsUnsub = onSnapshot(collection(db, "collections"), (snapshot) => {
        setCollections(snapshot.docs.map(doc => doc.data() as Collection));
        setLoading(false);
    });
    return () => collectionsUnsub();
  }, []);
  
  const filteredCollections = useMemo(() => {
    let data = collections;
    
    // Filter by officer
    if (selectedOfficerId !== 'all') {
        data = data.filter(c => c.collectorId === selectedOfficerId);
    }
    
    // Filter by date
    if (dateRange?.from) {
        const from = dateRange.from;
        const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
        to.setHours(23, 59, 59, 999);
        data = data.filter(c => {
            const collectedDate = new Date(c.collectedAt);
            return collectedDate >= from && collectedDate <= to;
        });
    }

    return data.sort((a,b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime());
  }, [collections, dateRange, selectedOfficerId]);

  const totalCollected = useMemo(() => {
      return filteredCollections.reduce((sum, c) => sum + c.amount, 0);
  }, [filteredCollections]);

  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    return filteredCollections.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredCollections, page, rowsPerPage]);

  const totalPages = Math.ceil(filteredCollections.length / rowsPerPage);

  if (loading) {
    return <div className="flex justify-center items-center h-48"><LoaderCircle className="h-8 w-8 animate-spin" /></div>
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recovery Collection Report</CardTitle>
          <CardDescription>View detailed reports of installment collections by officers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-2">
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
                    <span>All Time</span>
                    )}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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
            <Select value={selectedOfficerId} onValueChange={setSelectedOfficerId}>
                <SelectTrigger className="w-full md:w-[250px]">
                    <SelectValue placeholder="Select Recovery Officer..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Recovery Officers</SelectItem>
                    {recoveryOfficers.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Filtered Results</CardTitle>
                <CardDescription>{filteredCollections.length} collections found.</CardDescription>
            </div>
            <div className="text-right">
                <div className="text-sm text-muted-foreground">Total Collected</div>
                <div className="text-2xl font-bold">LKR {totalCollected.toLocaleString()}</div>
            </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Officer</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedData.length > 0 ? paginatedData.map(c => (
                            <TableRow key={c.id}>
                                <TableCell>{format(new Date(c.collectedAt), 'PPp')}</TableCell>
                                <TableCell>{c.collectorName}</TableCell>
                                <TableCell>{c.customerName}</TableCell>
                                <TableCell className="text-right font-medium">LKR {c.amount.toLocaleString()}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">No collections found for the selected filters.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            {totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>Previous</Button>
                    <span className="text-sm">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}>Next</Button>
                </div>
            )}
        </CardContent>
      </Card>

    </div>
  )
}

export default RecoveryReportView;

    