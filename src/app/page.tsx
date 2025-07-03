"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { getUser } from "@/lib/firestore";
import AppLayout from "@/components/app-layout";
import { User } from "@/types";
import { LoaderCircle } from "lucide-react";

export default function Home() {
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

    const fetchUser = async () => {
      setLoadingUser(true);
      const userProfile = await getUser(firebaseUser.uid);
      if (userProfile) {
        setAppUser(userProfile);
      } else {
        // This case might happen if the Firestore doc isn't created yet
        // or if there's an issue. For now, we'll treat it as an error.
        console.error("Could not find user profile in Firestore.");
        router.replace("/login");
      }
      setLoadingUser(false);
    };

    fetchUser();
  }, [firebaseUser, loadingAuth, router]);

  if (loadingAuth || loadingUser || !appUser) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
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

  return <AppLayout user={appUser} />;
}
