

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfile, getSignupRoleSettings } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Role, SalesmanStage } from "@/types";

const ALL_ROLES: Role[] = ["Admin", "Regional Director", "Head Group Manager", "Group Operation Manager", "Team Operation Manager", "Salesman", "Delivery Boy", "Recovery Officer"];

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

  const isReferralRequired = role && !['Regional Director', 'Admin'].includes(role);
  const isBranchRequired = role === 'Team Operation Manager';
  const isSalesman = role === 'Salesman';


  useEffect(() => {
    const fetchRoles = async () => {
      setLoadingRoles(true);
      try {
        const settings = await getSignupRoleSettings();
        setVisibleRoles(settings.visibleRoles);
      } catch (error) {
        console.error("Failed to fetch role settings:", error);
        // Fallback to all roles being visible on error
        const fallbackRoles: Record<string, boolean> = {};
        ALL_ROLES.forEach(r => fallbackRoles[r] = true);
        setVisibleRoles(fallbackRoles);
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, []);


  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        toast({
            variant: "destructive",
            title: "Sign Up Failed",
            description: "Password must be at least 6 characters long.",
        });
        return;
    }
    if (!/^(0\d{9})$/.test(mobileNumber)) {
        toast({
            variant: "destructive",
            title: "Sign Up Failed",
            description: "Please enter a valid 10-digit mobile number.",
        });
        return;
    }
     if (!role) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: "Please select a role.",
      });
      return;
    }
    if (isBranchRequired && !branch.trim()) {
        toast({
            variant: "destructive",
            title: "Sign Up Failed",
            description: "Branch name is required for this role.",
        });
        return;
    }
    if (isReferralRequired) {
      if (!referralCode) {
        toast({
          variant: "destructive",
          title: "Sign Up Failed",
          description: "A referral code is required for this role.",
        });
        return;
      }
      if (referralCode.length !== 6) {
        toast({
          variant: "destructive",
          title: "Sign Up Failed",
          description: "Referral code must be 6 characters long.",
        });
        return;
      }
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createUserProfile(userCredential.user, name, mobileNumber, role, referralCode.toUpperCase(), branch, isSalesman ? salesmanStage : undefined);
      toast({
        title: "Account Created",
        description: "You have been successfully signed up.",
      });
      router.push("/");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-auth-gradient p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
                <Image src="/my-logo.png" alt="LEXORA Logo" width={48} height={48} />
            </div>
            <CardTitle className="text-3xl">Create an Account</CardTitle>
            <CardDescription>Enter your details to join the network.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignup}>
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
                       if (newRole !== 'Team Operation Manager') {
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
                    Sign Up
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
    </div>
  );
}
