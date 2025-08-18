

"use client";

import React, { useState, useMemo } from 'react';
import { User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCheck, ShieldAlert, Fingerprint, Files } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { updateUser } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from 'next/image';

const ViewDocumentsDialog: React.FC<{ user: User | null, isOpen: boolean, onOpenChange: (open: boolean) => void }> = ({ user, isOpen, onOpenChange }) => {
    if (!user) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Verification Documents</DialogTitle>
                    <DialogDescription>For: {user.name} ({user.nic})</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                    {user.nicFrontUrl ? (
                        <div>
                            <h4 className="font-semibold mb-2">NIC Front</h4>
                            <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                                <Image src={user.nicFrontUrl} layout="fill" objectFit="contain" alt="NIC Front" data-ai-hint="document ID card" />
                            </div>
                        </div>
                    ) : <p className="text-muted-foreground text-sm">NIC Front not available.</p>}
                    {user.nicBackUrl ? (
                        <div>
                            <h4 className="font-semibold mb-2">NIC Back</h4>
                             <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                                <Image src={user.nicBackUrl} layout="fill" objectFit="contain" alt="NIC Back" data-ai-hint="document ID card" />
                            </div>
                        </div>
                    ) : <p className="text-muted-foreground text-sm">NIC Back not available.</p>}
                    {user.gsCertificateUrl && (
                         <div>
                            <h4 className="font-semibold mb-2">GS Certificate</h4>
                             <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                                <Image src={user.gsCertificateUrl} layout="fill" objectFit="contain" alt="GS Certificate" data-ai-hint="document official" />
                            </div>
                        </div>
                    )}
                     {user.policeReportUrl && (
                         <div>
                            <h4 className="font-semibold mb-2">Police Report</h4>
                             <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                                <Image src={user.policeReportUrl} layout="fill" objectFit="contain" alt="Police Report" data-ai-hint="document police report" />
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

interface NewUserVerificationViewProps {
  allUsers: User[];
}

const NewUserVerificationView: React.FC<NewUserVerificationViewProps> = ({ allUsers }) => {
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [isDocsDialogOpen, setIsDocsDialogOpen] = useState(false);

  const pendingUsers = useMemo(() => {
    return allUsers.filter(user => user.isDisabled);
  }, [allUsers]);

  const handleEnableUser = async (userId: string) => {
    setProcessingId(userId);
    try {
      await updateUser(userId, { isDisabled: false });
      toast({
        title: 'User Enabled',
        description: 'The user account has been successfully enabled and can now log in.',
        className: 'bg-success text-success-foreground',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to enable user: ${error.message}`,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleViewDocuments = (user: User) => {
    setViewingUser(user);
    setIsDocsDialogOpen(true);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>New User Verification</CardTitle>
          <CardDescription>
            Review the details for newly registered users and enable their accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Registered On</TableHead>
                  <TableHead>NIC</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.length > 0 ? (
                  pendingUsers.map(user => (
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
                        <div className="flex items-center gap-2">
                          <Fingerprint className="h-4 w-4 text-muted-foreground" />
                          <span>{user.nic || "Not Provided"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => handleViewDocuments(user)}>
                                <Files className="mr-2 h-4 w-4"/> View Docs
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleEnableUser(user.id)}
                                disabled={!!processingId}
                                className="bg-success text-success-foreground hover:bg-success/90"
                            >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Enable Account
                            </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                       <div className="flex flex-col items-center justify-center gap-2">
                          <ShieldAlert className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No users are pending verification.</p>
                       </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <ViewDocumentsDialog
        user={viewingUser}
        isOpen={isDocsDialogOpen}
        onOpenChange={setIsDocsDialogOpen}
      />
    </>
  );
};

export default NewUserVerificationView;

