import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AvailableRide } from '@/api/rideAPI';

interface UseDriverNavigationResult {
    currentRide: AvailableRide | null;
    isNavigating: boolean;
    startNavigationForRide: (ride: AvailableRide) => void;
    handleArrivedAtPickup: () => void;
    handleStartTrip: () => void;
    handleCompleteTrip: () => void;
    handleCancelNavigation: () => void;
}

export const useDriverNavigation = (): UseDriverNavigationResult => {
    const router = useRouter();
    const [currentRide, setCurrentRide] = useState<AvailableRide | null>(null);
    const [isNavigating, setIsNavigating] = useState(false);

    const startNavigationForRide = useCallback((ride: AvailableRide) => {
        setCurrentRide(ride);
        setIsNavigating(true);

        // Navigate to driver navigation screen
        router.push({
            pathname: '/(app)/driver-navigation',
            params: {
                rideId: ride.id,
                pickupLat: ride.originCoordinates.latitude,
                pickupLng: ride.originCoordinates.longitude,
                pickupAddress: ride.originAddress,
                destLat: ride.destinationCoordinates.latitude,
                destLng: ride.destinationCoordinates.longitude,
                destAddress: ride.destinationAddress,
                riderEmail: ride.userEmail,
                price: ride.customPrice || ride.estimatedPrice || '',
            },
        });
    }, [router]);

    const handleArrivedAtPickup = useCallback(async () => {
        if (!currentRide) return;

        try {
            // Update ride status to 'driver_arrived'
            // This would be an API call in production
            console.log('Driver arrived at pickup for ride:', currentRide.id);

            // Send notification to rider
            Alert.alert('Notification Sent', 'The rider has been notified of your arrival.');
        } catch (error) {
            console.error('Error updating arrival status:', error);
        }
    }, [currentRide]);

    const handleStartTrip = useCallback(async () => {
        if (!currentRide) return;

        try {
            // Update ride status to 'in_progress'
            console.log('Trip started for ride:', currentRide.id);
        } catch (error) {
            console.error('Error starting trip:', error);
        }
    }, [currentRide]);

    const handleCompleteTrip = useCallback(async () => {
        if (!currentRide) return;

        try {
            // Update ride status to 'completed'
            console.log('Trip completed for ride:', currentRide.id);

            Alert.alert(
                'Trip Completed',
                `Trip completed successfully! Fare: ${currentRide.customPrice || currentRide.estimatedPrice}`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setCurrentRide(null);
                            setIsNavigating(false);
                            router.back();
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error completing trip:', error);
        }
    }, [currentRide, router]);

    const handleCancelNavigation = useCallback(() => {
        Alert.alert(
            'Cancel Trip',
            'Are you sure you want to cancel this trip?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes',
                    style: 'destructive',
                    onPress: async () => {
                        if (currentRide) {
                            try {
                                // Update ride status back to 'pending' or 'cancelled'
                                console.log('Trip cancelled for ride:', currentRide.id);
                            } catch (error) {
                                console.error('Error cancelling trip:', error);
                            }
                        }

                        setCurrentRide(null);
                        setIsNavigating(false);
                        router.back();
                    }
                }
            ]
        );
    }, [currentRide, router]);

    return {
        currentRide,
        isNavigating,
        startNavigationForRide,
        handleArrivedAtPickup,
        handleStartTrip,
        handleCompleteTrip,
        handleCancelNavigation,
    };
};