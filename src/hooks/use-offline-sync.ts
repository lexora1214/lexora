import { useState, useEffect } from "react";
import { onSnapshot, collection, getFirestore } from "firebase/firestore";

export function useOfflineSync() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // This listener checks for pending writes in Firestore's offline queue.
    // We listen to a collection (e.g., 'users') just to get the metadata.
    const db = getFirestore();
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      setHasPendingWrites(snapshot.metadata.hasPendingWrites);
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, []);

  return { isOffline, hasPendingWrites };
}
