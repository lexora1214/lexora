"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
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

    setLoadingUser(true);
    const userDocRef = doc(db, "users", firebaseUser.uid);

    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setAppUser({ id: docSnap.id, ...docSnap.data() } as User);
      } else {
        console.error("Could not find user profile in Firestore.");
        router.replace("/login");
      }
      setLoadingUser(false);
    }, (error) => {
      console.error("Error fetching user profile:", error);
      router.replace("/login");
      setLoadingUser(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [firebaseUser, loadingAuth, router]);

  if (loadingAuth || loadingUser || !appUser) {
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

  return <AppLayout user={appUser} />;
}
