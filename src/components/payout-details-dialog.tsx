
"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { LoaderCircle, User, Users } from "lucide-react";
import { IncomeRecord, MonthlySalaryPayout } from "@/types";
import { getIncomeRecordsForPayout } from "@/lib/firestore";
import { format } from "date-fns";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";

interface PayoutDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  payout: MonthlySalaryPayout;
}

const PayoutDetailsDialog: React.FC<PayoutDetailsDialogProps> = ({
  isOpen,
  onOpenChange,
  payout,
}) => {
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && payout) {
      setLoading(true);
      getIncomeRecordsForPayout(payout.id)
        .then(setRecords)
        .catch(err => {
          console.error("Failed to fetch payout records:", err);
          setRecords([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, payout]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Payout Details</DialogTitle>
          <DialogDescription>
            Showing details for the payout on {format(new Date(payout.payoutDate), "PPP p")}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 text-sm mt-4">
            <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Processed by:</span>
                <span className="font-semibold">{payout.processedByName}</span>
            </div>
            <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Total Users Paid:</span>
                <span className="font-semibold">{payout.totalUsersPaid}</span>
            </div>
             {payout.isReversed && (
                <div className="col-span-2">
                     <Badge variant="destructive" className="w-full justify-center p-2">
                        Reversed on {format(new Date(payout.reversalDate!), "PPP")} by {payout.reversedByName}
                    </Badge>
                </div>
            )}
        </div>
        <ScrollArea className="h-[50vh] pr-4 mt-2">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Amount Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.salesmanName}</TableCell>
                      <TableCell>{record.grantedForRole}</TableCell>
                      <TableCell className="text-right font-mono">
                        LKR {record.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2} className="text-right font-bold text-base">
                      Total Payout
                    </TableCell>
                    <TableCell className="text-right font-bold text-base font-mono">
                      LKR {payout.totalAmountPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PayoutDetailsDialog;
