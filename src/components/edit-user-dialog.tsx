
"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Controller, useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { updateUser, getAllUsers } from "@/lib/firestore";
import { User, Role, SalesmanStage } from "@/types";
import { LoaderCircle, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";


const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  mobileNumber: z.string().regex(/^0\d{9}$/, { message: "Please enter a valid 10-digit mobile number." }),
  role: z.enum(["Salesman", "Team Operation Manager", "Group Operation Manager", "Head Group Manager", "Regional Director", "Admin", "Super Admin", "Delivery Boy", "Recovery Officer", "Branch Admin", "HR"]),
  branch: z.string().optional(),
  salesmanStage: z.enum(["BUSINESS PROMOTER (stage 01)", "MARKETING EXECUTIVE (stage 02)"]).optional().nullable(),
  assignedManagerIds: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditUserDialogProps {
  user: User | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUserUpdate: () => void;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({
  user,
  isOpen,
  onOpenChange,
  onUserUpdate,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [teamManagers, setTeamManagers] = useState<User[]>([]);
  const [isManagersPopoverOpen, setIsManagersPopoverOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    watch,
    setValue
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const selectedRole = watch("role");
  const assignedManagerIds = watch("assignedManagerIds") || [];

  useEffect(() => {
    const fetchManagers = async () => {
      const allUsers = await getAllUsers();
      setTeamManagers(allUsers.filter(u => u.role === 'Team Operation Manager'));
    };
    fetchManagers();
  }, []);

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        role: user.role,
        mobileNumber: user.mobileNumber || "",
        branch: user.branch || "",
        salesmanStage: user.salesmanStage,
        assignedManagerIds: user.assignedManagerIds || [],
      });
    }
  }, [user, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const updateData: Partial<User> = {
        name: data.name,
        mobileNumber: data.mobileNumber,
        role: data.role,
        assignedManagerIds: data.assignedManagerIds,
      };

      if (data.role === 'Team Operation Manager' || data.role === 'Branch Admin') {
        updateData.branch = data.branch;
      } else {
        updateData.branch = "";
      }

      if (data.role === 'Salesman') {
        updateData.salesmanStage = data.salesmanStage;
      } else {
        updateData.salesmanStage = null;
      }

      await updateUser(user.id, updateData);
      toast({
        title: "User Updated",
        description: `${data.name}'s profile has been successfully updated.`,
        variant: 'default',
        className: 'bg-success text-success-foreground'
      });
      onUserUpdate();
      onOpenChange(false);
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: error.message,
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Make changes to the user's profile. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <div className="col-span-3">
                <Input id="name" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" type="email" value={user?.email || ''} disabled className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mobileNumber" className="text-right">Mobile No.</Label>
              <div className="col-span-3">
                <Input id="mobileNumber" {...register("mobileNumber")} />
                {errors.mobileNumber && <p className="text-xs text-destructive mt-1">{errors.mobileNumber.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <div className="col-span-3">
                    <Controller
                        control={control}
                        name="role"
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Super Admin">Super Admin</SelectItem>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                    <SelectItem value="HR">HR</SelectItem>
                                    <SelectItem value="Regional Director">Regional Director</SelectItem>
                                    <SelectItem value="Head Group Manager">Head Group Manager</SelectItem>
                                    <SelectItem value="Group Operation Manager">Group Operation Manager</SelectItem>
                                    <SelectItem value="Team Operation Manager">Team Operation Manager</SelectItem>
                                    <SelectItem value="Branch Admin">Branch Admin</SelectItem>
                                    <SelectItem value="Salesman">Salesman</SelectItem>
                                    <SelectItem value="Delivery Boy">Delivery Boy</SelectItem>
                                    <SelectItem value="Recovery Officer">Recovery Officer</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.role && <p className="text-xs text-destructive mt-1">{errors.role.message}</p>}
                </div>
            </div>
            {(selectedRole === 'Team Operation Manager' || selectedRole === 'Branch Admin') && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="branch" className="text-right">Branch</Label>
                <div className="col-span-3">
                  <Input id="branch" {...register("branch")} />
                  {errors.branch && <p className="text-xs text-destructive mt-1">{errors.branch.message}</p>}
                </div>
              </div>
            )}
             {selectedRole === 'Salesman' && (
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="salesmanStage" className="text-right">Stage</Label>
                  <div className="col-span-3">
                      <Controller
                          control={control}
                          name="salesmanStage"
                          render={({ field }) => (
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <SelectTrigger>
                                      <SelectValue placeholder="Select a stage" />
                                  </SelectTrigger>
                                  <SelectContent>
                                      <SelectItem value="BUSINESS PROMOTER (stage 01)">BUSINESS PROMOTER (stage 01)</SelectItem>
                                      <SelectItem value="MARKETING EXECUTIVE (stage 02)">MARKETING EXECUTIVE (stage 02)</SelectItem>
                                  </SelectContent>
                              </Select>
                          )}
                      />
                  </div>
              </div>
            )}
            {selectedRole === 'Branch Admin' && (
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Assigned Managers</Label>
                <div className="col-span-3">
                  <Popover open={isManagersPopoverOpen} onOpenChange={setIsManagersPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={isManagersPopoverOpen} className="w-full justify-start h-auto min-h-10">
                        {assignedManagerIds.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {assignedManagerIds.map(id => {
                              const manager = teamManagers.find(m => m.id === id);
                              return manager ? <Badge key={id} variant="secondary">{manager.name}</Badge> : null;
                            })}
                          </div>
                        ) : (
                          "Select managers..."
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search managers..." />
                        <CommandList>
                          <CommandEmpty>No managers found.</CommandEmpty>
                          <CommandGroup>
                            {teamManagers.map(manager => (
                              <CommandItem
                                key={manager.id}
                                onSelect={() => {
                                  const newSelection = assignedManagerIds.includes(manager.id)
                                    ? assignedManagerIds.filter(id => id !== manager.id)
                                    : [...assignedManagerIds, manager.id];
                                  setValue("assignedManagerIds", newSelection);
                                }}
                              >
                                <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                  assignedManagerIds.includes(manager.id) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                  <X className="h-4 w-4" />
                                </div>
                                <span>{manager.name} ({manager.branch})</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
                {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditUserDialog;
