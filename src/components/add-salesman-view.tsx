
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, UserPlus } from "lucide-react";
import { User, SalesmanStage } from "@/types";
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

interface AddSalesmanViewProps {
  manager: User;
}

export default function AddSalesmanView({ manager }: AddSalesmanViewProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [salesmanStage, setSalesmanStage] = useState<SalesmanStage>("BUSINESS PROMOTER (stage 01)");


  const handleSignup = async (e: React.FormEvent) => {
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

    const tempAppName = `salesman-signup-${Date.now()}`;
    const tempApp = initializeApp(firebaseConfig, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
      await createUserProfile(
        userCredential.user,
        name,
        mobileNumber,
        "Salesman",
        manager.referralCode,
        manager.branch,
        salesmanStage
      );
      toast({
        title: "Salesman Registered",
        description: `${name} has been successfully registered. You can now share their login details.`,
        variant: "default",
        className: "bg-success text-success-foreground",
      });
      setName("");
      setEmail("");
      setMobileNumber("");
      setPassword("");
      setSalesmanStage("BUSINESS PROMOTER (stage 01)");
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

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus />
          Register New Salesman
        </CardTitle>
        <CardDescription>Enter the new salesman's details. They will be added to your team and branch.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignup}>
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
              Create Salesman Account
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
