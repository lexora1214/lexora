
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { User } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, WifiOff } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface LiveLocationViewProps {
  allUsers: User[];
}

const containerStyle = {
  width: '100%',
  height: '600px',
  borderRadius: 'var(--radius)',
};

const defaultCenter = {
  lat: 7.8731, // Sri Lanka
  lng: 80.7718,
};

const OFFLINE_THRESHOLD_MINUTES = 2;

const LiveLocationView: React.FC<LiveLocationViewProps> = ({ allUsers }) => {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey,
  });

  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
        setNow(new Date());
    }, 60000); // Update 'now' every minute to re-calculate online status
    return () => clearInterval(interval);
  }, []);

  const isUserOnline = (user: User) => {
    if (!user.lastLocationUpdate) return false;
    const lastUpdate = new Date(user.lastLocationUpdate);
    const diffMinutes = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);
    return diffMinutes < OFFLINE_THRESHOLD_MINUTES;
  }
  
  const onlineSalesmen = useMemo(() => {
      return allUsers.filter(user => user.role === 'Salesman' && user.liveLocation && user.lastLocationUpdate && isUserOnline(user));
  }, [allUsers, now]);

  const handleRefresh = () => {
    if (map) {
        map.panTo(defaultCenter);
        map.setZoom(8);
    }
    setNow(new Date()); // Force re-render of online status
  };


  if (loadError || !navigator.onLine) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Live Salesman Location</CardTitle>
          <CardDescription>Track the real-time location of your sales team.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px] w-full flex flex-col items-center justify-center bg-muted rounded-lg">
            <WifiOff className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-semibold">Map could not be loaded.</p>
            <p className="text-sm text-muted-foreground">Please check your internet connection and API key.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
         <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <CardTitle>Live Salesman Location</CardTitle>
                <CardDescription>
                    Showing {onlineSalesmen.length} active salesmen. Markers disappear if location is offline for more than {OFFLINE_THRESHOLD_MINUTES} minutes.
                </CardDescription>
            </div>
            <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Map
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!isLoaded ? (
          <Skeleton className="h-[600px] w-full" />
        ) : (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={defaultCenter}
            zoom={8}
            onLoad={mapInstance => setMap(mapInstance)}
            options={{
              fullscreenControl: false,
              streetViewControl: false,
              mapTypeControl: false,
              zoomControl: true,
            }}
          >
            {onlineSalesmen.map(user => {
              return (
              <MarkerF
                key={user.id}
                position={{ lat: user.liveLocation!.latitude, lng: user.liveLocation!.longitude }}
                onClick={() => setActiveMarker(user.id)}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: '#10B981', // green-500
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 2,
                }}
              >
                {activeMarker === user.id && (
                  <InfoWindowF onCloseClick={() => setActiveMarker(null)}>
                    <div className="p-1">
                      <h3 className="font-bold">{user.name}</h3>
                      <p className="text-sm">{user.salesmanStage}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Last seen: {formatDistanceToNow(new Date(user.lastLocationUpdate!), { addSuffix: true })}
                      </p>
                      <Badge variant={'success'} className="mt-2">
                        Online
                      </Badge>
                    </div>
                  </InfoWindowF>
                )}
              </MarkerF>
            )})}
          </GoogleMap>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveLocationView;
