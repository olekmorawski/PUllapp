// hooks/useTripState.ts - Updated to use shared types
import { useState, useCallback } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { TripParams, TripStatus } from '@/hooks/trip';

const MOCK_DRIVER_START_LAT = 37.79000;
const MOCK_DRIVER_START_LNG = -122.4324;

// Helper function to safely extract string from route params
const extractStringParam = (param: string | string[] | undefined): string => {
    if (Array.isArray(param)) return param[0] || '';
    return param || '';
};

export const useTripState = () => {
    const params = useLocalSearchParams();

    // Safely convert params to TripParams with proper type handling
    const tripParams: TripParams = {
        price: extractStringParam(params.price),
        pickupAddress: extractStringParam(params.pickupAddress),
        destinationAddress: extractStringParam(params.destinationAddress),
        driverName: extractStringParam(params.driverName),
        driverVehicle: extractStringParam(params.driverVehicle),
    };

    // Trip state with proper typing
    const [userPickupCoords, setUserPickupCoords] = useState<[number, number] | null>(null);
    const [driverCoords, setDriverCoords] = useState<[number, number]>([MOCK_DRIVER_START_LNG, MOCK_DRIVER_START_LAT]);
    const [routeToPickupGeoJSON, setRouteToPickupGeoJSON] = useState<GeoJSON.Feature | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);
    const [currentLegIndex, setCurrentLegIndex] = useState(0);
    const [tripStatus, setTripStatus] = useState<TripStatus>("Approaching Pickup");

    // Update trip status with type safety
    const updateTripStatus = useCallback((status: TripStatus) => {
        setTripStatus(status);
    }, []);

    // Reset trip state
    const resetTripState = useCallback(() => {
        setUserPickupCoords(null);
        setDriverCoords([MOCK_DRIVER_START_LNG, MOCK_DRIVER_START_LAT]);
        setRouteToPickupGeoJSON(null);
        setIsLoadingRoute(false);
        setCurrentLegIndex(0);
        setTripStatus("Approaching Pickup");
    }, []);

    return {
        tripParams,
        userPickupCoords,
        driverCoords,
        routeToPickupGeoJSON,
        isLoadingRoute,
        currentLegIndex,
        tripStatus,
        setUserPickupCoords,
        setDriverCoords,
        setRouteToPickupGeoJSON,
        setIsLoadingRoute,
        setCurrentLegIndex,
        updateTripStatus,
        resetTripState,
        MOCK_DRIVER_START_LAT,
        MOCK_DRIVER_START_LNG,
    };
};