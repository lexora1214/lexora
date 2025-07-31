
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { LoaderCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addCustomerNote } from '@/lib/firestore';
import { User, Customer } from '@/types';

const noteSchema = z.object({
  note: z.string().min(10, "Note must be at least 10 characters long."),
});

type NoteFormValues = z.infer<typeof noteSchema>;

interface AddNoteDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  customer: Customer;
  officer: User;
}

const AddNoteDialog: React.FC<AddNoteDialogProps> = ({ isOpen, onOpenChange, customer, officer }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
  });

  const onSubmit = async (data: NoteFormValues) => {
    setIsLoading(true);
    try {
      await addCustomerNote(customer.id, officer, data.note);
      toast({
        title: 'Note Added',
        description: `Your note for ${customer.name} has been saved.`,
        className: 'bg-success text-success-foreground',
      });
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to add note: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) reset();
      onOpenChange(open);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a Note for {customer.name}</DialogTitle>
          <DialogDescription>This note will be visible to other staff members viewing this customer's profile.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="note">Special Note</Label>
            <Textarea id="note" {...register('note')} rows={5} placeholder="Enter your observations or special instructions here..." />
            {errors.note && <p className="text-xs text-destructive mt-1">{errors.note.message}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Save Note
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddNoteDialog;
