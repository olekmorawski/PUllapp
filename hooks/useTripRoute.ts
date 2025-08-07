import { useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { OSRMNavigationService } from '@/hooks/OSRMNavigationService';
import {Feature} from "geojson";

interface UseTripRouteProps {
    userPickupCoords: [number, number] | null;
    driverStartLat: number;
    driverStartLng: number;
    setRouteToPickupGeoJSON: (route: Feature | null) => void;
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
    const navigationService = useRef(new OSRMNavigationService()).current;
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
            // Use OSRMNavigationService instead of DirectionsService
            const routeData = await navigationService.calculateRoute(
                {
                    latitude: driverLat,
                    longitude: driverLng
                },
                {
                    latitude: pickupCoords[1], // pickupCoords is [lng, lat]
                    longitude: pickupCoords[0]
                }
            );

            // Only update if this is still the current calculation
            if (lastCalculationRef.current === calculationKey) {
                // Convert NavigationRoute geometry to GeoJSON Feature
                const routeGeoJSON: Feature = {
                    type: 'Feature',
                    properties: {},
                    geometry: routeData.geometry
                };

                setRouteToPickupGeoJSON(routeGeoJSON);

                // Set initial driver position from route coordinates
                if (routeData.coordinates.length > 0) {
                    const firstCoord = routeData.coordinates[0];
                    setDriverCoords([firstCoord.longitude, firstCoord.latitude]);
                    setCurrentLegIndex(0);

                    console.log('✅ Trip route calculated:', {
                        distance: `${(routeData.distance / 1000).toFixed(1)} km`,
                        duration: `${Math.floor(routeData.duration / 60)}m`,
                        coordinates: routeData.coordinates.length,
                        instructions: routeData.instructions.length
                    });
                } else {
                    // Fallback to original driver position
                    setDriverCoords([driverLng, driverLat]);
                    console.warn('⚠️ No route coordinates returned, using fallback position');
                }
            }
        } catch (error: any) {
            // Only show error if this is still the current calculation
            if (lastCalculationRef.current === calculationKey) {
                console.error('❌ Trip route calculation error:', error);
                Alert.alert('Route Error', error.message || 'Failed to calculate route for driver to pickup.');
                setRouteToPickupGeoJSON(null);
                setDriverCoords([driverLng, driverLat]);
            }
        } finally {
            isCalculatingRef.current = false;
            setIsLoadingRoute(false);
        }
    }, [navigationService, setRouteToPickupGeoJSON, setDriverCoords, setCurrentLegIndex, setIsLoadingRoute]);

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
            console.log('🚗 Calculating driver-to-pickup route:', {
                from: `${driverStartLat}, ${driverStartLng}`,
                to: `${userPickupCoords[1]}, ${userPickupCoords[0]}`
            });
            calculateTripRoute(userPickupCoords, driverStartLat, driverStartLng);
        }
    }, [
        userPickupCoords?.[0],
        userPickupCoords?.[1],
        driverStartLat,
        driverStartLng,
        calculateTripRoute
    ]);

    const clearRoute = useCallback(() => {
        isCalculatingRef.current = false;
        lastCalculationRef.current = '';
        setRouteToPickupGeoJSON(null);
        setIsLoadingRoute(false);
    }, [setRouteToPickupGeoJSON, setIsLoadingRoute]);

    return {
        navigationService, // Expose the service instead of directionsService
        isCalculating: isCalculatingRef.current,
        clearRoute
    };
};