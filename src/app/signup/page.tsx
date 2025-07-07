
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfile, getSignupRoleSettings } from "@/lib/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, LoaderCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Role } from "@/types";

const ALL_ROLES: Role[] = ["Admin", "Shop Manager", "Regional Director", "Head Group Manager", "Group Operation Manager", "Team Operation Manager", "Salesman"];

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [visibleRoles, setVisibleRoles] = useState<Record<string, boolean> | null>(null);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const isReferralRequired = role && !['Regional Director', 'Admin', 'Shop Manager'].includes(role);

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
     if (!role) {
      toast({
        variant: "destructive",
        title: "Sign Up Failed",
        description: "Please select a role.",
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
      await createUserProfile(userCredential.user, name, role, referralCode.toUpperCase());
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
                <DollarSign className="h-12 w-12 text-primary" />
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
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                   <Select value={role} onValueChange={(value) => {
                       const newRole = value as Role;
                       setRole(newRole);
                       if (['Regional Director', 'Admin', 'Shop Manager'].includes(newRole)) {
                           setReferralCode('');
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
