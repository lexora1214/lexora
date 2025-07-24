
"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { User } from '@/types';
import { updateUser } from '@/lib/firestore';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface LocationTrackerProps {
  user: User;
}

const LOCATION_UPDATE_INTERVAL = 10000; // 10 seconds for timeout
const ACCOUNT_DISABLE_TIMEOUT = 120000; // 2 minutes

const LocationTracker: React.FC<LocationTrackerProps> = ({ user }) => {
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [countdown, setCountdown] = useState(ACCOUNT_DISABLE_TIMEOUT / 1000);

  const watchIdRef = useRef<number | null>(null);
  const disableAccountTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startErrorTimers = useCallback(() => {
    // Only start timers if they aren't already running
    if (disableAccountTimerRef.current === null) {
      // Timer to disable the account after 2 minutes
      disableAccountTimerRef.current = setTimeout(() => {
        updateUser(user.id, { isDisabled: true }).catch(console.error);
        // The component will unmount or the user will be logged out, so timers will be cleared.
      }, ACCOUNT_DISABLE_TIMEOUT);
    }
    
    if (countdownIntervalRef.current === null) {
      // Timer to update the visual countdown every second
      setCountdown(ACCOUNT_DISABLE_TIMEOUT / 1000); // Reset visual countdown
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
  }, [user.id]);

  const clearErrorTimers = useCallback(() => {
    if (disableAccountTimerRef.current) {
      clearTimeout(disableAccountTimerRef.current);
      disableAccountTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const handleLocationSuccess = useCallback((position: GeolocationPosition) => {
    setShowErrorDialog(false);
    clearErrorTimers();
    
    updateUser(user.id, {
      liveLocation: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      lastLocationUpdate: new Date().toISOString(),
      isDisabled: false, // Ensure account is enabled on success
    }).catch(console.error);
  }, [user.id, clearErrorTimers]);
  
  const handleLocationError = useCallback((error: GeolocationPositionError) => {
    console.error(`Location Error: ${error.message}`);
    setShowErrorDialog(true);
    startErrorTimers();
  }, [startErrorTimers]);

  useEffect(() => {
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleLocationSuccess,
        handleLocationError,
        {
          enableHighAccuracy: true,
          timeout: LOCATION_UPDATE_INTERVAL,
          maximumAge: 0,
        }
      );
    } else {
       handleLocationError({
            code: 2, // Position unavailable
            message: "Geolocation is not supported by this browser.",
            PERMISSION_DENIED: 1,
            POSITION_UNAVAILABLE: 2,
            TIMEOUT: 3,
        });
    }

    // Cleanup function when the component unmounts
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      clearErrorTimers();
    };
  }, [handleLocationSuccess, handleLocationError, clearErrorTimers]);

  const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <AlertDialog open={showErrorDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Location Access Required
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              This application requires access to your location to function properly. Please enable location services in your browser and for this site.
              <div className="mt-4 p-4 bg-destructive/10 rounded-lg text-center">
                  <div className="text-sm text-destructive font-semibold">Your account will be automatically disabled if location is not enabled.</div>
                  <div className="text-2xl font-mono font-bold text-destructive mt-2">{formatCountdown(countdown)}</div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LocationTracker;
