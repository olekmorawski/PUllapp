// hooks/useTripRoute.ts - Fixed version
import { useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { DirectionsService } from '@/components/DirectionsService';

interface UseTripRouteProps {
    userPickupCoords: [number, number] | null;
    driverStartLat: number;
    driverStartLng: number;
    setRouteToPickupGeoJSON: (route: GeoJSON.Feature | null) => void;
    setDriverCoords: (coords: [number, number]) => void;
    setCurrentLegIndex: (index: number) => void;
    setIsLoadingRoute: (loading: boolean) => void;
}

export const useTripRoute = ({
                                 userPickupCoords,
                                 driverStartLat,
                                 driverStartLng,
                                 setRouteToPickupGeoJSON,
                                 setDriverCoords,
                                 setCurrentLegIndex,
                                 setIsLoadingRoute,
                             }: UseTripRouteProps) => {
    const directionsService = useRef(new DirectionsService()).current;
    const isCalculatingRef = useRef(false);
    const lastCalculationRef = useRef<string>('');

    const calculateTripRoute = useCallback(async (
        pickupCoords: [number, number],
        driverLat: number,
        driverLng: number
    ) => {
        const calculationKey = `${driverLat},${driverLng}-${pickupCoords[1]},${pickupCoords[0]}`;

        // Prevent duplicate calculations
        if (isCalculatingRef.current || lastCalculationRef.current === calculationKey) {
            return;
        }

        isCalculatingRef.current = true;
        lastCalculationRef.current = calculationKey;

        setIsLoadingRoute(true);
        setRouteToPickupGeoJSON(null);

        try {
            const initialDriverLocationForRoute = {
                longitude: driverLng,
                latitude: driverLat
            };

            const routeData = await directionsService.getDirections(
                initialDriverLocationForRoute,
                { longitude: pickupCoords[0], latitude: pickupCoords[1] }
            );

            // Only update if this is still the current calculation
            if (lastCalculationRef.current === calculationKey) {
                setRouteToPickupGeoJSON(routeData.geoJSON);

                if (routeData.geoJSON?.geometry?.type === 'LineString' &&
                    routeData.geoJSON.geometry.coordinates.length > 0) {
                    setDriverCoords(routeData.geoJSON.geometry.coordinates[0] as [number, number]);
                    setCurrentLegIndex(0);
                } else {
                    setDriverCoords([driverLng, driverLat]);
                }
            }
        } catch (error: any) {
            // Only show error if this is still the current calculation
            if (lastCalculationRef.current === calculationKey) {
                console.error('Trip route calculation error:', error);
                Alert.alert('Route Error', error.message || 'Failed to calculate route for driver to pickup.');
                setRouteToPickupGeoJSON(null);
                setDriverCoords([driverLng, driverLat]);
            }
        } finally {
            isCalculatingRef.current = false;
            setIsLoadingRoute(false);
        }
    }, [directionsService, setRouteToPickupGeoJSON, setDriverCoords, setCurrentLegIndex, setIsLoadingRoute]);

    useEffect(() => {
        if (!userPickupCoords) {
            // Clear route if no pickup coordinates
            if (lastCalculationRef.current !== '') {
                setRouteToPickupGeoJSON(null);
                setIsLoadingRoute(false);
                lastCalculationRef.current = '';
            }
            return;
        }

        const calculationKey = `${driverStartLat},${driverStartLng}-${userPickupCoords[1]},${userPickupCoords[0]}`;

        // Only calculate if this is a new route
        if (calculationKey !== lastCalculationRef.current) {
            calculateTripRoute(userPickupCoords, driverStartLat, driverStartLng);
        }
    }, [
        userPickupCoords?.[0],
        userPickupCoords?.[1],
        driverStartLat,
        driverStartLng,
        calculateTripRoute
    ]);

    return {
        directionsService,
        isCalculating: isCalculatingRef.current,
        clearRoute: useCallback(() => {
            isCalculatingRef.current = false;
            lastCalculationRef.current = '';
            setRouteToPickupGeoJSON(null);
            setIsLoadingRoute(false);
        }, [setRouteToPickupGeoJSON, setIsLoadingRoute])
    };
};