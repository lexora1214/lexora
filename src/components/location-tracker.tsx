
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

const LocationTracker: React.FC<LocationTrackerProps> = ({ user }) => {
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const handleLocationSuccess = useCallback((position: GeolocationPosition) => {
    // If the error dialog was showing, hide it
    if (showErrorDialog) {
      setShowErrorDialog(false);
    }
    
    updateUser(user.id, {
      liveLocation: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      lastLocationUpdate: new Date().toISOString(),
    }).catch(console.error);
  }, [user.id, showErrorDialog]);
  
  const handleLocationError = useCallback((error: GeolocationPositionError) => {
    console.error(`Location Error: ${error.message}`);
    // Show the dialog to alert the user
    setShowErrorDialog(true);
  }, []);

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
    };
  }, [handleLocationSuccess, handleLocationError]);

  return (
    <AlertDialog open={showErrorDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            Location Access Required
          </AlertDialogTitle>
          <AlertDialogDescription>
            <div>
              Location tracking is required to use the app. Please enable location services in your browser and for this site to continue.
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LocationTracker;
