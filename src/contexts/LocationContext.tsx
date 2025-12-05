'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface LocationContextType {
    latitude: number | null;
    longitude: number | null;
    error: string | null;
    loading: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setLoading(false);
            return;
        }

        const success = (position: GeolocationPosition) => {
            setLatitude(position.coords.latitude);
            setLongitude(position.coords.longitude);
            setLoading(false);
            console.log('Location retrieved:', {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            });
        };

        const fail = (error: GeolocationPositionError) => {
            setError(`Unable to retrieve your location: ${error.message}`);
            setLoading(false);
            console.error('Location retrieval failed:', error.message);
        };

        navigator.geolocation.getCurrentPosition(success, fail);
    }, []);

    return (
        <LocationContext.Provider value={{ latitude, longitude, error, loading }}>
            {children}
        </LocationContext.Provider>
    );
}

export function useLocation() {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
}
