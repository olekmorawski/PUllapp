// hooks/useRideAppState.ts
import { useState, useCallback } from 'react';

export interface LocationData {
    coordinates: {
        latitude: number;
        longitude: number;
    };
    address: string;
    isCurrentLocation?: boolean;
}

export const useRideAppState = () => {
    // UI State
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);
    const [isDriverViewActive, setIsDriverViewActive] = useState(false);

    // Location State
    const [origin, setOrigin] = useState<LocationData | null>(null);
    const [destination, setDestination] = useState<LocationData | null>(null);

    // Route State
    const [routeGeoJSON, setRouteGeoJSON] = useState<GeoJSON.Feature | null>(null);
    const [routeInfo, setRouteInfo] = useState<{
        distance: string;
        duration: string;
        distanceValue: number;
        durationValue: number;
    } | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);

    // Ride State
    const [selectedRide, setSelectedRide] = useState<any>(null);

    // Driver State
    const [acceptingRideId, setAcceptingRideId] = useState<string | null>(null);
    const [driverToClientRouteGeoJSON, setDriverToClientRouteGeoJSON] = useState<GeoJSON.Feature | null>(null);
    const [clientToDestRouteGeoJSON, setClientToDestRouteGeoJSON] = useState<GeoJSON.Feature | null>(null);

    // UI Actions
    const handleMenuPress = useCallback(() => setIsSidebarVisible(true), []);
    const closeSidebar = useCallback(() => setIsSidebarVisible(false), []);

    const handleLocationSelect = useCallback((type: 'origin' | 'destination', location: LocationData) => {
        if (type === 'origin') {
            setOrigin(location);
        } else {
            setDestination(location);
        }
    }, []);

    const handleRideSelect = useCallback((ride: any, customPrice: string) => {
        setSelectedRide({ ...ride, customPrice });
    }, []);

    const toggleDriverView = useCallback(() => {
        const newDriverState = !isDriverViewActive;
        setIsDriverViewActive(newDriverState);

        if (newDriverState) {
            // Clear passenger-specific state
            setRouteGeoJSON(null);
            setRouteInfo(null);
            setSelectedRide(null);
        } else {
            // Clear driver-specific state
            setDriverToClientRouteGeoJSON(null);
            setClientToDestRouteGeoJSON(null);
        }

        setIsSidebarVisible(false);
    }, [isDriverViewActive]);

    // Clear all state
    const clearState = useCallback(() => {
        setOrigin(null);
        setDestination(null);
        setRouteGeoJSON(null);
        setRouteInfo(null);
        setSelectedRide(null);
        setDriverToClientRouteGeoJSON(null);
        setClientToDestRouteGeoJSON(null);
        setAcceptingRideId(null);
    }, []);

    return {
        // State
        isSidebarVisible,
        isDriverViewActive,
        origin,
        destination,
        routeGeoJSON,
        routeInfo,
        isLoadingRoute,
        selectedRide,
        acceptingRideId,
        driverToClientRouteGeoJSON,
        clientToDestRouteGeoJSON,

        // Setters
        setOrigin,
        setDestination,
        setRouteGeoJSON,
        setRouteInfo,
        setIsLoadingRoute,
        setSelectedRide,
        setAcceptingRideId,
        setDriverToClientRouteGeoJSON,
        setClientToDestRouteGeoJSON,

        // Actions
        handleMenuPress,
        closeSidebar,
        handleLocationSelect,
        handleRideSelect,
        toggleDriverView,
        clearState,
    };
};