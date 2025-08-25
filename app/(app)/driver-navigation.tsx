import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { View, Alert, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import { useOSRMNavigation } from '@/hooks/useOSRMNavigation';
import { useNavigationPhaseManager } from '@/hooks/useNavigationPhaseManager';
import NavigationMapboxMap, { NavigationMapboxMapRef } from '@/components/NavigationMapboxMap';
import {
    EtaCard,
    NavigationInstruction,
    NavigationControls,
} from '@/components/NavigationUIComponents';
import { usePickupTimer } from '@/hooks/navigation/usePickupTimer';
import { useGeofencing } from '@/hooks/navigation/useGeofencing';
import { useVoiceGuidance } from '@/hooks/navigation/useVoiceGuidance';
import { RideNavigationData, GEOFENCE_RADIUS_METERS, NavigationPhase } from '@/hooks/navigation/types';
import { LoadingScreen } from '@/components/Navigation/LoadingScreen';
import { PickupWaitingScreen } from '@/components/Navigation/PickupWaitingScreen';
import { ErrorScreen } from '@/components/Navigation/ErrorScreen';
import { DestinationArrivalScreen } from '@/components/Navigation/DestinationArrivalScreen';
import { PassengerInfoCard } from "@/components/Navigation/PassangerInfoCard";
import { PhaseIndicatorBanner } from '@/components/Navigation/PhaseIndicatorBanner';

export default function GeofencedDriverNavigationScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const mapRef = useRef<NavigationMapboxMapRef>(null);

    // State
    const [isMuted, setIsMuted] = useState(false);
    const [showInstructions, setShowInstructions] = useState(true);
    const [driverLocation, setDriverLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    const [locationLoading, setLocationLoading] = useState(true);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    const [maneuverPoints, setManeuverPoints] = useState<Array<{
        coordinate: [number, number];
        type: string;
        modifier?: string;
        instruction: string;
    }>>([]);
    const [isRouteTransitioning, setIsRouteTransitioning] = useState(false);
    const retryNavigationRef = useRef<(() => void) | null>(null);

    console.log('🚗 Geofenced Driver Navigation Screen loaded with params:', params);

    // Memoized ride data validation to prevent recalculation on every render
    const rideData = useMemo(() => {
        const validateParams = (params: any): RideNavigationData | null => {
            if (!params || typeof params !== 'object') {
                console.error('❌ Params is not an object:', params);
                return null;
            }

            const requiredFields = [
                'rideId', 'pickupLat', 'pickupLng', 'destLat', 'destLng',
                'pickupAddress', 'destAddress', 'passengerName', 'estimatedPrice'
            ];

            for (const field of requiredFields) {
                if (!(field in params) || params[field] === undefined || params[field] === null) {
                    console.error(`❌ Missing required field: ${field}`, params);
                    return null;
                }
            }

            try {
                return {
                    id: String(params.rideId),
                    pickupLat: parseFloat(params.pickupLat as string),
                    pickupLng: parseFloat(params.pickupLng as string),
                    pickupAddress: String(params.pickupAddress),
                    destLat: parseFloat(params.destLat as string),
                    destLng: parseFloat(params.destLng as string),
                    destAddress: String(params.destAddress),
                    passengerName: String(params.passengerName),
                    estimatedPrice: String(params.estimatedPrice),
                };
            } catch (error) {
                console.error('❌ Error creating ride data:', error);
                return null;
            }
        };

        return validateParams(params);
    }, [params]);

    // Memoized utility function to prevent recreation on every render
    const normalizeManeuverType = useCallback((maneuverType?: string): 'turn-left' | 'turn-right' | 'straight' | 'u-turn' => {
        if (!maneuverType) return 'straight';
        const normalized = maneuverType.toLowerCase();
        if (normalized.includes('left')) return 'turn-left';
        if (normalized.includes('right')) return 'turn-right';
        if (normalized.includes('u-turn') || normalized.includes('uturn')) return 'u-turn';
        return 'straight';
    }, []);

    // Custom hooks
    const { pickupTimer, startTimer, stopTimer, formatTimer } = usePickupTimer();
    const { speakInstruction } = useVoiceGuidance(isMuted);

    // Early return if no valid ride data
    if (!rideData) {
        return (
            <SafeAreaView className="flex-1 bg-gray-100">
                <Stack.Screen options={{ headerShown: false }} />
                <ErrorScreen
                    title="Invalid Navigation Data"
                    message="The ride information is missing or invalid. Please try again."
                    onGoBack={() => router.replace('/(app)')}
                />
            </SafeAreaView>
        );
    }

    // Memoized locations to prevent object recreation
    const pickupLocation = useMemo(() => ({
        latitude: rideData.pickupLat,
        longitude: rideData.pickupLng
    }), [rideData.pickupLat, rideData.pickupLng]);

    const destinationLocation = useMemo(() => ({
        latitude: rideData.destLat,
        longitude: rideData.destLng
    }), [rideData.destLat, rideData.destLng]);

    // Store callbacks in refs to make them stable and prevent phase manager recreation
    const callbacksRef = useRef({
        onRouteCleared: () => {
            console.log('🧹 Route cleared by phase manager');
            clearRoute();
            setIsRouteTransitioning(true);
        },
        onRouteCalculationRequested: async (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) => {
            console.log('📍 Route calculation requested by phase manager', { origin, destination });
            setIsRouteTransitioning(true);
            try {
                await calculateRouteOnly();
            } catch (error) {
                console.error('❌ Route calculation failed:', error);
                setIsRouteTransitioning(false);
            }
        },
        onNavigationRestarted: async (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) => {
            console.log('🚀 Navigation restart requested by phase manager', { origin, destination });
            setIsRouteTransitioning(true);
            try {
                await restartNavigation(origin, destination);
                setIsRouteTransitioning(false);
            } catch (error) {
                console.error('❌ Navigation restart failed:', error);
                setIsRouteTransitioning(false);
            }
        },
        onGeofenceUpdated: (showPickup: boolean, showDestination: boolean) => {
            console.log('🎯 Geofence visibility updated by phase manager', { showPickup, showDestination });
        },
        onCameraUpdated: (mode: 'center_on_driver' | 'show_full_route' | 'follow_navigation' | 'manual') => {
            console.log('📷 Camera mode updated by phase manager', mode);
        },
        onVoiceGuidanceCleared: () => {
            console.log('🔇 Voice guidance cleared by phase manager');
            Speech.stop();
        },
        onVoiceInstructionAnnounced: (message: string) => {
            console.log('🗣️ Voice instruction announced by phase manager:', message);
            speakInstruction(message);
        },
        onPhaseChange: (fromPhase: NavigationPhase, toPhase: NavigationPhase) => {
            console.log(`🔄 Phase changed: ${fromPhase} -> ${toPhase}`);
            setIsRouteTransitioning(false);
        },
        onTransitionStart: (fromPhase: NavigationPhase, toPhase: NavigationPhase) => {
            console.log(`🚀 Phase transition started: ${fromPhase} -> ${toPhase}`);
            setIsRouteTransitioning(true);
        },
        onTransitionComplete: (result: any) => {
            console.log('✅ Phase transition completed:', result);
            setIsRouteTransitioning(false);
        },
        onTransitionError: (error: string, result: any) => {
            console.error('❌ Phase transition error:', error, result);
            setIsRouteTransitioning(false);
            Alert.alert(
                'Navigation Transition Error',
                `Failed to transition navigation phase: ${error}`,
                [
                    { text: 'Retry', onPress: () => clearPhaseError() },
                    { text: 'Cancel', onPress: () => router.back() }
                ]
            );
        },
    });

    // Update callbacks ref when dependencies change
    useEffect(() => {
        callbacksRef.current.onRouteCleared = () => {
            console.log('🧹 Route cleared by phase manager');
            clearRoute();
            setIsRouteTransitioning(true);
        };
        callbacksRef.current.onRouteCalculationRequested = async (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) => {
            console.log('📍 Route calculation requested by phase manager', { origin, destination });
            setIsRouteTransitioning(true);
            try {
                await calculateRouteOnly();
            } catch (error) {
                console.error('❌ Route calculation failed:', error);
                setIsRouteTransitioning(false);
            }
        };
        callbacksRef.current.onNavigationRestarted = async (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) => {
            console.log('🚀 Navigation restart requested by phase manager', { origin, destination });
            setIsRouteTransitioning(true);
            try {
                await restartNavigation(origin, destination);
                setIsRouteTransitioning(false);
            } catch (error) {
                console.error('❌ Navigation restart failed:', error);
                setIsRouteTransitioning(false);
            }
        };
        callbacksRef.current.onVoiceInstructionAnnounced = (message: string) => {
            console.log('🗣️ Voice instruction announced by phase manager:', message);
            speakInstruction(message);
        };
        callbacksRef.current.onTransitionError = (error: string, result: any) => {
            console.error('❌ Phase transition error:', error, result);
            setIsRouteTransitioning(false);
            Alert.alert(
                'Navigation Transition Error',
                `Failed to transition navigation phase: ${error}`,
                [
                    { text: 'Retry', onPress: () => clearPhaseError() },
                    { text: 'Cancel', onPress: () => router.back() }
                ]
            );
        };
    }, [clearRoute, calculateRouteOnly, restartNavigation, speakInstruction, router]);

    // Create stable callback wrappers
    const stableCallbacks = useMemo(() => ({
        onRouteCleared: () => callbacksRef.current.onRouteCleared(),
        onRouteCalculationRequested: async (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) =>
            await callbacksRef.current.onRouteCalculationRequested(origin, destination),
        onNavigationRestarted: async (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) =>
            await callbacksRef.current.onNavigationRestarted(origin, destination),
        onGeofenceUpdated: (showPickup: boolean, showDestination: boolean) =>
            callbacksRef.current.onGeofenceUpdated(showPickup, showDestination),
        onCameraUpdated: (mode: 'center_on_driver' | 'show_full_route' | 'follow_navigation' | 'manual') =>
            callbacksRef.current.onCameraUpdated(mode),
        onVoiceGuidanceCleared: () => callbacksRef.current.onVoiceGuidanceCleared(),
        onVoiceInstructionAnnounced: (message: string) => callbacksRef.current.onVoiceInstructionAnnounced(message),
        onPhaseChange: (fromPhase: NavigationPhase, toPhase: NavigationPhase) =>
            callbacksRef.current.onPhaseChange(fromPhase, toPhase),
        onTransitionStart: (fromPhase: NavigationPhase, toPhase: NavigationPhase) =>
            callbacksRef.current.onTransitionStart(fromPhase, toPhase),
        onTransitionComplete: (result: any) => callbacksRef.current.onTransitionComplete(result),
        onTransitionError: (error: string, result: any) => callbacksRef.current.onTransitionError(error, result),
    }), []);

    // Navigation phase manager
    const {
        currentPhase: navigationPhase,
        isTransitioning: isPhaseTransitioning,
        transitionProgress,
        error: phaseTransitionError,
        transitionToPhase,
        clearError: clearPhaseError,
        cleanup: cleanupPhaseManager
    } = useNavigationPhaseManager({
        initialPhase: 'to-pickup',
        driverLocation: driverLocation || undefined,
        pickupLocation,
        destinationLocation,
        hasActiveRoute: false,
        isNavigationActive: false,
        // Navigation integration callbacks - now stable
        ...stableCallbacks,
    });

    // Get driver's current location
    useEffect(() => {
        let isMounted = true;

        (async () => {
            try {
                // Request location permissions
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    if (isMounted) {
                        Alert.alert(
                            'Permission Denied',
                            'Location permission is required for navigation',
                            [{ text: 'OK', onPress: () => router.back() }]
                        );
                    }
                    return;
                }

                // Get initial location
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High
                });

                if (isMounted) {
                    setDriverLocation({
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude
                    });
                    setLocationLoading(false);

                    console.log('📍 Initial driver location:', {
                        lat: location.coords.latitude,
                        lng: location.coords.longitude
                    });
                }

                // Start watching location
                locationSubscription.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.BestForNavigation,
                        timeInterval: 1000,
                        distanceInterval: 5
                    },
                    (newLocation) => {
                        if (isMounted) {
                            setDriverLocation({
                                latitude: newLocation.coords.latitude,
                                longitude: newLocation.coords.longitude
                            });
                        }
                    }
                );
            } catch (error) {
                console.error('❌ Error getting location:', error);
                if (isMounted) {
                    setLocationLoading(false);
                    Alert.alert(
                        'Location Error',
                        'Unable to get your current location',
                        [{ text: 'Retry', onPress: () => window.location.reload() }]
                    );
                }
            }
        })();

        return () => {
            isMounted = false;
            if (locationSubscription.current) {
                locationSubscription.current.remove();
            }
        };
    }, [router]);

    // Memoized geofence callbacks to prevent recreation
    const onEnterPickupGeofence = useCallback(async () => {
        console.log('🎯 Entered pickup geofence, transitioning to at-pickup phase');
        await transitionToPhase('at-pickup');
        startTimer();
    }, [transitionToPhase, startTimer]);

    const onEnterDestinationGeofence = useCallback(async () => {
        console.log('🎯 Entered destination geofence, transitioning to at-destination phase');
        await transitionToPhase('at-destination');
    }, [transitionToPhase]);

    // Geofencing
    const { isInPickupGeofence, isInDestinationGeofence, geofenceVisibility, cleanup: cleanupGeofencing } = useGeofencing({
        driverLocation,
        pickupLocation,
        destinationLocation,
        navigationPhase,
        onEnterPickupGeofence,
        onEnterDestinationGeofence
    });

    // Memoized navigation configuration to prevent recalculation
    const navConfig = useMemo(() => {
        if ((navigationPhase === 'to-pickup' || navigationPhase === 'at-pickup') && driverLocation) {
            return {
                origin: {
                    latitude: driverLocation.latitude,
                    longitude: driverLocation.longitude
                },
                destination: {
                    latitude: rideData.pickupLat,
                    longitude: rideData.pickupLng
                },
                destinationName: rideData.pickupAddress,
                phaseMessage: 'Navigating to pickup location'
            };
        } else if (navigationPhase === 'to-destination' || navigationPhase === 'at-destination') {
            return {
                origin: {
                    latitude: rideData.pickupLat,
                    longitude: rideData.pickupLng
                },
                destination: {
                    latitude: rideData.destLat,
                    longitude: rideData.destLng
                },
                destinationName: rideData.destAddress,
                phaseMessage: 'Navigating to destination'
            };
        }
        return null;
    }, [
        navigationPhase,
        driverLocation?.latitude,
        driverLocation?.longitude,
        rideData.pickupLat,
        rideData.pickupLng,
        rideData.destLat,
        rideData.destLng,
        rideData.pickupAddress,
        rideData.destAddress
    ]);

    // Use OSRM navigation hook with stable configuration
    const {
        isNavigating,
        isLoading,
        route,
        currentPosition,
        currentHeading,
        progress,
        currentInstruction,
        error,
        startNavigation,
        stopNavigation,
        retryNavigation,
        clearRoute,
        restartNavigation,
        calculateRouteOnly,
        getRouteGeoJSON,
        getMapboxCameraConfig,
        formatDistance,
        formatDuration,
        getManeuverIcon
    } = useOSRMNavigation({
        origin: navConfig?.origin || { latitude: 0, longitude: 0 },
        destination: navConfig?.destination || { latitude: 0, longitude: 0 },
        enabled: !!navConfig && !!driverLocation && !locationLoading &&
            navigationPhase !== 'at-pickup' && navigationPhase !== 'at-destination' &&
            navigationPhase !== 'picking-up' && navigationPhase !== 'completed' &&
            !isPhaseTransitioning,
        onDestinationReached: () => {
            console.log('Navigation destination reached');
        },
        onNavigationError: useCallback((error: Error) => {
            console.error('🚨 Navigation error:', error);
            setIsRouteTransitioning(false);
            Alert.alert(
                'Navigation Error',
                error.message,
                [
                    {
                        text: 'Retry', onPress: () => {
                            if (retryNavigationRef.current) {
                                retryNavigationRef.current();
                            }
                        }
                    },
                    { text: 'Cancel', onPress: () => router.back() }
                ]
            );
        }, [router]),
        onNewInstruction: useCallback((instruction: any) => {
            console.log('🗣️ New instruction:', instruction.voiceInstruction);
            speakInstruction(instruction.voiceInstruction);
        }, [speakInstruction])
    });

    // Update retry navigation ref
    useEffect(() => {
        retryNavigationRef.current = retryNavigation;
    }, [retryNavigation]);

    // Extract maneuver points from route - memoized to prevent unnecessary recalculation
    useEffect(() => {
        if (route && route.instructions) {
            const points = route.instructions
                .filter(inst => inst.maneuver && inst.maneuver.location)
                .map(inst => ({
                    coordinate: [inst.maneuver.location.longitude, inst.maneuver.location.latitude] as [number, number],
                    type: inst.maneuver.type,
                    modifier: inst.maneuver.modifier,
                    instruction: inst.text
                }));
            setManeuverPoints(points);
            console.log('📍 Maneuver points extracted:', points.length);
        }
    }, [route]);

    // Auto-start navigation when ready - memoized dependencies to prevent infinite loops
    useEffect(() => {
        if (!isNavigating && !isLoading && !error && navConfig && !isPhaseTransitioning &&
            (navigationPhase === 'to-pickup' || navigationPhase === 'to-destination')) {
            console.log('🚀 Auto-starting navigation for phase:', navigationPhase);
            startNavigation();

            // Initial voice announcement with delay
            const timeoutId = setTimeout(() => {
                if (navigationPhase === 'to-pickup') {
                    speakInstruction(`Starting navigation to pickup location at ${rideData.pickupAddress}`);
                } else if (navigationPhase === 'to-destination') {
                    speakInstruction(`Starting navigation to destination at ${rideData.destAddress}`);
                }
            }, 1000);

            return () => clearTimeout(timeoutId);
        }
    }, [
        navigationPhase,
        isNavigating,
        isLoading,
        error,
        isPhaseTransitioning,
        navConfig?.origin?.latitude,
        navConfig?.origin?.longitude,
        navConfig?.destination?.latitude,
        navConfig?.destination?.longitude,
        startNavigation,
        speakInstruction,
        rideData.pickupAddress,
        rideData.destAddress
    ]);

    // Update map camera when position changes
    useEffect(() => {
        if (currentPosition && mapRef.current) {
            const cameraConfig = getMapboxCameraConfig();
            if (cameraConfig) {
                mapRef.current.flyTo(
                    cameraConfig.centerCoordinate,
                    cameraConfig.zoomLevel,
                    cameraConfig.heading
                );
            }
        }
    }, [currentPosition, currentHeading, getMapboxCameraConfig]);

    // Memoized event handlers
    const handlePassengerPickup = useCallback(async () => {
        stopTimer();

        try {
            console.log('🚗 Starting passenger pickup process');
            const pickupResult = await transitionToPhase('picking-up');

            if (!pickupResult.success) {
                console.error('❌ Failed to transition to picking-up phase:', pickupResult.error);
                Alert.alert(
                    'Phase Transition Error',
                    `Failed to update navigation phase: ${pickupResult.error}`,
                    [{ text: 'OK' }]
                );
                return;
            }

            // Wait 2 seconds for pickup animation/UI, then transition to destination
            const timeoutId = setTimeout(async () => {
                try {
                    console.log('🎯 Transitioning to destination phase');
                    // The phase transition will handle clearing route and restarting navigation
                    const result = await transitionToPhase('to-destination');

                    if (!result.success) {
                        console.error('❌ Transition to destination failed:', result.error);
                        Alert.alert(
                            'Navigation Error',
                            `Failed to start navigation to destination: ${result.error}`,
                            [
                                { text: 'Retry', onPress: () => handlePassengerPickup() },
                                { text: 'Cancel', onPress: () => router.back() }
                            ]
                        );
                    }
                } catch (error) {
                    console.error('❌ Failed to transition to destination phase:', error);
                    Alert.alert(
                        'Navigation Error',
                        'Failed to start navigation to destination. Please try again.',
                        [
                            { text: 'Retry', onPress: () => handlePassengerPickup() },
                            { text: 'Cancel', onPress: () => router.back() }
                        ]
                    );
                }
            }, 2000);

            // Safety timeout - if we're still in picking-up phase after 15 seconds, force transition
            const safetyTimeoutId = setTimeout(() => {
                if (navigationPhase === 'picking-up') {
                    console.warn('⚠️ Safety timeout: forcing transition to destination phase');
                    transitionToPhase('to-destination').catch(error => {
                        console.error('❌ Safety transition failed:', error);
                        Alert.alert(
                            'Navigation Error',
                            'Navigation appears to be stuck. Please restart the trip.',
                            [{ text: 'OK', onPress: () => router.back() }]
                        );
                    });
                }
            }, 15000);

            // Clear safety timeout when component unmounts or phase changes
            return () => {
                clearTimeout(timeoutId);
                clearTimeout(safetyTimeoutId);
            };

        } catch (error) {
            console.error('❌ Failed to transition to picking-up phase:', error);
            Alert.alert(
                'Phase Transition Error',
                'Failed to update navigation phase. Please try again.',
                [{ text: 'OK' }]
            );
        }
    }, [stopTimer, transitionToPhase, navigationPhase, router]);

    const handleTripComplete = useCallback(async () => {
        try {
            await transitionToPhase('completed');

            Alert.alert(
                'Trip Completed! 🎉',
                `Successfully dropped off ${rideData.passengerName} at ${rideData.destAddress}`,
                [
                    {
                        text: 'Complete & Rate',
                        onPress: () => router.replace('/(app)')
                    }
                ]
            );
        } catch (error) {
            console.error('❌ Failed to complete trip:', error);
            Alert.alert(
                'Trip Completed! 🎉',
                `Successfully dropped off ${rideData.passengerName} at ${rideData.destAddress}`,
                [
                    {
                        text: 'Complete & Rate',
                        onPress: () => router.replace('/(app)')
                    }
                ]
            );
        }
    }, [transitionToPhase, rideData, router]);

    const handleBackPress = useCallback(() => {
        Alert.alert(
            'Cancel Navigation',
            'Are you sure you want to cancel this trip?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        stopNavigation();
                        await Speech.stop();
                        router.back();
                    }
                }
            ]
        );
    }, [stopNavigation, router]);

    const handleRecenter = useCallback(() => {
        if (currentPosition && mapRef.current) {
            console.log('🎯 Recentering map on driver');
            mapRef.current.flyTo(
                [currentPosition.longitude, currentPosition.latitude],
                18,
                currentHeading
            );
        }
    }, [currentPosition, currentHeading]);

    const handleVolumeToggle = useCallback(() => {
        setIsMuted(!isMuted);
        if (isMuted) {
            speakInstruction('Voice guidance enabled');
        }
    }, [isMuted, speakInstruction]);

    const calculateETA = useCallback(() => {
        if (!progress?.durationRemaining) return '-- --';

        try {
            const now = new Date();
            const eta = new Date(now.getTime() + progress.durationRemaining * 1000);
            return eta.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            console.warn('Error calculating ETA:', error);
            return '-- --';
        }
    }, [progress?.durationRemaining]);

    // Cleanup on unmount only
    useEffect(() => {
        return () => {
            console.log('🧹 Driver navigation component unmounting, cleaning up...');
            Speech.stop();
            cleanupGeofencing();
            cleanupPhaseManager();
        };
    }, []); // Empty dependencies - only run on unmount

    // Show loading state
    if (locationLoading || (isLoading && !route) || isRouteTransitioning) {
        let title = 'Getting Your Location...';
        let subtitle = 'Please wait while we locate you';

        if (isRouteTransitioning) {
            title = 'Updating Navigation...';
            subtitle = `Transitioning to ${navigationPhase} phase`;
            if (transitionProgress > 0) {
                subtitle += ` (${transitionProgress}%)`;
            }
        } else if (isLoading && !route) {
            title = 'Starting Navigation...';
            subtitle = `Calculating route to ${navConfig?.destinationName}`;
        }

        return (
            <SafeAreaView className="flex-1 bg-gray-100">
                <Stack.Screen options={{ headerShown: false }} />
                <LoadingScreen
                    title={title}
                    subtitle={subtitle}
                />
            </SafeAreaView>
        );
    }

    // Show error state
    if ((error && !route) || phaseTransitionError) {
        const errorTitle = phaseTransitionError ? 'Phase Transition Error' : 'Navigation Error';
        const errorMessage = phaseTransitionError || error?.message || 'Unknown error occurred';
        const onRetry = phaseTransitionError ? clearPhaseError : retryNavigation;

        return (
            <SafeAreaView className="flex-1 bg-gray-100">
                <Stack.Screen options={{ headerShown: false }} />
                <ErrorScreen
                    title={errorTitle}
                    message={errorMessage}
                    onRetry={onRetry}
                    onGoBack={() => router.back()}
                />
            </SafeAreaView>
        );
    }

    // Show pickup waiting screen when at pickup location
    if (navigationPhase === 'at-pickup') {
        return (
            <SafeAreaView className="flex-1 bg-blue-500">
                <Stack.Screen options={{ headerShown: false }} />
                <PickupWaitingScreen
                    mapRef={mapRef}
                    rideData={rideData}
                    currentPosition={currentPosition}
                    driverLocation={driverLocation}
                    currentHeading={currentHeading}
                    pickupTimer={pickupTimer}
                    formatTimer={formatTimer}
                    onPassengerPickup={handlePassengerPickup}
                    onBackPress={handleBackPress}
                />
            </SafeAreaView>
        );
    }

    // Show loading screen when picking up passenger
    if (navigationPhase === 'picking-up') {
        return (
            <SafeAreaView className="flex-1 bg-green-600">
                <Stack.Screen options={{ headerShown: false }} />
                <LoadingScreen
                    title="Starting Trip"
                    subtitle={`Navigating to ${rideData.destAddress}`}
                    color="#34A853"
                />
            </SafeAreaView>
        );
    }

    // Show arrival at destination screen
    if (navigationPhase === 'at-destination') {
        return (
            <SafeAreaView className="flex-1 bg-green-600">
                <Stack.Screen options={{ headerShown: false }} />
                <DestinationArrivalScreen
                    mapRef={mapRef}
                    rideData={rideData}
                    currentPosition={currentPosition}
                    driverLocation={driverLocation}
                    currentHeading={currentHeading}
                    onTripComplete={handleTripComplete}
                />
            </SafeAreaView>
        );
    }

    // Get route GeoJSON for display
    const routeGeoJSON = getRouteGeoJSON();

    // Main navigation view
    return (
        <View className="flex-1">
            <Stack.Screen options={{ headerShown: false }} />

            {/* Navigation Map with Route, Maneuver Arrows, and Geofences */}
            <NavigationMapboxMap
                ref={mapRef}
                driverLocation={currentPosition || driverLocation}
                pickup={navigationPhase === 'to-pickup' ? {
                    latitude: rideData.pickupLat,
                    longitude: rideData.pickupLng
                } : undefined}
                destination={{
                    latitude: navConfig?.destination.latitude || rideData.destLat,
                    longitude: navConfig?.destination.longitude || rideData.destLng
                }}
                routeGeoJSON={routeGeoJSON}
                maneuverPoints={maneuverPoints}
                geofenceAreas={[
                    {
                        id: 'pickup-geofence',
                        center: [rideData.pickupLng, rideData.pickupLat] as [number, number],
                        radius: GEOFENCE_RADIUS_METERS,
                        color: '#4285F4',
                        opacity: 0.2,
                        type: 'pickup' as const,
                        visible: geofenceVisibility.showPickupGeofence
                    },
                    {
                        id: 'destination-geofence',
                        center: [rideData.destLng, rideData.destLat] as [number, number],
                        radius: GEOFENCE_RADIUS_METERS,
                        color: '#34A853',
                        opacity: 0.2,
                        type: 'destination' as const,
                        visible: geofenceVisibility.showDestinationGeofence
                    }
                ]}
                navigationPhase={navigationPhase}
                onGeofenceTransition={(geofenceId, visible) => {
                    console.log(`🔄 Geofence transition callback: ${geofenceId} -> ${visible ? 'visible' : 'hidden'}`);
                }}
                bearing={currentHeading}
                pitch={60}
                zoomLevel={18}
                followMode="course"
                showUserLocation={true}
                enableRotation={false}
                enablePitching={false}
                enableScrolling={true}
                mapStyle="mapbox://styles/mapbox/navigation-day-v1"
            />

            {/* Phase Indicator Banner */}
            <PhaseIndicatorBanner
                navigationPhase={navigationPhase}
                pickupAddress={rideData.pickupAddress}
                destinationAddress={rideData.destAddress}
                onClose={handleBackPress}
            />

            {/* ETA Card */}
            {isNavigating && (
                <EtaCard
                    arrivalTime={calculateETA()}
                    timeRemaining={formatDuration(progress?.durationRemaining || 0)}
                    distance={formatDistance(progress?.distanceRemaining || 0)}
                    isVisible={isNavigating && progress !== null}
                />
            )}

            {/* Navigation Instructions */}
            {currentInstruction && isNavigating && (
                <NavigationInstruction
                    instruction={currentInstruction.text || currentInstruction.voiceInstruction || 'Continue straight'}
                    distance={formatDistance(currentInstruction.distance || 0)}
                    maneuver={normalizeManeuverType(currentInstruction.maneuver?.type)}
                    isVisible={showInstructions && isNavigating}
                />
            )}

            {/* Passenger Info Card */}
            <PassengerInfoCard
                passengerName={rideData.passengerName}
                estimatedPrice={rideData.estimatedPrice}
                isVisible={navigationPhase === 'to-pickup'}
            />

            {/* Navigation Controls */}
            {isNavigating && (
                <NavigationControls
                    onRecenter={handleRecenter}
                    onVolumeToggle={handleVolumeToggle}
                    onRouteOptions={() => {
                        Alert.alert(
                            'Navigation Info',
                            `Phase: ${navigationPhase}\nIn Pickup Zone: ${isInPickupGeofence}\nIn Destination Zone: ${isInDestinationGeofence}`,
                            [{ text: 'OK' }]
                        );
                    }}
                    isMuted={isMuted}
                    isVisible={isNavigating}
                />
            )}
        </View>
    );
}