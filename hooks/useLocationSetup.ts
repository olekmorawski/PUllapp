// hooks/useLocationSetup.ts
import { useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { useLocation } from '@/hooks/Location/useLocation';
import { LocationData } from './useRideAppState';

interface UseLocationSetupProps {
    origin: LocationData | null;
    setOrigin: (location: LocationData | null) => void;
    onLocationSelect?: (type: 'origin' | 'destination', location: LocationData) => void;
}

export const useLocationSetup = ({
                                     origin,
                                     setOrigin,
                                     onLocationSelect,
                                 }: UseLocationSetupProps) => {
    const {
        location: userLocation,
        error: locationError,
        isLoading: isGettingLocation,
    } = useLocation({ autoStart: true });

    // Set initial origin location when user location is available
    useEffect(() => {
        if (userLocation && !origin) {
            const address = `Current Location (${userLocation.coords.latitude.toFixed(4)}, ${userLocation.coords.longitude.toFixed(4)})`;
            const locationData: LocationData = {
                coordinates: userLocation.coords,
                address,
                isCurrentLocation: true,
            };
            setOrigin(locationData);
            onLocationSelect?.('origin', locationData);
        }

        if (locationError) {
            Alert.alert('Location Error', 'Unable to access your location.');
        }
    }, [userLocation, locationError, origin, setOrigin, onLocationSelect]);

    // Handle location updates from map
    const handleLocationUpdate = useCallback((mapboxLocation: Mapbox.Location) => {
        const coords = mapboxLocation.coords;
        if (origin?.isCurrentLocation) {
            const address = `Current Location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
            const locationData: LocationData = {
                coordinates: coords,
                address,
                isCurrentLocation: true,
            };
            setOrigin(locationData);
            onLocationSelect?.('origin', locationData);
        }
    }, [origin, setOrigin, onLocationSelect]);

    // Get initial map region
    const getInitialRegion = useCallback(() => {
        if (userLocation?.coords) {
            return {
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
        }
        return undefined;
    }, [userLocation]);

    return {
        userLocation,
        locationError,
        isGettingLocation,
        handleLocationUpdate,
        getInitialRegion,
    };
};