
"use client";

import React from "react";
import { User, TechnicalIssue } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wrench, Check, Hourglass } from "lucide-react";
import { format } from "date-fns";

interface CallCentreOperatorDashboardProps {
  operator: User;
  allIssues: TechnicalIssue[];
}

const CallCentreOperatorDashboard: React.FC<CallCentreOperatorDashboardProps> = ({ operator, allIssues }) => {
  const myIssues = React.useMemo(() => {
    return allIssues
      .filter(issue => issue.callCentreOperatorId === operator.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allIssues, operator.id]);

  const pendingIssues = myIssues.filter(issue => issue.status === 'pending').length;
  const completedIssues = myIssues.filter(issue => issue.status === 'completed').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues Reported</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myIssues.length}</div>
            <p className="text-xs text-muted-foreground">Total issues you have reported.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Issues</CardTitle>
            <Hourglass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{pendingIssues}</div>
            <p className="text-xs text-muted-foreground">Issues awaiting completion.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Issues</CardTitle>
            <Check className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{completedIssues}</div>
            <p className="text-xs text-muted-foreground">Issues that have been resolved.</p>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
            <CardTitle>My Reported Issues</CardTitle>
            <CardDescription>A log of all the technical issues you have reported.</CardDescription>
        </CardHeader>
        <CardContent>
             <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Assigned To</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {myIssues.length > 0 ? myIssues.map(issue => (
                            <TableRow key={issue.id}>
                                <TableCell>{format(new Date(issue.createdAt), 'PPP')}</TableCell>
                                <TableCell>
                                    <div className="font-medium">{issue.customerName}</div>
                                    <div className="text-xs text-muted-foreground">{issue.customerContact}</div>
                                </TableCell>
                                <TableCell>{issue.technicalOfficerName}</TableCell>
                                <TableCell>
                                    <Badge variant={issue.requestType === 'Red Zone' ? 'destructive' : 'secondary'}>{issue.requestType}</Badge>
                                </TableCell>
                                <TableCell>
                                     <Badge variant={issue.status === 'completed' ? 'success' : 'default'}>{issue.status}</Badge>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">You have not reported any issues yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CallCentreOperatorDashboard;
