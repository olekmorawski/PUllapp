// components/DriverView.tsx
import React from 'react';
import { ExpoMapComponent } from '@/components/ExpoMap';
import { DriverBottomSheet } from '@/components/DriverBottomSheet';
import { AvailableRide } from '@/api/rideAPI';
import ExpoMap from 'expo-maps';

interface DriverViewProps {
    // Map props
    mapRef: React.Ref<ExpoMap>;
    initialRegion?: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };

    // Ride data
    availableRides: AvailableRide[];
    isLoadingRides: boolean;
    acceptingRideId: string | null;

    // Actions
    onAcceptRide: (rideId: string) => Promise<void>;
    onRejectRide: (rideId: string) => Promise<void>;
    onRefreshRides: () => Promise<void>;
}

export const DriverView: React.FC<DriverViewProps> = ({
                                                          mapRef,
                                                          initialRegion,
                                                          availableRides,
                                                          isLoadingRides,
                                                          acceptingRideId,
                                                          onAcceptRide,
                                                          onRejectRide,
                                                          onRefreshRides,
                                                      }) => {
    return (
        <>
            <ExpoMapComponent
                mapRef={mapRef}
                initialRegion={initialRegion}
                showUserLocation={true}
            />

            <DriverBottomSheet
                availableRides={availableRides}
                isVisible={true}
                onAcceptRide={onAcceptRide}
                onRejectRide={onRejectRide}
                onRefresh={onRefreshRides}
                isLoading={isLoadingRides}
                isAcceptingRide={acceptingRideId}
            />
        </>
    );
};