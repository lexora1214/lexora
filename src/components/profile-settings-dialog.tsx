
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
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { updateUser, updateUserPassword } from "@/lib/firestore";
import { sendOtpSms } from "@/lib/sms";
import { User } from "@/types";
import { LoaderCircle, KeyRound, MessageSquareWarning } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";

const profileSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  mobileNumber: z.string().regex(/^0\d{9}$/, { message: "Please enter a valid 10-digit mobile number." }),
  branch: z.string().optional(),
});

const passwordSchema = z.object({
    newPassword: z.string().min(6, "Password must be at least 6 characters long."),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});


type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

interface ProfileSettingsDialogProps {
  user: User;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

type DialogStep = "details" | "password_otp" | "password_confirm";

const ProfileSettingsDialog: React.FC<ProfileSettingsDialogProps> = ({
  user,
  isOpen,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<DialogStep>("details");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Form for profile details
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });
  
  // Form for password change
  const passwordForm = useForm<PasswordFormValues>({
      resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name,
        mobileNumber: user.mobileNumber || "",
        branch: user.branch || "",
      });
    }
    // Reset state when dialog is opened/closed or user changes
    setStep("details");
    passwordForm.reset();
    setEnteredOtp("");
    setNewPassword("");
    setGeneratedOtp("");
  }, [user, isOpen, profileForm, passwordForm]);

  const onProfileSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const updateData: Partial<User> = {
        name: data.name,
        mobileNumber: data.mobileNumber,
      };

      if (user.role === 'Team Operation Manager') {
        updateData.branch = data.branch;
      }

      await updateUser(user.id, updateData);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
        variant: 'default',
        className: 'bg-success text-success-foreground'
      });
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
  
  const onPasswordSubmit: SubmitHandler<PasswordFormValues> = async (data) => {
    setIsLoading(true);
    try {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(otp);
        setNewPassword(data.newPassword);
        
        await sendOtpSms(user.mobileNumber, otp);
        toast({
            title: "OTP Sent",
            description: "An OTP has been sent to your registered mobile number.",
        });
        setStep("password_otp");
    } catch (error: any) {
        toast({ variant: "destructive", title: "OTP Send Failed", description: error.message });
    } finally {
        setIsLoading(false);
    }
  };

  const handleVerifyOtpAndUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtp !== generatedOtp) {
        toast({ variant: "destructive", title: "Verification Failed", description: "The OTP you entered is incorrect." });
        return;
    }
    
    setIsLoading(true);
    try {
        await updateUserPassword(newPassword);
        toast({
            title: "Password Updated",
            description: "Your password has been changed successfully.",
            variant: "default",
            className: "bg-success text-success-foreground",
        });
        onOpenChange(false);
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not update password. You may need to sign out and sign back in to perform this action.",
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        {step === 'details' && (
             <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                    Make changes to your profile here. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Email</Label>
                        <Input id="email" type="email" value={user?.email || ''} disabled className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Full Name</Label>
                        <div className="col-span-3">
                            <Input id="name" {...profileForm.register("name")} />
                            {profileForm.formState.errors.name && <p className="text-xs text-destructive mt-1">{profileForm.formState.errors.name.message}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="mobileNumber" className="text-right">Mobile No.</Label>
                        <div className="col-span-3">
                            <Input id="mobileNumber" {...profileForm.register("mobileNumber")} />
                            {profileForm.formState.errors.mobileNumber && <p className="text-xs text-destructive mt-1">{profileForm.formState.errors.mobileNumber.message}</p>}
                        </div>
                    </div>
                    {user.role === 'Team Operation Manager' && (
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="branch" className="text-right">Branch</Label>
                        <div className="col-span-3">
                        <Input id="branch" {...profileForm.register("branch")} />
                        {profileForm.formState.errors.branch && <p className="text-xs text-destructive mt-1">{profileForm.formState.errors.branch.message}</p>}
                        </div>
                    </div>
                    )}
                </div>
                <DialogFooter className="sm:justify-between pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setStep('password_confirm')}>
                        <KeyRound className="mr-2 h-4 w-4"/>
                        Change Password
                    </Button>
                    <div className="flex gap-2">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Save changes
                        </Button>
                    </div>
                </DialogFooter>
            </form>
        )}
        
        {step === 'password_confirm' && (
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                    Enter a new password. An OTP will be sent to your mobile to confirm this change.
                    </DialogDescription>
                </DialogHeader>
                 <div className="grid gap-4 py-4">
                    <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input id="newPassword" type="password" {...passwordForm.register("newPassword")} />
                        {passwordForm.formState.errors.newPassword && <p className="text-xs text-destructive mt-1">{passwordForm.formState.errors.newPassword.message}</p>}
                    </div>
                     <div>
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input id="confirmPassword" type="password" {...passwordForm.register("confirmPassword")} />
                        {passwordForm.formState.errors.confirmPassword && <p className="text-xs text-destructive mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>}
                    </div>
                </div>
                 <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => setStep('details')}>Back</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Send OTP & Update
                    </Button>
                </DialogFooter>
            </form>
        )}

        {step === 'password_otp' && (
            <form onSubmit={handleVerifyOtpAndUpdatePassword}>
                <DialogHeader>
                    <DialogTitle>Verify Your Number</DialogTitle>
                    <DialogDescription>
                        Enter the 6-digit code we sent to your number ending in ...{user.mobileNumber.slice(-4)}.
                    </DialogDescription>
                </DialogHeader>
                 <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="otp">Verification Code</Label>
                        <InputOTP maxLength={6} value={enteredOtp} onChange={(value) => setEnteredOtp(value)}>
                            <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                            </InputOTPGroup>
                        </InputOTP>
                    </div>
                </div>
                 <DialogFooter>
                    <Button type="button" variant="secondary" onClick={() => setStep('password_confirm')}>Back</Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Verify & Change Password
                    </Button>
                </DialogFooter>
            </form>
        )}

      </DialogContent>
    </Dialog>
  );
};

export default ProfileSettingsDialog;

