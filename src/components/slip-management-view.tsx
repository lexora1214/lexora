
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { CommissionRequest } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { LoaderCircle, Trash2, CalendarIcon, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, FileX } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { deleteSlipsForMonth } from '@/lib/firestore';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { cn } from '@/lib/utils';

interface SlipManagementViewProps {
  allCommissionRequests: CommissionRequest[];
}

const ViewSlipDialog: React.FC<{ slipUrl: string; isOpen: boolean; onOpenChange: (open: boolean) => void; }> = ({ slipUrl, isOpen, onOpenChange }) => {
    const [zoom, setZoom] = useState(1);

    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => setZoom(1), 200);
        }
    }, [isOpen]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Bank Deposit Slip</DialogTitle>
                </DialogHeader>
                <div className="mt-4 relative bg-muted rounded-lg overflow-hidden h-[70vh]">
                    <div className="absolute inset-0 overflow-auto">
                        <div
                            className="relative w-full h-full flex items-center justify-center transition-transform duration-200"
                            style={{ transform: `scale(${zoom})` }}
                        >
                            <Image src={slipUrl} alt="Deposit Slip" layout="fill" objectFit="contain" data-ai-hint="deposit slip" />
                        </div>
                    </div>
                </div>
                 <DialogFooter className="sm:justify-center pt-2">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}>
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setZoom(1)}>
                            <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}>
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const SlipManagementView: React.FC<SlipManagementViewProps> = ({ allCommissionRequests }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [slipToView, setSlipToView] = useState<string | null>(null);
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const slipsByMonth = useMemo(() => {
    const slipsWithDetails: Record<string, { url: string; count: number; salesmanName: string; slipGroupId: string }> = {};

    allCommissionRequests.forEach(req => {
      if (req.depositSlipUrl && req.slipGroupId) {
        if (!slipsWithDetails[req.slipGroupId]) {
          slipsWithDetails[req.slipGroupId] = {
            url: req.depositSlipUrl,
            count: 0,
            salesmanName: req.salesmanName,
            slipGroupId: req.slipGroupId,
          };
        }
        slipsWithDetails[req.slipGroupId].count += 1;
      }
    });

    const uniqueSlips = Object.values(slipsWithDetails);
    
    return uniqueSlips.reduce((acc, slip) => {
      const request = allCommissionRequests.find(r => r.slipGroupId === slip.slipGroupId);
      if (request) {
        const monthKey = format(new Date(request.requestDate), 'yyyy-MM');
        if (!acc[monthKey]) {
          acc[monthKey] = [];
        }
        acc[monthKey].push(slip);
      }
      return acc;
    }, {} as Record<string, typeof uniqueSlips>);
  }, [allCommissionRequests]);

  const currentMonthSlips = slipsByMonth[format(selectedMonth, 'yyyy-MM')] || [];

  const handleDeleteMonth = async () => {
    setIsDeleting(true);
    try {
        const slipGroupIds = currentMonthSlips.map(s => s.slipGroupId);
        await deleteSlipsForMonth(slipGroupIds);
        toast({
            title: "Slips Deleted",
            description: `All slips for ${format(selectedMonth, 'MMMM yyyy')} have been deleted.`,
            variant: "default",
            className: "bg-success text-success-foreground",
        });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: error.message
        });
    } finally {
        setIsDeleting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Deposit Slip Management</CardTitle>
              <CardDescription>Review and manage all uploaded bank deposit slips.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center font-semibold text-lg w-48">
                {format(selectedMonth, 'MMMM yyyy')}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                disabled={selectedMonth.getMonth() === new Date().getMonth() && selectedMonth.getFullYear() === new Date().getFullYear()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentMonthSlips.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {currentMonthSlips.map((slip, index) => (
                <Card key={index} className="overflow-hidden cursor-pointer group" onClick={() => setSlipToView(slip.url)}>
                  <div className="relative aspect-[3/4]">
                    <Image src={slip.url} layout="fill" objectFit="cover" alt={`Deposit slip by ${slip.salesmanName}`} className="group-hover:scale-105 transition-transform duration-300" data-ai-hint="deposit slip" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  </div>
                  <div className="p-3 bg-card absolute bottom-0 w-full">
                    <p className="font-semibold text-sm truncate">{slip.salesmanName}</p>
                    <p className="text-xs text-muted-foreground">{slip.count} token sales</p>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64">
                <FileX className="h-12 w-12 mb-4" />
                <p className="font-semibold">No slips found for {format(selectedMonth, 'MMMM yyyy')}.</p>
            </div>
          )}
        </CardContent>
         {currentMonthSlips.length > 0 && (
            <CardFooter className="border-t pt-6">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button variant="destructive" disabled={isDeleting}>
                            {isDeleting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4"/>}
                            Delete All Slips for {format(selectedMonth, 'MMMM')}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action will permanently delete all {currentMonthSlips.length} deposit slips for {format(selectedMonth, 'MMMM yyyy')}. This cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDeleteMonth} disabled={isDeleting} className={cn(buttonVariants({variant: 'destructive'}))}>
                               {isDeleting ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin"/> : null}
                                Yes, delete all
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
         )}
      </Card>

      {slipToView && (
        <ViewSlipDialog
          isOpen={!!slipToView}
          onOpenChange={(open) => !open && setSlipToView(null)}
          slipUrl={slipToView}
        />
      )}
    </>
  );
};

export default SlipManagementView;
