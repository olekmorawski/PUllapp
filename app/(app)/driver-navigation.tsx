import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { DriverNavigationView } from '@/components/DriverNavigationView';
import { useDriverNavigation } from '@/hooks/useDriverNavigation';
import { useLocation } from '@/hooks/Location/useLocation';

export default function DriverNavigationScreen() {
    const params = useLocalSearchParams();
    const { location: driverLocation } = useLocation({ autoStart: true });
    const {
        handleArrivedAtPickup,
        handleStartTrip,
        handleCompleteTrip,
        handleCancelNavigation,
    } = useDriverNavigation();

    // Parse params
    const pickupLocation = {
        latitude: parseFloat(params.pickupLat as string),
        longitude: parseFloat(params.pickupLng as string),
    };

    const destinationLocation = {
        latitude: parseFloat(params.destLat as string),
        longitude: parseFloat(params.destLng as string),
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                    presentation: 'fullScreenModal',
                }}
            />

            <DriverNavigationView
                driverLocation={driverLocation?.coords}
                pickupLocation={pickupLocation}
                pickupAddress={params.pickupAddress as string}
                destinationLocation={destinationLocation}
                destinationAddress={params.destAddress as string}
                riderName={params.riderEmail as string}
                onArrivedAtPickup={handleArrivedAtPickup}
                onStartTrip={handleStartTrip}
                onCompleteTrip={handleCompleteTrip}
                onCancelNavigation={handleCancelNavigation}
            />
        </>
    );
}