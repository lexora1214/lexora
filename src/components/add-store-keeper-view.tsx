
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, UserPlus, CheckCircle, Warehouse } from "lucide-react";
import { User } from "@/types";
import { createUserProfile } from "@/lib/firestore";
import { firebaseConfig } from "@/lib/firebase";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { sendOtpSms } from "@/lib/sms";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";

interface AddStoreKeeperViewProps {
  adminUser: User;
}

type SignupData = {
  name: string;
  email: string;
  mobileNumber: string;
  password: string;
};

export default function AddStoreKeeperView({ adminUser }: AddStoreKeeperViewProps) {
  const { toast } = useToast();
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");

  // UI/Flow state
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'details' | 'otp'>('details');

  // OTP state
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [signupData, setSignupData] = useState<SignupData | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        toast({ variant: "destructive", title: "Registration Failed", description: "Password must be at least 6 characters long." });
        return;
    }
    if (!/^(0\d{9})$/.test(mobileNumber)) {
        toast({ variant: "destructive", title: "Registration Failed", description: "Please enter a valid 10-digit mobile number." });
        return;
    }

    setIsLoading(true);

    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);

      setSignupData({ name, email, mobileNumber, password });

      await sendOtpSms(mobileNumber, otp);
      
      toast({
        title: "OTP Sent",
        description: `An OTP has been sent to the new store keeper's mobile number (${mobileNumber}).`,
      });
      setStep('otp');

    } catch (error: any) {
      console.error("Error sending OTP:", error);
      toast({ 
          variant: "destructive", 
          title: "OTP Send Failed", 
          description: "Could not send OTP. Please check the number and try again. If the issue persists, check the server logs." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtp.length !== 6 || enteredOtp !== generatedOtp) {
      toast({ variant: "destructive", title: "Verification Failed", description: "The OTP you entered is incorrect." });
      return;
    }
    if (!signupData) {
      toast({ variant: "destructive", title: "Verification Failed", description: "Signup data was lost. Please restart the registration." });
      setStep('details');
      return;
    }

    setIsLoading(true);

    const tempAppName = `store-keeper-signup-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, signupData.email, signupData.password);
      
      await createUserProfile(
        userCredential.user,
        signupData.name,
        signupData.mobileNumber,
        "Store Keeper",
        "", // No referral code needed
        undefined,
        undefined,
        undefined,
        {
            referrerId: adminUser.id 
        }
      );

      toast({
        title: "Store Keeper Registered",
        description: `${signupData.name} has been successfully registered.`,
        variant: "default",
        className: "bg-success text-success-foreground",
      });
      // Reset form
      setName("");
      setEmail("");
      setMobileNumber("");
      setPassword("");
      setEnteredOtp("");
      setStep('details');
      
    } catch (error: any) {
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use by another account.";
      }
      toast({ variant: "destructive", title: "Registration Failed", description: errorMessage });
    } finally {
      setIsLoading(false);
      await deleteApp(tempApp);
    }
  };
  
  if (step === 'otp') {
    return (
       <Card className="w-full max-w-lg mx-auto">
          <CardHeader>
              <CardTitle className="flex items-center gap-2"><CheckCircle /> Verify Mobile Number</CardTitle>
              <CardDescription>Enter the 6-digit code sent to {mobileNumber}.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyAndCreateUser}>
              <div className="grid gap-4">
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
                  <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                      Verify & Create Store Keeper Account
                  </Button>
                  <Button variant="link" onClick={() => setStep('details')}>Back to details</Button>
              </div>
            </form>
          </CardContent>
        </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Warehouse />
          Register New Store Keeper
        </CardTitle>
        <CardDescription>Enter the new store keeper's details. They will be able to log in immediately.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSendOtp}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Doe" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="storekeeper@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mobileNumber">Mobile Number</Label>
              <Input id="mobileNumber" type="tel" placeholder="0712345678" required value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Create a password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full mt-2" disabled={isLoading}>
              {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
              Send OTP & Continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
