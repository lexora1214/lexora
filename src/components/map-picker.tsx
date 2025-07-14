
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import Image from 'next/image';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { LocateFixed, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const containerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: 'var(--radius)',
};

// A default center for the map, e.g., Colombo, Sri Lanka
const defaultCenter = {
  lat: 6.9271,
  lng: 79.8612,
};

interface MapPickerProps {
  onLocationChange?: (location: { lat: number; lng: number }) => void;
  initialPosition?: { lat: number; lng: number } | null;
  isDisplayOnly?: boolean;
}

const MapPicker: React.FC<MapPickerProps> = ({ onLocationChange, initialPosition, isDisplayOnly = false }) => {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey,
  });

  const [map, setMap] = React.useState<google.maps.Map | null>(null)
  const [markerPosition, setMarkerPosition] = useState(initialPosition || null);
  const [isOnline, setIsOnline] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check network status on component mount and listen for changes
    const updateOnlineStatus = () => {
        setIsOnline(typeof navigator.onLine === 'boolean' ? navigator.onLine : true);
    };
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus(); // Set initial status

    return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (isDisplayOnly || !onLocationChange) return;
      if (event.latLng) {
        const newPos = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        };
        setMarkerPosition(newPos);
        onLocationChange(newPos);
      }
    },
    [onLocationChange, isDisplayOnly]
  );
  
  const handleGetCurrentLocation = () => {
    if (isDisplayOnly || !onLocationChange) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setMarkerPosition(newPos);
          onLocationChange(newPos);
          toast({
            title: "Location Captured",
            description: "Your current location has been set.",
          });
          if (map && isOnline) {
            map.panTo(newPos);
            map.setZoom(15);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          toast({
            variant: "destructive",
            title: "Location Error",
            description: `Could not get your location: ${error.message}`,
          });
        }
      );
    } else {
        toast({
            variant: "destructive",
            title: "Location Error",
            description: "Geolocation is not supported by this browser.",
        });
    }
  };

  const onMapLoad = React.useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(mapInstance)
  }, [])

  const onMapUnmount = React.useCallback(function callback(mapInstance: google.maps.Map) {
    setMap(null)
  }, [])

  if (loadError) {
    return (
        <div className="text-destructive text-center text-sm p-4 border border-destructive/50 rounded-md bg-destructive/10 h-[300px] flex items-center justify-center">
            Error loading map. Please ensure the Google Maps API key is configured correctly and you are online.
        </div>
    );
  }

  const renderOfflineContent = () => {
    if (markerPosition) {
        const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${markerPosition.lat},${markerPosition.lng}&zoom=15&size=600x300&maptype=roadmap&markers=color:red%7C${markerPosition.lat},${markerPosition.lng}&key=${googleMapsApiKey}`;
        return (
            <div className="relative h-[300px] w-full">
                <Image src={staticMapUrl} layout="fill" objectFit="cover" alt="Static map of location" data-ai-hint="map location" />
                 <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
                    <WifiOff className="h-8 w-8 text-muted-foreground mb-2"/>
                    <p className="text-muted-foreground text-center font-semibold">Offline: Showing static map</p>
                </div>
            </div>
        );
    }
    return (
        <div className="relative h-[300px] w-full flex flex-col items-center justify-center bg-muted rounded-lg">
            <WifiOff className="h-10 w-10 text-muted-foreground mb-2"/>
            <p className="text-muted-foreground text-center font-semibold">You are offline.</p>
            <p className="text-muted-foreground text-center text-sm">Map view is unavailable. You can still capture location.</p>
        </div>
    );
  };

  return (
    <div className="relative">
      {!isLoaded ? (
        <Skeleton className="h-[300px] w-full rounded-lg" />
      ) : isOnline ? (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={markerPosition || defaultCenter}
          zoom={markerPosition ? 15 : 8}
          onClick={handleMapClick}
          onLoad={onMapLoad}
          onUnmount={onMapUnmount}
          options={{
            fullscreenControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            zoomControl: true,
            clickableIcons: !isDisplayOnly,
            gestureHandling: isDisplayOnly ? 'cooperative' : 'auto',
          }}
        >
          {markerPosition && <Marker position={markerPosition} />}
        </GoogleMap>
      ) : (
        renderOfflineContent()
      )}
      {!isDisplayOnly && (
        <Button 
          type="button" 
          variant="secondary"
          size="icon"
          onClick={handleGetCurrentLocation}
          className="absolute bottom-3 right-3 rounded-full shadow-lg z-20"
          title="Use my current location"
        >
          <LocateFixed className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
};

export default MapPicker;
