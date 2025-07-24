
"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, UserPlus, FileUp, CheckCircle2, CheckCircle } from "lucide-react";
import { User, SalesmanStage, SalesmanDocuments } from "@/types";
import { createUserProfile } from "@/lib/firestore";
import { firebaseConfig } from "@/lib/firebase";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { sendOtpSms } from "@/lib/sms";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";

interface AddSalesmanViewProps {
  manager: User;
}

const FileInput: React.FC<{ label: string, onFileSelect: (file: File) => void, acceptedFileTypes: string, selectedFile: File | null }> = ({ label, onFileSelect, acceptedFileTypes, selectedFile }) => {
    const [fileName, setFileName] = useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onFileSelect(file);
            setFileName(file.name);
        }
    };

    return (
        <div className="grid gap-2">
            <Label>{label}</Label>
            <Input ref={inputRef} type="file" onChange={handleFileChange} accept={acceptedFileTypes} className="hidden" />
            <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} className="justify-start">
                {selectedFile ? <CheckCircle2 className="mr-2 h-4 w-4 text-success" /> : <FileUp className="mr-2 h-4 w-4" />}
                <span className="truncate">{selectedFile?.name || 'Select File'}</span>
            </Button>
        </div>
    )
}

type SignupData = {
  name: string;
  email: string;
  mobileNumber: string;
  password: string;
  salesmanStage: SalesmanStage;
  documents: SalesmanDocuments;
};

export default function AddSalesmanView({ manager }: AddSalesmanViewProps) {
  const { toast } = useToast();
  
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [salesmanStage, setSalesmanStage] = useState<SalesmanStage>("BUSINESS PROMOTER (stage 01)");
  const [documents, setDocuments] = useState<Partial<SalesmanDocuments>>({});

  // UI/Flow state
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'details' | 'otp'>('details');
  
  // OTP state
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [signupData, setSignupData] = useState<SignupData | null>(null);

  const handleFileSelect = (docType: keyof SalesmanDocuments, file: File) => {
    setDocuments(prev => ({ ...prev, [docType]: file }));
  };

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
    if (!documents.nicFront || !documents.nicBack || !documents.birthCertificate || !documents.policeReport) {
        toast({ variant: "destructive", title: "Registration Failed", description: "All four verification documents are required." });
        return;
    }

    setIsLoading(true);

    try {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);

      setSignupData({
          name, email, mobileNumber, password, salesmanStage,
          documents: documents as SalesmanDocuments
      });

      await sendOtpSms(mobileNumber, otp);
      
      toast({
        title: "OTP Sent",
        description: `An OTP has been sent to the new salesman's mobile number (${mobileNumber}).`,
      });
      setStep('otp');

    } catch (error: any) {
      console.error("Error sending OTP:", error);
      toast({ variant: "destructive", title: "OTP Send Failed", description: "Could not send OTP. Please check the number and try again." });
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
    const tempAppName = `salesman-signup-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, signupData.email, signupData.password);
      await createUserProfile(
        userCredential.user,
        signupData.name,
        signupData.mobileNumber,
        "Salesman",
        manager.referralCode,
        manager.branch,
        signupData.salesmanStage,
        signupData.documents
      );
      toast({
        title: "Salesman Registered",
        description: `${signupData.name} has been successfully registered. Their account must be enabled by an admin before they can log in.`,
        variant: "default",
        className: "bg-success text-success-foreground",
      });
      // Reset form
      setName("");
      setEmail("");
      setMobileNumber("");
      setPassword("");
      setSalesmanStage("BUSINESS PROMOTER (stage 01)");
      setDocuments({});
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
                      Verify & Create Account
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
          <UserPlus />
          Register New Salesman
        </CardTitle>
        <CardDescription>Enter the new salesman's details. Their account will be disabled until an admin verifies their documents.</CardDescription>
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
              <Input id="email" type="email" placeholder="salesman@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mobileNumber">Mobile Number</Label>
              <Input id="mobileNumber" type="tel" placeholder="0712345678" required value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="Create a password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
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
            
            <div className="border-t pt-4 mt-2">
                <h3 className="font-medium text-center mb-4">Verification Documents</h3>
                <div className="grid grid-cols-2 gap-4">
                    <FileInput label="NIC Front" onFileSelect={(file) => handleFileSelect('nicFront', file)} acceptedFileTypes=".png,.jpg,.jpeg,.pdf" selectedFile={documents.nicFront || null}/>
                    <FileInput label="NIC Back" onFileSelect={(file) => handleFileSelect('nicBack', file)} acceptedFileTypes=".png,.jpg,.jpeg,.pdf" selectedFile={documents.nicBack || null} />
                    <FileInput label="Birth Certificate" onFileSelect={(file) => handleFileSelect('birthCertificate', file)} acceptedFileTypes=".png,.jpg,.jpeg,.pdf" selectedFile={documents.birthCertificate || null} />
                    <FileInput label="Police Report" onFileSelect={(file) => handleFileSelect('policeReport', file)} acceptedFileTypes=".png,.jpg,.jpeg,.pdf" selectedFile={documents.policeReport || null} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="referral-code">Your Referral Code</Label>
                <Input id="referral-code" value={manager.referralCode} disabled />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="branch">Your Branch</Label>
                <Input id="branch" value={manager.branch || 'N/A'} disabled />
              </div>
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
