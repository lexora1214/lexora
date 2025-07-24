
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
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const handleLocationSuccess = useCallback((position: GeolocationPosition) => {
    setShowErrorDialog(false);
    clearTimers();
    
    updateUser(user.id, {
      liveLocation: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      lastLocationUpdate: new Date().toISOString(),
      isDisabled: false, // Ensure account is enabled on success
    }).catch(console.error);
  }, [user.id, clearTimers]);
  
  const handleLocationError = useCallback((error: GeolocationPositionError) => {
    console.error(`Location Error: ${error.message}`);
    
    if (!showErrorDialog) {
      setShowErrorDialog(true);
      
      // Start countdown timer if not already running
      if (countdownIntervalRef.current === null) {
        setCountdown(ACCOUNT_DISABLE_TIMEOUT / 1000); // Reset countdown on new error
        countdownIntervalRef.current = setInterval(() => {
          setCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
      }
      
      // Start account disable timer if not already running
      if (timeoutIdRef.current === null) {
        timeoutIdRef.current = setTimeout(() => {
          updateUser(user.id, { isDisabled: true }).catch(console.error);
          // Don't clear timers here, so the dialog stays open
        }, ACCOUNT_DISABLE_TIMEOUT);
      }
    }
  }, [user.id, showErrorDialog]);

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

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      clearTimers();
    };
  }, [handleLocationSuccess, handleLocationError, clearTimers]);

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
