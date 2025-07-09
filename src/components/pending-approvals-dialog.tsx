"use client";

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CommissionRequest } from '@/types';
import { uploadDepositSlipAndUpdateRequest } from '@/lib/firestore';
import { LoaderCircle, Upload, CheckCircle2 } from 'lucide-react';
import { Badge } from './ui/badge';

interface PendingApprovalsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  requests: CommissionRequest[];
}

const PendingApprovalsDialog: React.FC<PendingApprovalsDialogProps> = ({ isOpen, onOpenChange, requests }) => {
    const { toast } = useToast();
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !selectedRequestId) {
            return;
        }

        const file = event.target.files[0];
        setUploadingId(selectedRequestId);

        try {
            await uploadDepositSlipAndUpdateRequest(selectedRequestId, file);
            toast({
                title: "Upload Successful",
                description: "The deposit slip has been submitted for approval.",
                variant: 'default',
                className: 'bg-success text-success-foreground'
            });
            // The list will update automatically due to the listener in AppLayout
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: error.message,
            });
        } finally {
            setUploadingId(null);
            setSelectedRequestId(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleUploadClick = (requestId: string) => {
        setSelectedRequestId(requestId);
        fileInputRef.current?.click();
    }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pending Commission Approvals</DialogTitle>
          <DialogDescription>
            Upload the bank deposit slip for each token sale to get your commission approved.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-3 p-1">
            {requests.length > 0 ? requests.map((request) => (
                <div key={request.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                        <p className="font-medium">{request.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                            Token: <Badge variant="outline">{request.tokenSerial}</Badge>
                        </p>
                    </div>
                    <div>
                        {uploadingId === request.id ? (
                            <Button disabled size="sm">
                                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                Uploading...
                            </Button>
                        ) : request.depositSlipUrl ? (
                            <div className="flex items-center gap-2 text-sm text-success">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Slip Uploaded</span>
                            </div>
                        ) : (
                            <Button onClick={() => handleUploadClick(request.id)} size="sm">
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Slip
                            </Button>
                        )}
                    </div>
                </div>
            )) : (
              <p className="text-center text-muted-foreground py-8">You have no pending approvals.</p>
            )}
             <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="image/*"
            />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PendingApprovalsDialog;
