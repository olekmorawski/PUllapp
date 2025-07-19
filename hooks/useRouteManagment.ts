// hooks/useRouteManagement.ts
import { useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { DirectionsService } from '@/components/DirectionsService';
import { LocationData } from './useRideAppState';
import {Feature} from "geojson";

interface UseRouteManagementProps {
    origin: LocationData | null;
    destination: LocationData | null;
    setRouteGeoJSON: (route: Feature | null) => void;
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
    const directionsService = new DirectionsService();

    const calculateRoute = useCallback(async () => {
        if (!origin || !destination) {
            setRouteGeoJSON(null);
            setRouteInfo(null);
            return;
        }

        setIsLoadingRoute(true);
        setRouteGeoJSON(null);
        setRouteInfo(null);

        try {
            const routeData = await directionsService.getDirections(
                origin.coordinates,
                destination.coordinates
            );

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

        } catch (error: any) {
            Alert.alert('Route Error', error.message || 'Failed to calculate route');
        } finally {
            setIsLoadingRoute(false);
        }
    }, [origin, destination, directionsService, setRouteGeoJSON, setRouteInfo, setIsLoadingRoute]);

    // Calculate route when origin/destination changes
    useEffect(() => {
        calculateRoute();
    }, [calculateRoute]);

    const clearRoute = useCallback(() => {
        setRouteGeoJSON(null);
        setRouteInfo(null);
        setIsLoadingRoute(false);
    }, [setRouteGeoJSON, setRouteInfo, setIsLoadingRoute]);

    return {
        calculateRoute,
        clearRoute,
    };
};