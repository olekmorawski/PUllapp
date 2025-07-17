// app/(app)/trip.tsx - Refactored
import React, { useRef } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';

// Custom hooks
import { useTripState } from '@/hooks/useTripState';
import { usePickupGeocoding } from '@/hooks/usePickupGeocoding';
import { useTripRoute } from '@/hooks/useTripRoute';
import { useDriverMovement } from '@/hooks/useDriverMovement';

// Components
import { TripMap, TripInfo } from '@/components/trip';

const TripScreen = () => {
    const mapRef = useRef<Mapbox.MapView>(null);

    // Main trip state
    const {
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
        MOCK_DRIVER_START_LAT,
        MOCK_DRIVER_START_LNG,
    } = useTripState();

    // Handle pickup location geocoding
    const { currentUserLocation } = usePickupGeocoding({
        pickupAddress: tripParams.pickupAddress,
        setUserPickupCoords,
    });

    // Handle route calculation
    useTripRoute({
        userPickupCoords,
        driverStartLat: MOCK_DRIVER_START_LAT,
        driverStartLng: MOCK_DRIVER_START_LNG,
        setRouteToPickupGeoJSON,
        setDriverCoords,
        setCurrentLegIndex,
        setIsLoadingRoute,
    });

    // Handle driver movement simulation
    useDriverMovement({
        routeToPickupGeoJSON,
        userPickupCoords,
        currentLegIndex,
        driverName: tripParams.driverName,
        setCurrentLegIndex,
        setDriverCoords,
        updateTripStatus,
    });

    // Calculate initial map region
    const initialMapRegion = currentUserLocation?.coords ? {
        latitude: currentUserLocation.coords.latitude,
        longitude: currentUserLocation.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.01,
    } : {
        latitude: MOCK_DRIVER_START_LAT,
        longitude: MOCK_DRIVER_START_LNG,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Stack.Screen options={{ title: tripStatus }} />

            <View className="flex-[0.7]">
                <TripMap
                    mapRef={mapRef}
                    initialRegion={initialMapRegion}
                    driverCoords={driverCoords}
                    userPickupCoords={userPickupCoords}
                    routeToPickupGeoJSON={routeToPickupGeoJSON}
                />
            </View>

            <TripInfo
                tripStatus={tripStatus}
                driverName={tripParams.driverName}
                driverVehicle={tripParams.driverVehicle}
                pickupAddress={tripParams.pickupAddress}
                price={tripParams.price}
                isLoadingRoute={isLoadingRoute}
            />
        </SafeAreaView>
    );
};

export default TripScreen;