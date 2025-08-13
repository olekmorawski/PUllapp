import React, { useRef, useEffect, useState, useCallback } from 'react';
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
import {PassengerInfoCard} from "@/components/Navigation/PassangerInfoCard";
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

    console.log('🚗 Geofenced Driver Navigation Screen loaded with params:', params);

    // Utility functions
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

    const normalizeManeuverType = (maneuverType?: string): 'turn-left' | 'turn-right' | 'straight' | 'u-turn' => {
        if (!maneuverType) return 'straight';

        const normalized = maneuverType.toLowerCase();

        if (normalized.includes('left')) return 'turn-left';
        if (normalized.includes('right')) return 'turn-right';
        if (normalized.includes('u-turn') || normalized.includes('uturn')) return 'u-turn';

        return 'straight';
    };

    // Custom hooks
    const { pickupTimer, startTimer, stopTimer, formatTimer } = usePickupTimer();
    const { speakInstruction } = useVoiceGuidance(isMuted);

    // Validate and extract ride data
    const rideData = validateParams(params);

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

    // Navigation phase manager with route transition handling
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
        pickupLocation: { latitude: rideData.pickupLat, longitude: rideData.pickupLng },
        destinationLocation: { latitude: rideData.destLat, longitude: rideData.destLng },
        hasActiveRoute: false, // Will be updated based on navigation state
        isNavigationActive: false, // Will be updated based on navigation state
        onRouteCleared: () => {
            console.log('🧹 Route cleared by phase manager');
            setIsRouteTransitioning(true);
        },
        onRouteCalculationRequested: async (origin, destination) => {
            console.log('📍 Route calculation requested by phase manager', { origin, destination });
            setIsRouteTransitioning(true);
            // The OSRM hook will handle the actual route calculation
        },
        onNavigationRestarted: async (origin, destination) => {
            console.log('🚀 Navigation restart requested by phase manager', { origin, destination });
            setIsRouteTransitioning(true);
            // The OSRM hook will handle the actual navigation restart
        },
        onGeofenceUpdated: (showPickup, showDestination) => {
            console.log('🎯 Geofence visibility updated by phase manager', { showPickup, showDestination });
        },
        onCameraUpdated: (mode) => {
            console.log('📷 Camera mode updated by phase manager', mode);
        },
        onVoiceGuidanceCleared: () => {
            console.log('🔇 Voice guidance cleared by phase manager');
            Speech.stop();
        },
        onVoiceInstructionAnnounced: (message) => {
            console.log('🗣️ Voice instruction announced by phase manager:', message);
            speakInstruction(message);
        },
        onPhaseChange: (fromPhase, toPhase) => {
            console.log(`🔄 Phase changed: ${fromPhase} -> ${toPhase}`);
            setIsRouteTransitioning(false);
        },
        onTransitionStart: (fromPhase, toPhase) => {
            console.log(`🚀 Phase transition started: ${fromPhase} -> ${toPhase}`);
            setIsRouteTransitioning(true);
        },
        onTransitionComplete: (result) => {
            console.log('✅ Phase transition completed:', result);
            setIsRouteTransitioning(false);
        },
        onTransitionError: (error, result) => {
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
        }
    });

    // Get driver's current location
    useEffect(() => {
        (async () => {
            try {
                // Request location permissions
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(
                        'Permission Denied',
                        'Location permission is required for navigation',
                        [{ text: 'OK', onPress: () => router.back() }]
                    );
                    return;
                }

                // Get initial location
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High
                });

                setDriverLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });
                setLocationLoading(false);

                console.log('📍 Initial driver location:', {
                    lat: location.coords.latitude,
                    lng: location.coords.longitude
                });

                // Start watching location
                locationSubscription.current = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.BestForNavigation,
                        timeInterval: 1000,
                        distanceInterval: 5
                    },
                    (newLocation) => {
                        setDriverLocation({
                            latitude: newLocation.coords.latitude,
                            longitude: newLocation.coords.longitude
                        });
                    }
                );
            } catch (error) {
                console.error('❌ Error getting location:', error);
                setLocationLoading(false);
                Alert.alert(
                    'Location Error',
                    'Unable to get your current location',
                    [{ text: 'Retry', onPress: () => window.location.reload() }]
                );
            }
        })();

        return () => {
            if (locationSubscription.current) {
                locationSubscription.current.remove();
            }
        };
    }, []);

    // Geofencing using custom hook with phase manager integration
    const { isInPickupGeofence, isInDestinationGeofence, geofenceVisibility, cleanup: cleanupGeofencing } = useGeofencing({
        driverLocation,
        pickupLocation: { latitude: rideData.pickupLat, longitude: rideData.pickupLng },
        destinationLocation: { latitude: rideData.destLat, longitude: rideData.destLng },
        navigationPhase,
        onEnterPickupGeofence: async () => {
            console.log('🎯 Entered pickup geofence, transitioning to at-pickup phase');
            await transitionToPhase('at-pickup');
            startTimer();
        },
        onEnterDestinationGeofence: async () => {
            console.log('🎯 Entered destination geofence, transitioning to at-destination phase');
            await transitionToPhase('at-destination');
        }
    });

    // Determine current navigation origin and destination based on phase
    const getCurrentNavigationConfig = () => {
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
    };

    const navConfig = getCurrentNavigationConfig();

    // Use OSRM navigation hook with dynamic origin/destination and phase transition support
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
            // Geofencing handles arrival detection now
            console.log('Navigation destination reached');
        },
        onNavigationError: (error) => {
            console.error('🚨 Navigation error:', error);
            setIsRouteTransitioning(false);
            Alert.alert(
                'Navigation Error',
                error.message,
                [
                    { text: 'Retry', onPress: retryNavigation },
                    { text: 'Cancel', onPress: () => router.back() }
                ]
            );
        },
        onNewInstruction: (instruction) => {
            console.log('🗣️ New instruction:', instruction.voiceInstruction);
            speakInstruction(instruction.voiceInstruction);
        }
    });

    // Extract maneuver points from route
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

    // Auto-start navigation when ready (managed by phase transitions)
    useEffect(() => {
        if (!isNavigating && !isLoading && !error && navConfig && !isPhaseTransitioning &&
            (navigationPhase === 'to-pickup' || navigationPhase === 'to-destination')) {
            console.log('🚀 Auto-starting navigation for phase:', navigationPhase);
            startNavigation();

            // Initial voice announcement
            setTimeout(() => {
                if (navigationPhase === 'to-pickup') {
                    speakInstruction(`Starting navigation to pickup location at ${rideData.pickupAddress}`);
                } else if (navigationPhase === 'to-destination') {
                    speakInstruction(`Starting navigation to destination at ${rideData.destAddress}`);
                }
            }, 1000);
        }
    }, [navigationPhase, navConfig, isNavigating, isLoading, error, isPhaseTransitioning, rideData.pickupAddress, rideData.destAddress, speakInstruction, startNavigation]);

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

    // Event handlers with phase manager integration
    const handlePassengerPickup = useCallback(async () => {
        stopTimer();
        
        try {
            // Transition to picking-up phase
            await transitionToPhase('picking-up');
            
            // Simulate loading passenger and then start navigation to destination
            setTimeout(async () => {
                try {
                    // Clear previous route and transition to destination navigation
                    clearRoute();
                    await transitionToPhase('to-destination');
                    
                    // Restart navigation with new route from pickup to destination
                    if (navConfig?.destination) {
                        await restartNavigation(
                            { latitude: rideData.pickupLat, longitude: rideData.pickupLng },
                            navConfig.destination
                        );
                    }
                } catch (error) {
                    console.error('❌ Failed to transition to destination phase:', error);
                    Alert.alert(
                        'Navigation Error',
                        'Failed to start navigation to destination. Please try again.',
                        [{ text: 'OK' }]
                    );
                }
            }, 2000);
        } catch (error) {
            console.error('❌ Failed to transition to picking-up phase:', error);
            Alert.alert(
                'Phase Transition Error',
                'Failed to update navigation phase. Please try again.',
                [{ text: 'OK' }]
            );
        }
    }, [stopTimer, transitionToPhase, clearRoute, restartNavigation, rideData, navConfig]);

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
            // Still allow completion even if phase transition fails
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

    // Navigation control handlers
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

    // Calculate ETA
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
    }, [progress]);

    // Cleanup speech, geofencing, and phase manager on unmount
    useEffect(() => {
        return () => {
            Speech.stop();
            cleanupGeofencing();
            cleanupPhaseManager();
        };
    }, [cleanupGeofencing, cleanupPhaseManager]);

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
                    // Pickup geofence
                    {
                        id: 'pickup-geofence',
                        center: [rideData.pickupLng, rideData.pickupLat] as [number, number],
                        radius: GEOFENCE_RADIUS_METERS,
                        color: '#4285F4',
                        opacity: 0.2,
                        type: 'pickup' as const,
                        visible: geofenceVisibility.showPickupGeofence
                    },
                    // Destination geofence
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

            {/* Passenger Info Card (shown during pickup phase) */}
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