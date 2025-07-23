
"use client";

import React, { useState, useMemo } from 'react';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Download, UserCheck, ShieldAlert } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { updateUser } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';

interface SalesmanVerificationViewProps {
  allUsers: User[];
}

const SalesmanVerificationView: React.FC<SalesmanVerificationViewProps> = ({ allUsers }) => {
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingSalesmen = useMemo(() => {
    return allUsers.filter(user => user.role === 'Salesman' && user.isDisabled);
  }, [allUsers]);

  const handleEnableSalesman = async (userId: string) => {
    setProcessingId(userId);
    try {
      await updateUser(userId, { isDisabled: false });
      toast({
        title: 'Salesman Enabled',
        description: 'The salesman account has been successfully enabled and can now log in.',
        className: 'bg-success text-success-foreground',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to enable salesman: ${error.message}`,
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salesman Account Verification</CardTitle>
        <CardDescription>
          Review the documents for newly registered salesmen and enable their accounts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Salesman</TableHead>
                <TableHead>Registered On</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingSalesmen.length > 0 ? (
                pendingSalesmen.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar} data-ai-hint="profile avatar" />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(user.createdAt), 'PPP')}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Download className="mr-2 h-4 w-4" /> View Files
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Verification Documents</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <a href={user.nicFrontUrl} target="_blank" rel="noopener noreferrer">NIC Front</a>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={user.nicBackUrl} target="_blank" rel="noopener noreferrer">NIC Back</a>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <a href={user.birthCertificateUrl} target="_blank" rel="noopener noreferrer">Birth Certificate</a>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                             <a href={user.policeReportUrl} target="_blank" rel="noopener noreferrer">Police Report</a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleEnableSalesman(user.id)}
                        disabled={!!processingId}
                        className="bg-success text-success-foreground hover:bg-success/90"
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        Enable Account
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                     <div className="flex flex-col items-center justify-center gap-2">
                        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">No salesmen are pending verification.</p>
                     </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesmanVerificationView;
