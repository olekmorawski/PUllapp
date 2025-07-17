// hooks/useRideManagement.ts
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useGetAvailableRides } from '@/hooks/ride/useGetAvailableRides';
import { useAcceptRide } from '@/hooks/ride/useAcceptRide';
import { LocationData } from './useRideAppState';

interface UseRideManagementProps {
    isDriverViewActive: boolean;
    origin: LocationData | null;
    destination: LocationData | null;
    selectedRide: any;
    routeInfo: any;
    setAcceptingRideId: (id: string | null) => void;
}

export const useRideManagement = ({
                                      isDriverViewActive,
                                      origin,
                                      destination,
                                      selectedRide,
                                      routeInfo,
                                      setAcceptingRideId,
                                  }: UseRideManagementProps) => {
    const router = useRouter();

    // Driver-specific hooks
    const {
        data: availableRidesData,
        isLoading: isLoadingRides,
        refetch: fetchAvailableRides
    } = useGetAvailableRides({ enabled: isDriverViewActive });

    const { mutate: acceptRide } = useAcceptRide();

    const availableRides = availableRidesData?.rides || [];

    // Driver Actions
    const handleAcceptRide = useCallback(async (rideId: string) => {
        setAcceptingRideId(rideId);

        acceptRide(rideId, {
            onSuccess: (data) => {
                const acceptedRide = data.ride;
                setAcceptingRideId(null);

                Alert.alert(
                    'Ride Accepted!',
                    `You have successfully accepted the ride from ${acceptedRide.originAddress} to ${acceptedRide.destinationAddress}.`,
                    [
                        {
                            text: 'View Details',
                            onPress: () => {
                                console.log('Navigate to ride details:', acceptedRide);
                            }
                        },
                        { text: 'OK', style: 'default' }
                    ]
                );
            },
            onError: (error: any) => {
                setAcceptingRideId(null);
                console.error('Error accepting ride:', error);
                Alert.alert(
                    'Failed to Accept Ride',
                    error.message || 'Unable to accept the ride. Please try again.',
                    [
                        { text: 'Retry', onPress: () => handleAcceptRide(rideId) },
                        { text: 'Cancel', style: 'cancel' }
                    ]
                );
            },
        });
    }, [acceptRide, setAcceptingRideId]);

    const handleRejectRide = useCallback(async (rideId: string) => {
        try {
            console.log('Rejected ride:', rideId);
            // Future: Track rejections via API
        } catch (error: any) {
            console.error('Error rejecting ride:', error);
            Alert.alert('Error', 'Failed to reject ride.');
        }
    }, []);

    const handleRefreshRides = useCallback(async () => {
        await fetchAvailableRides();
    }, [fetchAvailableRides]);

    // Passenger Actions
    const handleConfirmRide = useCallback(() => {
        if (!origin || !destination || !selectedRide) {
            Alert.alert('Missing Information', 'Please select pickup, destination, and ride type');
            return;
        }

        const estimatedFare = ((routeInfo?.distanceValue || 0) / 1000) * 1.5 + 3;

        Alert.alert(
            'Confirm Ride',
            `Confirm ${selectedRide.type} from ${origin.address} to ${destination.address}\n\nEstimated fare: $${estimatedFare.toFixed(2)}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: () => {
                        router.push({
                            pathname: '/(app)/loading',
                            params: {
                                price: estimatedFare.toFixed(2),
                                pickupAddress: origin?.address || 'Current Location',
                                destinationAddress: destination?.address || 'Not specified',
                            },
                        });
                    }
                },
            ]
        );
    }, [origin, destination, selectedRide, routeInfo, router]);

    return {
        // Driver data
        availableRides,
        isLoadingRides,

        // Driver actions
        handleAcceptRide,
        handleRejectRide,
        handleRefreshRides,

        // Passenger actions
        handleConfirmRide,
    };
};