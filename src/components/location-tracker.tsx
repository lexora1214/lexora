
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { User } from '@/types';
import { updateUser } from '@/lib/firestore';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, LoaderCircle } from 'lucide-react';

interface LocationTrackerProps {
  user: User;
}

const LOCATION_UPDATE_INTERVAL = 30000; // 30 seconds
const ACCOUNT_DISABLE_TIMEOUT = 120000; // 2 minutes

const LocationTracker: React.FC<LocationTrackerProps> = ({ user }) => {
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [countdown, setCountdown] = useState(ACCOUNT_DISABLE_TIMEOUT / 1000);
  const watchIdRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const clearWatch = () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };

    const handleLocationSuccess = (position: GeolocationPosition) => {
      if (showErrorDialog) {
        setShowErrorDialog(false);
        if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setCountdown(ACCOUNT_DISABLE_TIMEOUT / 1000);
      }

      updateUser(user.id, {
        liveLocation: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        lastLocationUpdate: new Date().toISOString(),
        isDisabled: false, // Re-enable account if location is restored
      }).catch(console.error);
    };

    const handleLocationError = (error: GeolocationPositionError) => {
      console.error(`Location Error: ${error.message}`);
      setShowErrorDialog(true);
      clearWatch();
      
      // Start countdown to disable account
      if (timeoutIdRef.current === null) {
        timeoutIdRef.current = setTimeout(() => {
          updateUser(user.id, { isDisabled: true }).catch(console.error);
        }, ACCOUNT_DISABLE_TIMEOUT);
      }

      if (countdownIntervalRef.current === null) {
        countdownIntervalRef.current = setInterval(() => {
            setCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
      }
    };

    const startWatching = () => {
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
    };

    startWatching();

    return () => {
      clearWatch();
      if (timeoutIdRef.current) clearTimeout(timeoutIdRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [user.id, showErrorDialog]);

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
          <AlertDialogDescription>
            This application requires access to your location to function properly. Please enable location services in your browser and for this site.
            <div className="mt-4 p-4 bg-destructive/10 rounded-lg text-center">
                <p className="text-sm text-destructive font-semibold">Your account will be automatically disabled if location is not enabled.</p>
                <p className="text-2xl font-mono font-bold text-destructive mt-2">{formatCountdown(countdown)}</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LocationTracker;
