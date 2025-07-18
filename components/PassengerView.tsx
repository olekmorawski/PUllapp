// components/PassengerView.tsx
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { MapboxMap } from '@/components/MapboxMap';
import { BottomSheet } from '@/components/BottomSheet/BottomSheet';
import { LocationData } from '@/hooks/useRideAppState';
import Mapbox from '@rnmapbox/maps';

interface PassengerViewProps {
    // Map props
    mapRef: React.Ref<Mapbox.MapView>;
    initialRegion?: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    origin?: LocationData | null;
    destination?: LocationData | null;
    routeGeoJSON?: GeoJSON.Feature | null;
    onLocationUpdate?: (location: Mapbox.Location) => void;

    // Route info
    routeInfo?: {
        distance: string;
        duration: string;
        distanceValue: number;
        durationValue: number;
    } | null;
    isLoadingRoute?: boolean;

    // Ride options
    rideOptions?: any[];
    onRideSelect?: (ride: any, customPrice: string) => void;
    onConfirmRide?: () => void;
    onLocationSelect?: (type: 'origin' | 'destination', location: LocationData) => void;
}

export const PassengerView: React.FC<PassengerViewProps> = ({
                                                                mapRef,
                                                                initialRegion,
                                                                origin,
                                                                destination,
                                                                routeGeoJSON,
                                                                onLocationUpdate,
                                                                routeInfo,
                                                                isLoadingRoute,
                                                                rideOptions = [],
                                                                onRideSelect,
                                                                onConfirmRide,
                                                                onLocationSelect,
                                                            }) => {
    return (
        <>
            <MapboxMap
                mapRef={mapRef}
                initialRegion={initialRegion}
                origin={origin?.coordinates}
                destination={destination?.coordinates}
                routeGeoJSON={routeGeoJSON}
                onLocationUpdate={onLocationUpdate}
                showUserLocation={true}
            />

            {isLoadingRoute && (
                <View className="absolute top-24 left-5 right-5 bg-white p-4 rounded-lg shadow-md flex-row items-center">
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text className="ml-3 text-gray-600">Calculating route...</Text>
                </View>
            )}

            {routeInfo && !isLoadingRoute && (
                <View className="absolute top-24 left-5 right-5 bg-white p-4 rounded-lg shadow-md">
                    <Text className="text-lg font-semibold">
                        {routeInfo.distance} • {routeInfo.duration}
                    </Text>
                    <Text className="text-gray-500 text-sm">Estimated route</Text>
                </View>
            )}

            <BottomSheet
                rideOptions={rideOptions}
                onRideSelect={onRideSelect}
                onConfirmRide={onConfirmRide}
                onLocationSelect={onLocationSelect}
            />
        </>
    );
};