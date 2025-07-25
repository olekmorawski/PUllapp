// hooks/useEnhancedDriverNavigation.ts - Fixed version
import { useState, useCallback, useEffect, useRef } from 'react';
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

// Map ref interface
export interface NavigationMapboxMapRef {
    centerOnDriver: () => void;
    recenterWithBearing: (bearing?: number) => void;
    flyTo: (coordinates: [number, number], zoom?: number, bearing?: number) => void;
    resetView: () => void;
}

interface UseEnhancedDriverNavigationProps {
    rideData: RideNavigationData;
    onNavigationComplete?: () => void;
    onNavigationError?: (error: any) => void;
}

// Safe validation functions
const isValidLocation = (location: any): boolean => {
    return (
        location &&
        typeof location === 'object' &&
        location.coords &&
        typeof location.coords === 'object' &&
        typeof location.coords.latitude === 'number' &&
        typeof location.coords.longitude === 'number' &&
        !isNaN(location.coords.latitude) &&
        !isNaN(location.coords.longitude) &&
        isFinite(location.coords.latitude) &&
        isFinite(location.coords.longitude)
    );
};

const isValidNumber = (value: any): value is number => {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

export const useEnhancedDriverNavigation = ({
                                                rideData,
                                                onNavigationComplete,
                                                onNavigationError,
                                            }: UseEnhancedDriverNavigationProps) => {
    const [navigationPhase, setNavigationPhase] = useState<NavigationPhase>('TO_PICKUP');
    const [isNavigationActive, setIsNavigationActive] = useState(false);
    const [currentDestination, setCurrentDestination] = useState<NavigationWaypoint>({
        latitude: rideData.pickupLat,
        longitude: rideData.pickupLng,
        name: 'Pickup Location'
    });

    // Enhanced navigation state
    const [routeProgress, setRouteProgress] = useState<any>(null);
    const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
    const [distanceRemaining, setDistanceRemaining] = useState<number | null>(null);
    const [currentBearing, setCurrentBearing] = useState<number>(0);
    const [currentSpeed, setCurrentSpeed] = useState<number>(0);
    const [isInNavigationMode, setIsInNavigationMode] = useState(false);

    const lastLocationRef = useRef<any>(null);
    const bearingHistoryRef = useRef<number[]>([]);
    const MAX_BEARING_HISTORY = 5;

    const {
        location: driverLocation,
        getCurrentLocation,
        requestPermission,
        hasPermission,
        startWatching,
        stopWatching
    } = useLocation({
        autoStart: true,
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000
    });

    console.log('🚗 Enhanced driver navigation hook initialized:', {
        rideId: rideData.id,
        pickupCoords: { lat: rideData.pickupLat, lng: rideData.pickupLng },
        destCoords: { lat: rideData.destLat, lng: rideData.destLng },
        currentDestination,
        hasLocation: !!driverLocation,
        hasPermission,
        isNavigationActive,
        navigationPhase,
        currentBearing,
        currentSpeed
    });

    // Calculate smooth bearing from location history
    const calculateSmoothedBearing = useCallback((newLocation: any, lastLocation: any): number => {
        // Validate both locations
        if (!isValidLocation(newLocation) || !isValidLocation(lastLocation)) {
            return currentBearing;
        }

        try {
            const lat1 = lastLocation.coords.latitude * Math.PI / 180;
            const lng1 = lastLocation.coords.longitude * Math.PI / 180;
            const lat2 = newLocation.coords.latitude * Math.PI / 180;
            const lng2 = newLocation.coords.longitude * Math.PI / 180;

            const dLng = lng2 - lng1;
            const y = Math.sin(dLng) * Math.cos(lat2);
            const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

            let bearing = Math.atan2(y, x) * 180 / Math.PI;
            bearing = (bearing + 360) % 360; // Normalize to 0-360

            // Validate calculated bearing
            if (!isValidNumber(bearing)) {
                return currentBearing;
            }

            // Smooth bearing using history
            bearingHistoryRef.current.push(bearing);
            if (bearingHistoryRef.current.length > MAX_BEARING_HISTORY) {
                bearingHistoryRef.current.shift();
            }

            // Calculate weighted average bearing
            const totalWeight = bearingHistoryRef.current.length * (bearingHistoryRef.current.length + 1) / 2;
            const weightedSum = bearingHistoryRef.current.reduce((sum, b, index) => {
                const weight = index + 1; // Give more weight to recent bearings
                return sum + b * weight;
            }, 0);

            const smoothedBearing = weightedSum / totalWeight;
            return isValidNumber(smoothedBearing) ? smoothedBearing : currentBearing;
        } catch (error) {
            console.warn('Error calculating bearing:', error);
            return currentBearing;
        }
    }, [currentBearing]);

    // Calculate distance between two points (Haversine formula)
    const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
        // Validate all coordinates
        if (!isValidNumber(lat1) || !isValidNumber(lng1) || !isValidNumber(lat2) || !isValidNumber(lng2)) {
            return 0;
        }

        try {
            const R = 6371e3; // Earth's radius in meters
            const φ1 = lat1 * Math.PI / 180;
            const φ2 = lat2 * Math.PI / 180;
            const Δφ = (lat2 - lat1) * Math.PI / 180;
            const Δλ = (lng2 - lng1) * Math.PI / 180;

            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

            const distance = R * c;
            return isValidNumber(distance) ? Math.max(0, distance) : 0;
        } catch (error) {
            console.warn('Error calculating distance:', error);
            return 0;
        }
    }, []);

    // Calculate speed from location updates
    const calculateSpeed = useCallback((newLocation: any, lastLocation: any): number => {
        if (!isValidLocation(newLocation) || !isValidLocation(lastLocation)) {
            return currentSpeed;
        }

        try {
            const distance = calculateDistance(
                lastLocation.coords.latitude,
                lastLocation.coords.longitude,
                newLocation.coords.latitude,
                newLocation.coords.longitude
            );

            // Validate timestamps
            const newTimestamp = newLocation.timestamp || Date.now();
            const lastTimestamp = lastLocation.timestamp || Date.now();
            const timeDiff = (newTimestamp - lastTimestamp) / 1000; // seconds

            if (timeDiff <= 0 || !isValidNumber(timeDiff)) {
                return currentSpeed;
            }

            const speed = distance / timeDiff; // m/s
            const speedKmh = speed * 3.6; // Convert to km/h

            return isValidNumber(speedKmh) ? Math.max(0, Math.min(speedKmh, 200)) : currentSpeed; // Cap at 200 km/h for sanity
        } catch (error) {
            console.warn('Error calculating speed:', error);
            return currentSpeed;
        }
    }, [calculateDistance, currentSpeed]);

    // Enhanced location update handler
    const handleLocationUpdate = useCallback((location: any) => {
        if (!isValidLocation(location)) {
            console.warn('Invalid location received:', location);
            return;
        }

        const lastLocation = lastLocationRef.current;

        if (lastLocation && isValidLocation(lastLocation)) {
            try {
                // Calculate bearing and speed only if there's movement
                const distanceMoved = calculateDistance(
                    lastLocation.coords.latitude,
                    lastLocation.coords.longitude,
                    location.coords.latitude,
                    location.coords.longitude
                );

                // Only update if there's significant movement (minimum 2 meters)
                if (distanceMoved > 2) {
                    const newBearing = calculateSmoothedBearing(location, lastLocation);
                    const newSpeed = calculateSpeed(location, lastLocation);

                    setCurrentBearing(newBearing);
                    setCurrentSpeed(newSpeed);
                }

                // Always update distance to destination
                const distanceToDestination = calculateDistance(
                    location.coords.latitude,
                    location.coords.longitude,
                    currentDestination.latitude,
                    currentDestination.longitude
                );

                setDistanceRemaining(distanceToDestination);

                // Estimate time remaining based on current speed
                if (currentSpeed > 0) {
                    const timeRemaining = (distanceToDestination / 1000) / (currentSpeed / 3600); // hours
                    const timeRemainingSeconds = timeRemaining * 3600; // convert to seconds

                    if (isValidNumber(timeRemainingSeconds)) {
                        setEstimatedTimeRemaining(timeRemainingSeconds);
                    }
                }

                // Check if arrived at destination (within 50 meters)
                if (distanceToDestination < 50 && isNavigationActive) {
                    handleArrivalDetection();
                }
            } catch (error) {
                console.warn('Error in location update handler:', error);
            }
        }

        lastLocationRef.current = location;
    }, [calculateSmoothedBearing, calculateSpeed, calculateDistance, currentDestination, isNavigationActive, currentSpeed]);

    // Start location tracking when navigation begins
    useEffect(() => {
        if (isNavigationActive) {
            console.log('🎯 Starting enhanced location tracking');
            startWatching();
            setIsInNavigationMode(true);
        } else {
            console.log('⏸️ Stopping location tracking');
            stopWatching();
            setIsInNavigationMode(false);
        }

        return () => {
            stopWatching();
        };
    }, [isNavigationActive, startWatching, stopWatching]);

    // Initialize navigation when driver location is available
    useEffect(() => {
        const initializeNavigation = async () => {
            console.log('🔄 Initializing enhanced navigation...', {
                hasLocation: !!driverLocation,
                hasPermission,
                isNavigationActive
            });

            if (!hasPermission) {
                console.log('📍 Requesting location permission...');
                try {
                    const granted = await requestPermission();
                    if (!granted) {
                        console.error('❌ Location permission denied');
                        onNavigationError?.(new Error('Location permission is required for navigation'));
                        return;
                    }
                } catch (error) {
                    console.error('❌ Error requesting permission:', error);
                    onNavigationError?.(error as Error);
                    return;
                }
            }

            if (driverLocation && isValidLocation(driverLocation) && !isNavigationActive) {
                console.log('✅ Starting enhanced navigation with driver location:', driverLocation.coords);
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

    // Auto-detect arrival at destinations
    const handleArrivalDetection = useCallback(() => {
        if (navigationPhase === 'TO_PICKUP') {
            console.log('🎯 Auto-detected arrival at pickup');
            // Don't auto-transition, just notify
            console.log('Close to pickup location - driver can manually confirm arrival');
        } else if (navigationPhase === 'TO_DESTINATION') {
            console.log('🏁 Auto-detected arrival at destination');
            console.log('Close to destination - driver can manually complete trip');
        }
    }, [navigationPhase]);

    const startNavigation = useCallback(() => {
        setIsNavigationActive(true);
        console.log('🚀 Enhanced navigation started');
    }, []);

    const handleArrivedAtPickup = useCallback(() => {
        console.log('✅ Confirmed arrival at pickup');
        setNavigationPhase('TO_DESTINATION');
        setCurrentDestination({
            latitude: rideData.destLat,
            longitude: rideData.destLng,
            name: 'Destination'
        });

        // Reset bearing history for new route
        bearingHistoryRef.current = [];

        Alert.alert(
            'Navigating to Destination',
            `Now navigating to ${rideData.destAddress}`,
            [{ text: 'OK' }]
        );
    }, [rideData]);

    const handleArrivedAtDestination = useCallback(() => {
        console.log('🏁 Trip completed');
        setNavigationPhase('COMPLETED');
        setIsNavigationActive(false);

        Alert.alert(
            'Trip Completed! 🎉',
            `Congratulations! You've successfully completed the trip.\n\nEarnings: ${rideData.estimatedPrice}\n\nPassenger: ${rideData.passengerName}`,
            [
                {
                    text: 'Complete Trip',
                    onPress: () => {
                        onNavigationComplete?.();
                    }
                }
            ]
        );
    }, [rideData, onNavigationComplete]);

    const handleNavigationError = useCallback((error: any) => {
        console.error('📍 Enhanced navigation error:', error);
        setIsNavigationActive(false);
        onNavigationError?.(error);
    }, [onNavigationError]);

    const handleRouteProgressChange = useCallback((progress: {
        distanceRemaining: number;
        distanceTraveled: number;
        durationRemaining: number;
        fractionTraveled: number;
    }) => {
        // Validate progress object
        if (!progress || typeof progress !== 'object') {
            console.warn('Invalid progress object received:', progress);
            return;
        }

        const validatedProgress = {
            distanceRemaining: isValidNumber(progress.distanceRemaining) ? progress.distanceRemaining : 0,
            distanceTraveled: isValidNumber(progress.distanceTraveled) ? progress.distanceTraveled : 0,
            durationRemaining: isValidNumber(progress.durationRemaining) ? progress.durationRemaining : 0,
            fractionTraveled: isValidNumber(progress.fractionTraveled) ? progress.fractionTraveled : 0,
        };

        setRouteProgress(validatedProgress);
        setEstimatedTimeRemaining(validatedProgress.durationRemaining);
        setDistanceRemaining(validatedProgress.distanceRemaining);

        console.log('📊 Enhanced route progress:', {
            ...validatedProgress,
            currentSpeed: currentSpeed,
            currentBearing: currentBearing
        });
    }, [currentSpeed, currentBearing]);

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
                return `Pick up ${rideData.passengerName} at ${rideData.pickupAddress}`;
            case 'TO_DESTINATION':
                return `Drop off at ${rideData.destAddress}`;
            case 'COMPLETED':
                return 'Trip completed successfully!';
            default:
                return 'Please wait...';
        }
    }, [navigationPhase, rideData]);

    const formatTimeRemaining = useCallback((seconds: number | null): string => {
        if (!isValidNumber(seconds) || seconds === null) return '--';

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        if (minutes > 60) {
            const hours = Math.floor(minutes / 60);
            const remainingMinutes = minutes % 60;
            return `${hours}h ${remainingMinutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        }
        return `${remainingSeconds}s`;
    }, []);

    const formatDistanceRemaining = useCallback((meters: number | null): string => {
        if (!isValidNumber(meters) || meters === null) return '--';

        if (meters >= 1000) {
            return `${(meters / 1000).toFixed(1)} km`;
        }
        return `${Math.round(meters)} m`;
    }, []);

    const formatSpeed = useCallback((kmh: number): string => {
        if (!isValidNumber(kmh)) return '0 km/h';
        return `${Math.round(kmh)} km/h`;
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
        currentBearing,
        currentSpeed,
        isInNavigationMode,

        // Handlers
        handleArrivedAtPickup,
        handleArrivedAtDestination,
        handleNavigationError,
        handleRouteProgressChange,
        handleLocationUpdate,
        startNavigation,
        refreshDriverLocation,

        // Computed values
        getPhaseTitle,
        getPhaseInstruction,
        formatTimeRemaining,
        formatDistanceRemaining,
        formatSpeed,

        // Utils
        isAtPickupPhase: navigationPhase === 'TO_PICKUP',
        isAtDestinationPhase: navigationPhase === 'TO_DESTINATION',
        isCompleted: navigationPhase === 'COMPLETED',
        calculateDistance,
    };
};