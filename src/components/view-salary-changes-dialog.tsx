
"use client";

import React from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SalaryChangeRequest, SalarySettings } from "@/types";

const SALARY_ROLES: (keyof SalarySettings)[] = [
  "BUSINESS PROMOTER (stage 01)",
  "MARKETING EXECUTIVE (stage 02)",
  "Team Operation Manager",
  "Group Operation Manager",
  "Head Group Manager",
  "Regional Director",
];

const ViewSalaryChangesDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  request: SalaryChangeRequest | null;
}> = ({ isOpen, onOpenChange, request }) => {
  if (!request) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Salary Change Details</DialogTitle>
          <DialogDescription>
            Requested by {request.requestedByName} on {format(new Date(request.requestDate), 'PPP')}.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Current Salary</TableHead>
                        <TableHead className="text-right">Proposed Salary</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {SALARY_ROLES.map(role => {
                        const current = request.currentSettings[role] ?? 0;
                        const proposed = request.newSettings[role] ?? 0;
                        const hasChanged = current !== proposed;
                        return (
                            <TableRow key={role} className={hasChanged ? "bg-muted/50" : ""}>
                                <TableCell className="font-medium">{role}</TableCell>
                                <TableCell className="text-right">LKR {current.toLocaleString()}</TableCell>
                                <TableCell className={`text-right font-bold ${hasChanged ? (proposed > current ? 'text-success' : 'text-destructive') : ''}`}>
                                    LKR {proposed.toLocaleString()}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewSalaryChangesDialog;
