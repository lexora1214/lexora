

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfile, getSignupRoleSettings } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, CheckCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Role, SalesmanStage } from "@/types";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";

const ALL_ROLES: Role[] = ["Admin", "Regional Director", "Head Group Manager", "Group Operation Manager", "Team Operation Manager", "Branch Admin", "Salesman", "Delivery Boy", "Recovery Officer"];

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [branch, setBranch] = useState("");
  const [visibleRoles, setVisibleRoles] = useState<Record<string, boolean> | null>(null);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [salesmanStage, setSalesmanStage] = useState<SalesmanStage>("BUSINESS PROMOTER (stage 01)");

  const [otp, setOtp] = useState("");
  const [signupStep, setSignupStep] = useState<'details' | 'otp'>('details');

  const isReferralRequired = role && !['Regional Director', 'Admin'].includes(role);
  const isBranchRequired = role === 'Team Operation Manager' || role === 'Branch Admin';
  const isSalesman = role === 'Salesman';

  useEffect(() => {
    const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
        const settings = await getSignupRoleSettings();
        setVisibleRoles(settings.visibleRoles);
      } catch (error) {
        console.error("Failed to fetch role settings:", error);
        const fallbackRoles: Record<string, boolean> = {};
        ALL_ROLES.forEach(r => fallbackRoles[r] = true);
        setVisibleRoles(fallbackRoles);
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, []);

  const formatPhoneNumber = (number: string): string => {
    if (number.startsWith('0')) {
      return `+94${number.substring(1)}`;
    }
    return number;
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (password.length < 6) {
        toast({ variant: "destructive", title: "Sign Up Failed", description: "Password must be at least 6 characters long." });
        setIsLoading(false);
        return;
    }
    if (!/^(0\d{9})$/.test(mobileNumber)) {
        toast({ variant: "destructive", title: "Sign Up Failed", description: "Please enter a valid 10-digit mobile number." });
        setIsLoading(false);
        return;
    }
    if (!role) {
      toast({ variant: "destructive", title: "Sign Up Failed", description: "Please select a role." });
      setIsLoading(false);
      return;
    }
    if (isBranchRequired && !branch.trim()) {
        toast({ variant: "destructive", title: "Sign Up Failed", description: "Branch name is required for this role." });
        setIsLoading(false);
        return;
    }
    if (isReferralRequired) {
      if (!referralCode || referralCode.length !== 6) {
        toast({ variant: "destructive", title: "Sign Up Failed", description: "A valid 6-character referral code is required for this role." });
        setIsLoading(false);
        return;
      }
    }

    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
            'callback': (response: any) => {
              // reCAPTCHA solved, allow signInWithPhoneNumber.
            }
        });
      }
      
      const appVerifier = window.recaptchaVerifier;
      const formattedPhoneNumber = formatPhoneNumber(mobileNumber);
      
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, appVerifier);
      window.confirmationResult = confirmationResult;
      
      toast({
        title: "OTP Sent",
        description: "An OTP has been sent to your mobile number.",
      });
      setSignupStep('otp');

    } catch (error: any) {
      console.error("Error sending OTP:", error);
      let errorMessage = "An error occurred while sending the OTP. Please try again.";
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = "The mobile number provided is not valid.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many requests. Please try again later.";
      }
      toast({ variant: "destructive", title: "OTP Send Failed", description: errorMessage });
      
      // Reset reCAPTCHA if it exists
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }

    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({ variant: "destructive", title: "Verification Failed", description: "Please enter a 6-digit OTP." });
      return;
    }
    setIsLoading(true);

    try {
      const confirmationResult = window.confirmationResult;
      if (!confirmationResult) {
        throw new Error("No confirmation result found. Please try signing up again.");
      }
      
      const result = await confirmationResult.confirm(otp);
      
      // User is now verified. Proceed with user creation in Firestore.
      await createUserProfile(result.user, name, mobileNumber, role as Role, referralCode.toUpperCase(), branch, isSalesman ? salesmanStage : undefined);
      
      toast({
        title: "Account Created",
        description: "You have been successfully signed up.",
        className: "bg-success text-success-foreground",
      });
      router.push("/");

    } catch (error: any) {
        let errorMessage = error.message;
        if(error.code === 'auth/invalid-verification-code') {
            errorMessage = "The OTP you entered is invalid. Please check and try again.";
        } else if (error.code === 'auth/code-expired') {
            errorMessage = "The OTP has expired. Please request a new one.";
        }
        toast({
            variant: "destructive",
            title: "Verification Failed",
            description: errorMessage,
        });
    } finally {
        setIsLoading(false);
    }
  };

  if (signupStep === 'otp') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
              <div className="mb-4 flex justify-center">
                  <CheckCircle className="h-12 w-12 text-success" />
              </div>
              <CardTitle className="text-3xl">Verify Your Number</CardTitle>
              <CardDescription>Enter the 6-digit code we sent to {mobileNumber}.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOtp}>
              <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="otp">Verification Code</Label>
                     <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)}>
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
                      Verify & Create Account
                  </Button>
              </div>
            </form>
            <div className="mt-4 text-center text-sm">
              <button onClick={() => setSignupStep('details')} className="underline">Back to details</button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
                <Image src="/my-logo.png" alt="LEXORA Logo" width={48} height={48} />
            </div>
            <CardTitle className="text-3xl">Create an Account</CardTitle>
            <CardDescription>Enter your details to join the network.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendOtp}>
            <div className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="John Doe" required value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="mobileNumber">Mobile Number</Label>
                    <Input id="mobileNumber" type="tel" placeholder="0712345678" required value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                   <Select value={role} onValueChange={(value) => {
                       const newRole = value as Role;
                       setRole(newRole);
                       if (['Regional Director', 'Admin'].includes(newRole)) {
                           setReferralCode('');
                       }
                       if (newRole !== 'Team Operation Manager' && newRole !== 'Branch Admin') {
                           setBranch('');
                       }
                   }}>
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingRoles || !visibleRoles ? (
                        <div className="flex items-center justify-center p-2"><LoaderCircle className="h-4 w-4 animate-spin" /></div>
                      ) : (
                        ALL_ROLES
                          .filter(r => visibleRoles[r] === true)
                          .map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                 {isSalesman && (
                  <div className="grid gap-2">
                    <Label htmlFor="salesman-stage">Salesman Stage</Label>
                    <Select value={salesmanStage} onValueChange={(value) => setSalesmanStage(value as SalesmanStage)}>
                      <SelectTrigger id="salesman-stage">
                        <SelectValue placeholder="Select Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUSINESS PROMOTER (stage 01)">BUSINESS PROMOTER (stage 01)</SelectItem>
                        <SelectItem value="MARKETING EXECUTIVE (stage 02)">MARKETING EXECUTIVE (stage 02)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {isBranchRequired && (
                  <div className="grid gap-2">
                    <Label htmlFor="branch">Branch</Label>
                    <Input
                      id="branch"
                      placeholder="e.g. Kandy Branch"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      required={isBranchRequired}
                    />
                  </div>
                )}
                 <div className="grid gap-2">
                    <Label htmlFor="referral-code">Referral Code</Label>
                    <Input 
                      id="referral-code" 
                      placeholder="6-character code" 
                      value={referralCode} 
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      disabled={!isReferralRequired}
                      required={isReferralRequired}
                    />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                    Send OTP & Continue
                </Button>
            </div>
          </form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
              Login
            </Link>
          </div>
        </CardContent>
      </Card>
      <div id="recaptcha-container"></div>
    </div>
  );
}
