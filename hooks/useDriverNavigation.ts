// hooks/useDriverNavigation.ts
import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useLocation } from '@/hooks/Location/useLocation';

export type NavigationPhase = 'TO_PICKUP' | 'TO_DESTINATION' | 'COMPLETED';

export interface RideNavigationData {
    id: string;
    pickupLat: number;
    pickupLng: number;
    pickupAddress: string;
    destLat: number;
    destLng: number;
    destAddress: string;
    passengerName: string;
    estimatedPrice: string;
}

export interface NavigationWaypoint {
    latitude: number;
    longitude: number;
    name?: string;
}

interface UseDriverNavigationProps {
    rideData: RideNavigationData;
    onNavigationComplete?: () => void;
    onNavigationError?: (error: any) => void;
}

export const useDriverNavigation = ({
                                        rideData,
                                        onNavigationComplete,
                                        onNavigationError,
                                    }: UseDriverNavigationProps) => {
    const [navigationPhase, setNavigationPhase] = useState<NavigationPhase>('TO_PICKUP');
    const [isNavigationActive, setIsNavigationActive] = useState(false);
    const [currentDestination, setCurrentDestination] = useState<NavigationWaypoint>({
        latitude: rideData.pickupLat,
        longitude: rideData.pickupLng,
        name: 'Pickup Location'
    });
    const [routeProgress, setRouteProgress] = useState<any>(null);
    const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
    const [distanceRemaining, setDistanceRemaining] = useState<number | null>(null);

    const { location: driverLocation, getCurrentLocation, requestPermission, hasPermission } = useLocation({ autoStart: true });

    console.log('🚗 Driver navigation hook initialized:', {
        rideId: rideData.id,
        pickupCoords: { lat: rideData.pickupLat, lng: rideData.pickupLng },
        destCoords: { lat: rideData.destLat, lng: rideData.destLng },
        currentDestination,
        hasLocation: !!driverLocation,
        hasPermission,
        isNavigationActive,
        navigationPhase
    });

    // Initialize navigation when driver location is available
    useEffect(() => {
        const initializeNavigation = async () => {
            console.log('🔄 Initializing navigation...', {
                hasLocation: !!driverLocation,
                hasPermission,
                isNavigationActive
            });

            if (!hasPermission) {
                console.log('📍 Requesting location permission...');
                const granted = await requestPermission();
                if (!granted) {
                    console.error('❌ Location permission denied');
                    onNavigationError?.(new Error('Location permission is required for navigation'));
                    return;
                }
            }

            if (driverLocation && !isNavigationActive) {
                console.log('✅ Starting navigation with driver location:', driverLocation.coords);
                startNavigation();
            } else if (!driverLocation) {
                console.log('📍 Getting current location...');
                try {
                    await getCurrentLocation();
                } catch (error) {
                    console.error('❌ Failed to get current location:', error);
                    onNavigationError?.(error as Error);
                }
            }
        };

        initializeNavigation();
    }, [driverLocation, hasPermission, isNavigationActive]);

    const startNavigation = useCallback(() => {
        setIsNavigationActive(true);
    }, []);

    const handleArrivedAtPickup = useCallback(() => {
        Alert.alert(
            'Arrived at Pickup',
            `You've arrived at the pickup location for ${rideData.passengerName}. Please wait for the passenger to get in the car.`,
            [
                {
                    text: 'Passenger is in the car',
                    onPress: () => {
                        // Switch to destination navigation
                        setNavigationPhase('TO_DESTINATION');
                        setCurrentDestination({
                            latitude: rideData.destLat,
                            longitude: rideData.destLng,
                            name: 'Destination'
                        });

                        Alert.alert(
                            'Navigating to Destination',
                            'Now navigating to the passenger\'s destination.',
                            [{ text: 'OK' }]
                        );
                    }
                },
                {
                    text: 'Still waiting',
                    style: 'cancel'
                }
            ]
        );
    }, [rideData]);

    const handleArrivedAtDestination = useCallback(() => {
        Alert.alert(
            'Trip Completed',
            `You've successfully completed the trip!\n\nEarnings: ${rideData.estimatedPrice}\n\nThank you for using our platform.`,
            [
                {
                    text: 'Complete Trip',
                    onPress: () => {
                        setNavigationPhase('COMPLETED');
                        onNavigationComplete?.();
                    }
                }
            ]
        );
    }, [rideData, onNavigationComplete]);

    const handleNavigationError = useCallback((error: any) => {
        console.error('Navigation error:', error);
        onNavigationError?.(error);
    }, [onNavigationError]);

    const handleRouteProgressChange = useCallback((progress: {
        distanceRemaining: number;
        distanceTraveled: number;
        durationRemaining: number;
        fractionTraveled: number;
    }) => {
        setRouteProgress(progress);

        // Extract useful information from progress
        setEstimatedTimeRemaining(progress.durationRemaining);
        setDistanceRemaining(progress.distanceRemaining);

        console.log('Route progress:', {
            distanceRemaining: progress.distanceRemaining,
            durationRemaining: progress.durationRemaining,
            fractionTraveled: progress.fractionTraveled
        });
    }, []);

    const getPhaseTitle = useCallback(() => {
        switch (navigationPhase) {
            case 'TO_PICKUP':
                return 'Driving to Pickup';
            case 'TO_DESTINATION':
                return 'Driving to Destination';
            case 'COMPLETED':
                return 'Trip Completed';
            default:
                return 'Navigation';
        }
    }, [navigationPhase]);

    const getPhaseInstruction = useCallback(() => {
        switch (navigationPhase) {
            case 'TO_PICKUP':
                return `Pick up ${rideData.passengerName || 'passenger'} at ${rideData.pickupAddress || 'pickup location'}`;
            case 'TO_DESTINATION':
                return `Drop off at ${rideData.destAddress || 'destination'}`;
            case 'COMPLETED':
                return 'Trip completed successfully!';
            default:
                return 'Please wait...';
        }
    }, [navigationPhase, rideData]);

    const formatTimeRemaining = useCallback((seconds: number | null): string => {
        if (!seconds || typeof seconds !== 'number' || isNaN(seconds)) return '--';

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        return `${remainingSeconds}s`;
    }, []);

    const formatDistanceRemaining = useCallback((meters: number | null): string => {
        if (!meters || typeof meters !== 'number' || isNaN(meters)) return '--';

        if (meters >= 1000) {
            return `${(meters / 1000).toFixed(1)}km`;
        }
        return `${Math.round(meters)}m`;
    }, []);

    // Force refresh driver location
    const refreshDriverLocation = useCallback(async () => {
        try {
            await getCurrentLocation();
        } catch (error) {
            console.error('Failed to refresh driver location:', error);
        }
    }, [getCurrentLocation]);

    return {
        // State
        navigationPhase,
        isNavigationActive,
        currentDestination,
        driverLocation,
        routeProgress,
        estimatedTimeRemaining,
        distanceRemaining,

        // Handlers
        handleArrivedAtPickup,
        handleArrivedAtDestination,
        handleNavigationError,
        handleRouteProgressChange,
        startNavigation,
        refreshDriverLocation,

        // Computed values
        getPhaseTitle,
        getPhaseInstruction,
        formatTimeRemaining,
        formatDistanceRemaining,

        // Utils
        isAtPickupPhase: navigationPhase === 'TO_PICKUP',
        isAtDestinationPhase: navigationPhase === 'TO_DESTINATION',
        isCompleted: navigationPhase === 'COMPLETED',
    };
};