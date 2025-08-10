import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Alert, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import { useOSRMNavigation } from '@/hooks/useOSRMNavigation';
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
    const [navigationPhase, setNavigationPhase] = useState<NavigationPhase>('to-pickup');
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

    // Geofencing using custom hook
    const { isInPickupGeofence, isInDestinationGeofence } = useGeofencing({
        driverLocation,
        pickupLocation: { latitude: rideData.pickupLat, longitude: rideData.pickupLng },
        destinationLocation: { latitude: rideData.destLat, longitude: rideData.destLng },
        navigationPhase,
        onEnterPickupGeofence: () => {
            setNavigationPhase('at-pickup');
            speakInstruction('You have arrived at the pickup location. Waiting for passenger.');
            startTimer();
        },
        onEnterDestinationGeofence: () => {
            setNavigationPhase('at-destination');
            speakInstruction('You have arrived at the destination.');
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

    // Use OSRM navigation hook with dynamic origin/destination
    const {
        isNavigating,
        isLoading,
        route,
        currentPosition,
        currentHeading,
        progress,
        currentInstruction,
        nextInstruction,
        error,
        startNavigation,
        stopNavigation,
        retryNavigation,
        getRouteGeoJSON,
        getMapboxCameraConfig,
        formatDistance,
        formatDuration,
        getManeuverIcon,
        navigationService
    } = useOSRMNavigation({
        origin: navConfig?.origin || { latitude: 0, longitude: 0 },
        destination: navConfig?.destination || { latitude: 0, longitude: 0 },
        enabled: !!navConfig && !!driverLocation && !locationLoading &&
            navigationPhase !== 'at-pickup' && navigationPhase !== 'at-destination' &&
            navigationPhase !== 'picking-up' && navigationPhase !== 'completed',
        onDestinationReached: () => {
            // Geofencing handles arrival detection now
            console.log('Navigation destination reached');
        },
        onNavigationError: (error) => {
            console.error('🚨 Navigation error:', error);
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

    // Auto-start navigation when ready
    useEffect(() => {
        if (!isNavigating && !isLoading && !error && navConfig &&
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
    }, [navigationPhase, navConfig, isNavigating, isLoading, error, rideData.pickupAddress, rideData.destAddress, speakInstruction, startNavigation]);

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

    // Event handlers
    const handlePassengerPickup = useCallback(() => {
        stopTimer();
        setNavigationPhase('picking-up');
        speakInstruction('Passenger picked up. Starting trip to destination.');

        // Simulate loading passenger and then start navigation to destination
        setTimeout(() => {
            setNavigationPhase('to-destination');
        }, 2000);
    }, [speakInstruction, stopTimer]);

    const handleTripComplete = useCallback(() => {
        setNavigationPhase('completed');
        speakInstruction('Trip completed successfully!');

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
    }, [rideData, router, speakInstruction]);

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

    // Cleanup speech on unmount
    useEffect(() => {
        return () => {
            Speech.stop();
        };
    }, []);

    // Show loading state
    if (locationLoading || (isLoading && !route)) {
        return (
            <SafeAreaView className="flex-1 bg-gray-100">
                <Stack.Screen options={{ headerShown: false }} />
                <LoadingScreen
                    title={locationLoading ? 'Getting Your Location...' : 'Starting Navigation...'}
                    subtitle={locationLoading
                        ? 'Please wait while we locate you'
                        : `Calculating route to ${navConfig?.destinationName}`
                    }
                />
            </SafeAreaView>
        );
    }

    // Show error state
    if (error && !route) {
        return (
            <SafeAreaView className="flex-1 bg-gray-100">
                <Stack.Screen options={{ headerShown: false }} />
                <ErrorScreen
                    title="Navigation Error"
                    message={error.message}
                    onRetry={retryNavigation}
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
                        center: [rideData.pickupLng, rideData.pickupLat],
                        radius: GEOFENCE_RADIUS_METERS,
                        color: '#4285F4',
                        opacity: 0.2
                    },
                    {
                        center: [rideData.destLng, rideData.destLat],
                        radius: GEOFENCE_RADIUS_METERS,
                        color: '#34A853',
                        opacity: 0.2
                    }
                ]}
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