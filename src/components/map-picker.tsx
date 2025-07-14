
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
  lat: 7.8731, // Centered on Sri Lanka
  lng: 80.7718,
};

interface MapPickerProps {
  onLocationChange?: (location: { lat: number; lng: number }) => void;
  initialPosition?: { lat: number; lng: number } | null;
  isDisplayOnly?: boolean;
}

// SVG map of Sri Lanka. Sourced from Wikimedia Commons, public domain.
const SriLankaMapSVG = ({ markerPosition }: { markerPosition: { lat: number; lng: number } | null }) => {
  // Rough conversion from lat/lng to SVG coordinates for Sri Lanka's bounding box.
  // BBox: (5.92, 79.68) to (9.83, 81.88)
  const latToY = (lat: number) => 100 - ((lat - 5.92) / (9.83 - 5.92)) * 100;
  const lngToX = (lng: number) => ((lng - 79.68) / (81.88 - 79.68)) * 100;

  let markerCoords = null;
  if (markerPosition) {
    markerCoords = {
      x: lngToX(markerPosition.lng),
      y: latToY(markerPosition.lat),
    };
  }

  return (
    <div className="relative h-[300px] w-full flex flex-col items-center justify-center bg-muted rounded-lg overflow-hidden">
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 165 242"
            className="w-full h-full object-contain"
            preserveAspectRatio="xMidYMid meet"
        >
            <path
            d="M86.13,2.79C81.84,2,77.3,1.63,73.1,1.17c-13-1.47-26.16,0.3-38.6,4.73c-6.19,2.2-11.83,5.5-16.71,9.88 c-5,4.5-8.8,10-10,16.27C7,39.3,7.5,46.59,8.71,53.52c1.4,7.88,4,15.54,7.49,22.6c3.41,6.91,7.8,13.29,12.72,19.23 c5.06,6.1,10.61,11.72,16.51,16.96c10.43,9.26,22.4,16.3,35.29,21.57c15.2,6.23,31.24,9.6,47.41,11.39 c-0.74,1.16-1.12,2.44-1.3,3.78c-0.2,1.52-0.08,3.06,0.28,4.55c1.6,6.48,5.43,11.89,11.16,15.35 c-2.09,3.68-4.32,7.31-6.72,10.87c-3.32,4.92-6.93,9.64-10.74,14.15c-3.59,4.24-7.4,8.23-11.38,12.01 c-3.83,3.64-7.8,7.05-11.86,10.3c-2.43,1.94-4.88,3.84-7.35,5.7c-2.8,2.11-5.63,4.16-8.46,6.2 c-0.89,0.64-1.78,1.28-2.67,1.92c-1.5,1.07-3,2.13-4.5,3.19c-0.34,0.24-0.67,0.48-1.01,0.72c-1.16,0.82-2.32,1.64-3.48,2.46 c-1.01,0.71-2.02,1.42-3.03,2.13c-0.69,0.48-1.38,0.96-2.07,1.44c-1.17,0.81-2.34,1.62-3.51,2.43 c-0.95,0.65-1.9,1.3-2.85,1.95c-1.55,1.06-3.1,2.12-4.65,3.18c-0.3,0.2-0.6,0.4-0.9,0.6c-0.9,0.6-1.8,1.2-2.7,1.8 c-1.3,0.86-2.6,1.72-3.9,2.58c-0.7,0.46-1.4,0.92-2.1,1.38c-1.14,0.75-2.28,1.5-3.42,2.25c-0.5,0.32-1,0.64-1.5,0.96 c-1.51,0.96-3.02,1.92-4.53,2.88c-0.22,0.14-0.44,0.28-0.66,0.42c-0.76,0.48-1.52,0.96-2.28,1.44 c-1.2,0.75-2.4,1.5-3.6,2.25c-0.35,0.21-0.7,0.42-1.05,0.63c-1.17,0.71-2.34,1.42-3.51,2.13c-0.5,0.3-1,0.6-1.5,0.9 c-1.14,0.68-2.28,1.36-3.42,2.04c-0.5,0.3-1,0.6-1.5,0.9c-0.99,0.59-1.98,1.18-2.97,1.77 c-0.69,0.41-1.38,0.82-2.07,1.23c-1.2,0.71-2.4,1.42-3.6,2.13c-0.35,0.2-0.7,0.4-1.05,0.6c-1.09,0.64-2.18,1.28-3.27,1.92 c-0.76,0.44-1.52,0.88-2.28,1.32c-1.2,0.7-2.4,1.4-3.6,2.1c-0.28,0.16-0.56,0.32-0.84,0.48c-0.6,0.34-1.2,0.68-1.8,1.02 c-1.1,0.62-2.2,1.24-3.3,1.86c-0.22,0.12-0.44,0.24-0.66,0.36c-0.66,0.36-1.32,0.72-1.98,1.08 c-1.29,0.7-2.58,1.4-3.87,2.1c-0.19,0.1-0.38,0.2-0.57,0.3c-0.63,0.35-1.26,0.7-1.89,1.05c-1.19,0.66-2.38,1.32-3.57,1.98 c-0.1,0.05-0.2,0.1-0.3,0.15c-0.66,0.35-1.32,0.7-1.98,1.05c-1.15,0.6-2.3,1.2-3.45,1.8c-0.3,0.15-0.6,0.3-0.9,0.45 c-0.9,0.45-1.8,0.9-2.7,1.35c-1.34,0.67-2.68,1.34-4.02,2.01c1.23,0.11,2.44,0.33,3.61,0.69 c12.91,3.89,26.4,5.4,39.69,4.28c12.21-1.03,24.1-4.7,34.9-10.49c8.24-4.44,15.6-10.3,21.73-17.2 c4.98-5.6,8.8-12.04,11.33-18.96c2.4-6.55,3.48-13.4,3.2-20.25c-0.49-11.83-4.52-23.1-11.38-32.32 c-4.76-6.38-10.6-11.75-17.18-15.82c-10.6-6.49-22.39-10.02-34.69-10.51c-8.9-0.36-17.75,0.85-26.24,3.53 c-3.23,1.02-6.34,2.4-9.29,4.11c-1.37,0.79-2.71,1.67-4.01,2.6c-4.43,3.15-8.4,6.9-11.69,11.08 c-4.23,5.4-7.1,11.6-8.23,18.06c-1.11,6.33-0.4,12.8,1.96,18.77c1.37,3.47,3.3,6.77,5.69,9.79 c3.03,3.83,6.6,7.18,10.59,9.91c7.22,4.94,15.42,8.01,23.95,9.02c8.2,0.97,16.48-0.1,24.32-3.03 c7.5-2.82,14.43-7.44,20.17-13.3c3.7-3.79,6.86-8.15,9.22-12.86c3.27-6.51,5.16-13.6,5.33-20.81 c0.12-5.11-0.96-10.18-3.15-14.83c-2.48-5.27-6.23-9.8-10.9-13.16c-8.73-6.27-19.16-9.52-29.82-9.43 c-12.55,0.11-24.9,3.92-35.8,10.64c-6.8,4.19-12.78,9.45-17.65,15.47c-5.28,6.54-9.08,13.9-11.13,21.68 c-2.09,7.96-2.43,16.23-1.02,24.18c1.68,9.45,5.55,18.33,11.15,25.86c6.03,8.12,13.6,14.8,22.2,19.53 c11.9,6.59,25.01,10.1,38.38,10.27c12.23,0.16,24.38-2.61,35.65-7.97c9.55-4.55,18.25-10.8,25.56-18.36 c7.67-8,13.79-17.5,17.91-27.9c4.2-10.57,6.37-21.73,6.37-32.96c0-11.45-2.28-22.82-6.66-33.36 c-4.5-10.81-11.02-20.5-19.1-28.43C122.3,10.43,111.43,4.1,98.81,1.17C94.27,0.24,89.5-0.09,84.79,0.05 C84.79,0.92,84.8,1.79,84.8,2.67"
            fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--border))" strokeWidth="0.5"
            />
        </svg>

        {markerCoords && (
            <div
                className="absolute w-4 h-4"
                style={{
                    left: `calc(${markerCoords.x}% - 8px)`,
                    top: `calc(${markerCoords.y}% - 8px)`,
                }}
            >
                <div className="w-full h-full rounded-full bg-destructive ring-2 ring-white shadow-lg animate-pulse"></div>
            </div>
        )}

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
            <WifiOff className="h-8 w-8 text-muted-foreground mb-2"/>
            <p className="text-muted-foreground text-center font-semibold">Offline: Showing static map of Sri Lanka</p>
        </div>
    </div>
  );
};


const MapPicker: React.FC<MapPickerProps> = ({ onLocationChange, initialPosition, isDisplayOnly = false }) => {
  const [isOnline, setIsOnline] = useState(true);
  
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
  
  // Conditionally render the map loader hook
  return isOnline ? (
    <OnlineMapPicker 
      onLocationChange={onLocationChange} 
      initialPosition={initialPosition} 
      isDisplayOnly={isDisplayOnly}
    />
  ) : (
    <OfflineMapPicker 
      onLocationChange={onLocationChange} 
      initialPosition={initialPosition} 
      isDisplayOnly={isDisplayOnly}
    />
  );
};

const OnlineMapPicker: React.FC<MapPickerProps> = ({ onLocationChange, initialPosition, isDisplayOnly = false }) => {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey,
  });

  const [map, setMap] = React.useState<google.maps.Map | null>(null)
  const [markerPosition, setMarkerPosition] = useState(initialPosition || null);
  const { toast } = useToast();

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
          if (map) {
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
    return <OfflineMapPicker onLocationChange={onLocationChange} initialPosition={initialPosition} isDisplayOnly={isDisplayOnly} />;
  }

  return (
    <div className="relative">
      {!isLoaded ? (
         <Skeleton className="h-[300px] w-full rounded-lg" />
      ) : (
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

const OfflineMapPicker: React.FC<MapPickerProps> = ({ onLocationChange, initialPosition, isDisplayOnly = false }) => {
  const [markerPosition, setMarkerPosition] = useState(initialPosition || null);
  const { toast } = useToast();

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
            title: "Location Captured (Offline)",
            description: "Your current location has been set.",
          });
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

  return (
    <div className="relative">
      <SriLankaMapSVG markerPosition={markerPosition} />
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

    