import { useEffect, useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
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

    // Track last processed location to prevent unnecessary updates
    const [lastProcessedLocation, setLastProcessedLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);

    // Helper function to calculate distance between two coordinates in meters
    const getDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }, []);

    // Check if location update is significant enough to process
    const shouldProcessLocationUpdate = useCallback((newCoords: Location.LocationObjectCoords): boolean => {
        if (!lastProcessedLocation) return true;

        const distance = getDistance(
            lastProcessedLocation.latitude,
            lastProcessedLocation.longitude,
            newCoords.latitude,
            newCoords.longitude
        );

        // Only process if moved more than 100 meters
        return distance > 100;
    }, [lastProcessedLocation, getDistance]);

    // Create location data from coordinates
    const createLocationData = useCallback((coords: Location.LocationObjectCoords): LocationData => {
        return {
            coordinates: coords,
            address: `Current Location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`,
            isCurrentLocation: true,
        };
    }, []);

    // Set initial origin location when user location is available
    useEffect(() => {
        if (userLocation && !origin && shouldProcessLocationUpdate(userLocation.coords)) {
            const locationData = createLocationData(userLocation.coords);

            setOrigin(locationData);
            onLocationSelect?.('origin', locationData);

            // Update last processed location
            setLastProcessedLocation({
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
            });
        }

        if (locationError) {
            Alert.alert('Location Error', 'Unable to access your location.');
        }
    }, [
        userLocation,
        locationError,
        origin,
        setOrigin,
        onLocationSelect,
        shouldProcessLocationUpdate,
        createLocationData
    ]);

    // Handle location updates from map with distance threshold
    const handleLocationUpdate = useCallback((location: Location.LocationObject) => {
        const coords = location.coords;

        // Only update if this is a current location origin and the move is significant
        if (origin?.isCurrentLocation && shouldProcessLocationUpdate(coords)) {
            const locationData = createLocationData(coords);

            setOrigin(locationData);
            onLocationSelect?.('origin', locationData);

            // Update last processed location
            setLastProcessedLocation({
                latitude: coords.latitude,
                longitude: coords.longitude,
            });
        }
    }, [origin, setOrigin, onLocationSelect, shouldProcessLocationUpdate, createLocationData]);

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

    // Force location update (for manual refresh)
    const forceLocationUpdate = useCallback(() => {
        if (userLocation) {
            const locationData = createLocationData(userLocation.coords);
            setOrigin(locationData);
            onLocationSelect?.('origin', locationData);

            setLastProcessedLocation({
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
            });
        }
    }, [userLocation, createLocationData, setOrigin, onLocationSelect]);

    return {
        userLocation,
        locationError,
        isGettingLocation,
        handleLocationUpdate,
        getInitialRegion,
        forceLocationUpdate, // New utility function for manual refresh
    };
};