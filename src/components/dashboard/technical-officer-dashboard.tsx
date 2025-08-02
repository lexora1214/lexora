
"use client";

import React, { useState } from "react";
import { User, TechnicalIssue } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, CheckCircle2, Phone, Wrench, User as UserIcon } from "lucide-react";
import { updateTechnicalIssue } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface TechnicalOfficerDashboardProps {
  officer: User;
  allIssues: TechnicalIssue[];
}

const TechnicalOfficerDashboard: React.FC<TechnicalOfficerDashboardProps> = ({ officer, allIssues }) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const myTasks = React.useMemo(() => {
    return allIssues
      .filter(issue => issue.technicalOfficerId === officer.id && issue.status === 'pending')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allIssues, officer.id]);


  const handleMarkComplete = async (issueId: string) => {
    setProcessingId(issueId);
    try {
      await updateTechnicalIssue(issueId, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      toast({
        title: "Task Completed",
        description: "Status updated successfully.",
        variant: "default",
        className: "bg-success text-success-foreground",
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wrench /> My Technical Tasks</CardTitle>
          <CardDescription>Here are the technical issues assigned to you. Mark them as complete once resolved.</CardDescription>
        </CardHeader>
      </Card>
      {myTasks.length > 0 ? (
        myTasks.map(issue => (
          <Card key={issue.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5" /> {issue.customerName}
                  </CardTitle>
                  <CardDescription>
                     <Badge variant={issue.requestType === 'Red Zone' ? 'destructive' : 'secondary'} className="mt-2">{issue.requestType}</Badge>
                  </CardDescription>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" disabled={!!processingId}>
                      {processingId === issue.id ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Mark as Complete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Task Completion</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to mark this issue as completed? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleMarkComplete(issue.id)}
                        className={cn("bg-success text-success-foreground hover:bg-success/90")}
                      >
                        Yes, Mark as Complete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
               <p className="text-sm border-t pt-4">{issue.description}</p>
              <div className="text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4" /> {issue.customerContact}
                </p>
                 <p className="mt-2 text-xs">Reported by: {issue.callCentreOperatorName}</p>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">
            You have no pending tasks.
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TechnicalOfficerDashboard;
