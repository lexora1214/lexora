
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import AppLayout from "@/components/app-layout";
import { User } from "@/types";
import { LoaderCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";

const DisabledUserView = () => {
  const router = useRouter();
  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-auth-gradient text-center p-4">
      <Ban className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-2xl font-bold text-foreground mb-2">Account Disabled</h1>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Your account is currently disabled. It may be pending administrator approval or has been deactivated. Please contact an administrator for assistance.
      </p>
      <Button onClick={handleLogout}>Back to Login</Button>
    </div>
  );
};


export default function HomePageClient() {
  const [firebaseUser, loadingAuth, errorAuth] = useAuthState(auth);
  const [appUser, setAppUser] = React.useState<User | null>(null);
  const [loadingUser, setLoadingUser] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    if (loadingAuth) {
      return; // Wait for auth state to be determined
    }
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }

    setLoadingUser(true);
    const userDocRef = doc(db, "users", firebaseUser.uid);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const userData = { id: docSnap.id, ...docSnap.data() } as User;
        setAppUser(userData);
        // If user is disabled, their view will be handled, but don't redirect
        if (userData.isDisabled) {
           console.log("User account is disabled.");
        }
      } else {
        // The user is authenticated but doesn't have a profile document.
        // This can happen if profile creation fails after signup.
        // Redirecting to login is a safe fallback.
        console.warn("User authenticated but no profile found in Firestore. Redirecting.");
        router.replace("/login");
      }
      setLoadingUser(false);
    }, (error) => {
      console.error("Error fetching user profile:", error);
      // If there's an error, it might be a network issue.
      // Don't redirect immediately, Firestore offline cache might have data.
      // Let the UI decide based on appUser state.
      setLoadingUser(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [firebaseUser, loadingAuth, router]);

  if (loadingAuth || (loadingUser && !appUser)) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (errorAuth) {
      // Handle auth error, e.g., redirect to an error page or login
      console.error("Authentication error:", errorAuth);
      router.replace("/login");
      return null;
  }
  
  // This check now correctly handles the initial load where firebaseUser is present but appUser isn't yet.
  if (!appUser) {
     // If still loading, show spinner. If not, and still no appUser, something is wrong.
     if (loadingUser) {
       return (
         <div className="flex h-screen w-full items-center justify-center">
           <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
         </div>
       );
     }
     // If done loading and no appUser, redirect.
     router.replace("/login");
     return null;
  }

  if (appUser.isDisabled) {
    return <DisabledUserView />;
  }

  return <AppLayout user={appUser} />;
}
