
"use client";

import React, { useState, useMemo, useCallback } from "react";
import { User, Reminder } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoaderCircle, PlusCircle, Calendar, Trash2, CheckCircle2, MapPin, User as UserIcon, Fingerprint, Home } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createReminder, updateReminder, deleteReminder } from "@/lib/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import MapPicker from "./map-picker";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar as CalendarPicker } from "./ui/calendar";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, isTomorrow, startOfToday } from "date-fns";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";

// Form Schema for a new reminder
const reminderSchema = z.object({
  name: z.string().min(2, "Name is required"),
  nic: z.string().min(10, "A valid NIC is required"),
  address: z.string().min(5, "Address is required"),
  remindDate: z.date({ required_error: "A reminder date is required." }),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
type ReminderFormValues = z.infer<typeof reminderSchema>;

const AddReminderDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  salesman: User;
}> = ({ isOpen, onOpenChange, salesman }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, control, formState: { errors }, reset, setValue, getValues } = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
  });

  const handleLocationChange = useCallback((location: { lat: number; lng: number }) => {
    setValue("latitude", location.lat);
    setValue("longitude", location.lng);
  }, [setValue]);

  const onSubmit: SubmitHandler<ReminderFormValues> = async (data) => {
    setIsLoading(true);
    try {
      const reminderData: Omit<Reminder, 'id' | 'createdAt' | 'status'> = {
        salesmanId: salesman.id,
        name: data.name,
        nic: data.nic,
        address: data.address,
        remindDate: data.remindDate.toISOString(),
        location: data.latitude && data.longitude ? { latitude: data.latitude, longitude: data.longitude } : null,
      };
      await createReminder(reminderData);
      toast({ title: "Reminder Created", description: "Your new reminder has been saved.", className: "bg-success text-success-foreground" });
      onOpenChange(false);
      reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add New Reminder</DialogTitle>
          <DialogDescription>Enter the details for your new reminder. Click save when you're done.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="h-[60vh] p-1">
            <div className="grid gap-4 py-4 px-5">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="nic">NIC Number</Label>
                <Input id="nic" {...register('nic')} />
                {errors.nic && <p className="text-xs text-destructive mt-1">{errors.nic.message}</p>}
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register('address')} />
                {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
              </div>
              <div>
                <Label htmlFor="remindDate">Reminder Date</Label>
                <Controller
                  control={control}
                  name="remindDate"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarPicker mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                  )}
                />
                {errors.remindDate && <p className="text-xs text-destructive mt-1">{errors.remindDate.message}</p>}
              </div>
              <div className="md:col-span-2">
                <Label>Location (Optional: Click on map to set)</Label>
                <div className="mt-2">
                  <MapPicker onLocationChange={handleLocationChange} />
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4 border-t px-6 pb-0">
            <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Save Reminder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};


interface RemindersViewProps {
  user: User;
  allReminders: Reminder[];
}

const RemindersView: React.FC<RemindersViewProps> = ({ user, allReminders }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const groupedReminders = useMemo(() => {
    const today = startOfToday();
    const pending = allReminders.filter(r => r.status === 'pending');

    const groups = {
      overdue: pending.filter(r => isPast(new Date(r.remindDate)) && !isToday(new Date(r.remindDate))).sort((a,b) => new Date(a.remindDate).getTime() - new Date(b.remindDate).getTime()),
      today: pending.filter(r => isToday(new Date(r.remindDate))),
      tomorrow: pending.filter(r => isTomorrow(new Date(r.remindDate))),
      upcoming: pending.filter(r => !isToday(new Date(r.remindDate)) && !isTomorrow(new Date(r.remindDate)) && !isPast(new Date(r.remindDate))).sort((a,b) => new Date(a.remindDate).getTime() - new Date(b.remindDate).getTime()),
    };
    return groups;
  }, [allReminders]);

  const handleStatusChange = async (reminderId: string, status: 'pending' | 'completed') => {
    try {
      await updateReminder(reminderId, { status });
      toast({ title: `Reminder ${status === 'completed' ? 'Completed' : 'Reset'}` });
    } catch (e) {
      toast({ variant: "destructive", title: "Update failed" });
    }
  };

  const handleDelete = async (reminderId: string) => {
    try {
      await deleteReminder(reminderId);
      toast({ title: 'Reminder Deleted' });
    } catch (e) {
       toast({ variant: "destructive", title: "Deletion failed" });
    }
  };
  
  const handleStartRide = (reminder: Reminder) => {
    if (!reminder.location) {
        toast({
            variant: "destructive",
            title: "Navigation Failed",
            description: "No location is available for this reminder.",
        });
        return;
    }
    const { latitude, longitude } = reminder.location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const ReminderCard = ({ reminder }: { reminder: Reminder }) => (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <p className="font-semibold text-card-foreground flex items-center gap-2"><UserIcon className="h-4 w-4" />{reminder.name}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Fingerprint className="h-4 w-4" />{reminder.nic}</p>
          </div>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(reminder.id)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="icon" variant="ghost" onClick={() => handleStatusChange(reminder.id, 'completed')}><CheckCircle2 className="h-4 w-4 text-success" /></Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground pt-2 border-t flex items-start gap-2"><Home className="h-4 w-4 mt-1 flex-shrink-0"/>{reminder.address}</p>
        {reminder.location && (
          <div>
            <div className="rounded-lg overflow-hidden relative">
              <MapPicker isDisplayOnly initialPosition={{lat: reminder.location.latitude, lng: reminder.location.longitude}} />
               <Button size="sm" onClick={() => handleStartRide(reminder)} className="absolute bottom-2 right-2 shadow-lg">Navigate</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>My Reminders</CardTitle>
              <CardDescription>Manage your upcoming appointments and follow-ups.</CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="w-full md:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Reminder
            </Button>
          </div>
        </CardHeader>
        <CardContent>
            {Object.values(groupedReminders).every(g => g.length === 0) ? (
                <div className="text-center text-muted-foreground p-8">You have no pending reminders.</div>
            ) : (
                 <Accordion type="multiple" defaultValue={['overdue', 'today', 'tomorrow']} className="w-full space-y-4">
                    {groupedReminders.overdue.length > 0 && (
                        <AccordionItem value="overdue">
                            <AccordionTrigger className="text-lg font-semibold flex items-center gap-2 p-4 rounded-md bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20">
                                Overdue ({groupedReminders.overdue.length})
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groupedReminders.overdue.map(r => <ReminderCard key={r.id} reminder={r} />)}
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    {groupedReminders.today.length > 0 && (
                        <AccordionItem value="today">
                            <AccordionTrigger className="text-lg font-semibold flex items-center gap-2 p-4 rounded-md bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                                Today ({groupedReminders.today.length})
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groupedReminders.today.map(r => <ReminderCard key={r.id} reminder={r} />)}
                            </AccordionContent>
                        </AccordionItem>
                    )}
                    {groupedReminders.tomorrow.length > 0 && (
                        <AccordionItem value="tomorrow">
                            <AccordionTrigger className="text-lg font-semibold flex items-center gap-2 p-4 rounded-md bg-muted hover:bg-muted/80">
                                Tomorrow ({groupedReminders.tomorrow.length})
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groupedReminders.tomorrow.map(r => <ReminderCard key={r.id} reminder={r} />)}
                            </AccordionContent>
                        </AccordionItem>
                    )}
                     {groupedReminders.upcoming.length > 0 && (
                        <AccordionItem value="upcoming">
                            <AccordionTrigger className="text-lg font-semibold flex items-center gap-2 p-4 rounded-md bg-muted hover:bg-muted/80">
                                Upcoming ({groupedReminders.upcoming.length})
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {groupedReminders.upcoming.map(r => <ReminderCard key={r.id} reminder={r} />)}
                            </AccordionContent>
                        </AccordionItem>
                    )}
                </Accordion>
            )}
        </CardContent>
      </Card>
      <AddReminderDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        salesman={user}
      />
    </>
  );
};

export default RemindersView;
