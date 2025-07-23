"use client";

import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CommissionRequest } from '@/types';
import { uploadDepositSlipForGroup } from '@/lib/firestore';
import { LoaderCircle, Upload, CheckCircle2 } from 'lucide-react';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';

interface PendingApprovalsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  requests: CommissionRequest[];
}

const PendingApprovalsDialog: React.FC<PendingApprovalsDialogProps> = ({ isOpen, onOpenChange, requests }) => {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const unsubmittedRequests = requests.filter(r => !r.depositSlipUrl);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || selectedRequestIds.length === 0) {
            return;
        }

        const file = event.target.files[0];
        setUploading(true);

        try {
            await uploadDepositSlipForGroup(selectedRequestIds, file);
            toast({
                title: "Upload Successful",
                description: `The deposit slip has been submitted for ${selectedRequestIds.length} request(s).`,
                variant: 'default',
                className: 'bg-success text-success-foreground'
            });
            setSelectedRequestIds([]);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: error.message,
            });
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    }

    const handleSelectRequest = (requestId: string) => {
        setSelectedRequestIds(prev =>
            prev.includes(requestId)
                ? prev.filter(id => id !== requestId)
                : [...prev, requestId]
        );
    }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pending Commission Approvals</DialogTitle>
          <DialogDescription>
            Select one or more token sales and upload the corresponding bank deposit slip.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-3 p-1">
            {unsubmittedRequests.length > 0 ? unsubmittedRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                         <Checkbox
                            id={`select-${request.id}`}
                            checked={selectedRequestIds.includes(request.id)}
                            onCheckedChange={() => handleSelectRequest(request.id)}
                        />
                        <div>
                            <p className="font-medium">{request.customerName}</p>
                            <p className="text-sm text-muted-foreground">
                                Token: <Badge variant="outline">{request.tokenSerial}</Badge>
                            </p>
                        </div>
                    </div>
                </div>
            )) : (
              <p className="text-center text-muted-foreground py-8">You have no pending approvals to submit.</p>
            )}
             <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="image/*"
                disabled={uploading}
            />
        </div>
        <DialogFooter>
             {unsubmittedRequests.length > 0 && (
                 <Button onClick={handleUploadClick} disabled={uploading || selectedRequestIds.length === 0}>
                    {uploading ? (
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Upload className="mr-2 h-4 w-4" />
                    )}
                    Upload for Selected ({selectedRequestIds.length})
                </Button>
             )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PendingApprovalsDialog;
