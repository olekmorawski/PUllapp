// hooks/useRouteManagement.ts - Fixed version
import { useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { DirectionsService } from '@/components/DirectionsService';
import { LocationData } from './useRideAppState';

interface UseRouteManagementProps {
    origin: LocationData | null;
    destination: LocationData | null;
    setRouteGeoJSON: (route: GeoJSON.Feature | null) => void;
    setRouteInfo: (info: any) => void;
    setIsLoadingRoute: (loading: boolean) => void;
}

export const useRouteManagement = ({
                                       origin,
                                       destination,
                                       setRouteGeoJSON,
                                       setRouteInfo,
                                       setIsLoadingRoute,
                                   }: UseRouteManagementProps) => {
    const directionsService = useRef(new DirectionsService()).current;
    const isCalculatingRef = useRef(false);
    const lastRouteKeyRef = useRef<string>('');

    // Create a stable route key to avoid unnecessary recalculations
    const createRouteKey = useCallback((origin: LocationData | null, destination: LocationData | null): string => {
        if (!origin || !destination) return '';
        return `${origin.coordinates.latitude},${origin.coordinates.longitude}-${destination.coordinates.latitude},${destination.coordinates.longitude}`;
    }, []);

    const calculateRoute = useCallback(async (
        originData: LocationData,
        destinationData: LocationData,
        routeKey: string
    ) => {
        // Prevent concurrent calculations and unnecessary recalculations
        if (isCalculatingRef.current || lastRouteKeyRef.current === routeKey) {
            return;
        }

        isCalculatingRef.current = true;
        lastRouteKeyRef.current = routeKey;

        setIsLoadingRoute(true);
        setRouteGeoJSON(null);
        setRouteInfo(null);

        try {
            const routeData = await directionsService.getDirections(
                originData.coordinates,
                destinationData.coordinates
            );

            // Double-check we're still working on the same route
            if (lastRouteKeyRef.current === routeKey) {
                setRouteGeoJSON(routeData.geoJSON);
                setRouteInfo({
                    distance: routeData.distanceText,
                    duration: routeData.durationText,
                    distanceValue: routeData.distance,
                    durationValue: routeData.duration,
                });

                // Update ride estimates
                const distanceKm = routeData.distance / 1000;
                const baseFare = 3;
                const perKmRate = 1.5;
                const estimatedPrice = baseFare + distanceKm * perKmRate;
                console.log('Updated estimates for', distanceKm.toFixed(1), 'km route');
            }

        } catch (error: any) {
            // Only show error if we're still working on the same route
            if (lastRouteKeyRef.current === routeKey) {
                console.error('Route calculation error:', error);
                Alert.alert('Route Error', error.message || 'Failed to calculate route');
                setRouteGeoJSON(null);
                setRouteInfo(null);
            }
        } finally {
            isCalculatingRef.current = false;
            setIsLoadingRoute(false);
        }
    }, [directionsService, setRouteGeoJSON, setRouteInfo, setIsLoadingRoute]);

    // Calculate route when origin/destination changes
    useEffect(() => {
        const routeKey = createRouteKey(origin, destination);

        if (!origin || !destination || !routeKey) {
            // Clear route if origin or destination is missing
            if (lastRouteKeyRef.current !== '') {
                setRouteGeoJSON(null);
                setRouteInfo(null);
                setIsLoadingRoute(false);
                lastRouteKeyRef.current = '';
            }
            return;
        }

        // Only calculate if this is a new route
        if (routeKey !== lastRouteKeyRef.current) {
            calculateRoute(origin, destination, routeKey);
        }
    }, [origin?.coordinates.latitude, origin?.coordinates.longitude, destination?.coordinates.latitude, destination?.coordinates.longitude, calculateRoute, createRouteKey]);

    const clearRoute = useCallback(() => {
        isCalculatingRef.current = false;
        lastRouteKeyRef.current = '';
        setRouteGeoJSON(null);
        setRouteInfo(null);
        setIsLoadingRoute(false);
    }, [setRouteGeoJSON, setRouteInfo, setIsLoadingRoute]);

    const manualCalculateRoute = useCallback(() => {
        if (!origin || !destination) {
            Alert.alert('Missing Information', 'Please select both origin and destination');
            return;
        }

        const routeKey = createRouteKey(origin, destination);
        // Force recalculation by clearing the last route key
        lastRouteKeyRef.current = '';
        calculateRoute(origin, destination, routeKey);
    }, [origin, destination, calculateRoute, createRouteKey]);

    return {
        calculateRoute: manualCalculateRoute,
        clearRoute,
        isCalculating: isCalculatingRef.current,
    };
};