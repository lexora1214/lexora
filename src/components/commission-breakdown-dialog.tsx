
"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IncomeRecord, User } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface CommissionBreakdownDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  title: string;
  records: IncomeRecord[];
  totalCommission: number;
  allUsers: User[];
}

const CommissionBreakdownDialog: React.FC<CommissionBreakdownDialogProps> = ({
  isOpen,
  onOpenChange,
  title,
  records,
  totalCommission,
  allUsers,
}) => {
  const getUserAvatar = (userId: string) => {
    return allUsers.find(u => u.id === userId)?.avatar;
  };
  
  const getUserName = (userId: string) => {
      const user = allUsers.find(u => u.id === userId);
      return user ? user.name : "Unknown User";
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Commission Breakdown</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[50vh] pr-4">
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {records.map(record => (
                            <TableRow key={record.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={getUserAvatar(record.userId)} />
                                            <AvatarFallback>{getUserName(record.userId).charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <p>{getUserName(record.userId)}</p>
                                    </div>
                                </TableCell>
                                <TableCell>{record.grantedForRole}</TableCell>
                                <TableCell className="text-right font-medium">LKR {record.amount.toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                     <TableFooter>
                        <TableRow>
                            <TableCell colSpan={2} className="text-right font-bold text-base">Total Commission</TableCell>
                            <TableCell className="text-right font-bold text-base">LKR {totalCommission.toLocaleString()}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default CommissionBreakdownDialog;
