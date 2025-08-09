import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, SafeAreaView, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';
import { useOSRMNavigation } from '@/hooks/useOSRMNavigation';
import { RideNavigationData } from '@/hooks/useEnhancedDriverNavigation';
import NavigationMapboxMap, { NavigationMapboxMapRef } from '@/components/NavigationMapboxMap';
import {
    EtaCard,
    NavigationInstruction,
    NavigationControls,
} from '@/components/NavigationUIComponents';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Navigation phases - Added 'at-pickup' and 'at-destination' phases
type NavigationPhase = 'to-pickup' | 'at-pickup' | 'picking-up' | 'to-destination' | 'at-destination' | 'completed';

// Geofence configuration
const GEOFENCE_RADIUS_METERS = 500; // 50 meters radius for arrival detection
const GEOFENCE_CHECK_INTERVAL = 20000; // Check every 2 seconds

// Voice settings
const VOICE_OPTIONS = {
    language: 'en-US',
    pitch: 1,
    rate: 0.9,
};

// Safe parameter validation
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

// Helper function to normalize maneuver types
const normalizeManeuverType = (maneuverType?: string): 'turn-left' | 'turn-right' | 'straight' | 'u-turn' => {
    if (!maneuverType) return 'straight';

    const normalized = maneuverType.toLowerCase();

    if (normalized.includes('left')) return 'turn-left';
    if (normalized.includes('right')) return 'turn-right';
    if (normalized.includes('u-turn') || normalized.includes('uturn')) return 'u-turn';

    return 'straight';
};

export default function GeofencedDriverNavigationScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const mapRef = useRef<NavigationMapboxMapRef>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [showInstructions, setShowInstructions] = useState(true);
    const lastSpokenInstructionRef = useRef<string>('');
    const [navigationPhase, setNavigationPhase] = useState<NavigationPhase>('to-pickup');
    const [driverLocation, setDriverLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    const [locationLoading, setLocationLoading] = useState(true);
    const locationSubscription = useRef<Location.LocationSubscription | null>(null);
    // Fix: Use number type for React Native timers instead of NodeJS.Timeout
    const geofenceCheckInterval = useRef<number | null>(null);
    const [isInPickupGeofence, setIsInPickupGeofence] = useState(false);
    const [isInDestinationGeofence, setIsInDestinationGeofence] = useState(false);
    const [pickupTimer, setPickupTimer] = useState(0);
    // Fix: Use number type for React Native timers instead of NodeJS.Timeout
    const pickupTimerInterval = useRef<number | null>(null);
    const [maneuverPoints, setManeuverPoints] = useState<Array<{
        coordinate: [number, number];
        type: string;
        modifier?: string;
        instruction: string;
    }>>([]);

    console.log('🚗 Geofenced Driver Navigation Screen loaded with params:', params);

    // Validate and extract ride data from params
    const rideData = validateParams(params);

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
            if (geofenceCheckInterval.current) {
                clearInterval(geofenceCheckInterval.current);
            }
            if (pickupTimerInterval.current) {
                clearInterval(pickupTimerInterval.current);
            }
        };
    }, []);

    if (!rideData) {
        return (
            <SafeAreaView className="flex-1 bg-gray-100">
                <Stack.Screen options={{ headerShown: false }} />
                <View className="flex-1 justify-center items-center">
                    <View className="bg-white rounded-2xl p-8 mx-8 items-center shadow-lg">
                        <Ionicons name="warning" size={48} color="#EA4335" />
                        <Text className="text-xl font-semibold text-gray-900 mt-4 mb-2 text-center">
                            Invalid Navigation Data
                        </Text>
                        <Text className="text-base text-gray-600 text-center leading-6 mb-6">
                            The ride information is missing or invalid. Please try again.
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.replace('/(app)')}
                            className="bg-blue-500 rounded-xl px-6 py-3"
                        >
                            <Text className="text-white font-semibold">
                                Back to Dashboard
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // Voice guidance function
    const speakInstruction = useCallback(async (text: string) => {
        if (isMuted || !text || text === lastSpokenInstructionRef.current) {
            return;
        }

        try {
            await Speech.stop();
            await Speech.speak(text, VOICE_OPTIONS);
            lastSpokenInstructionRef.current = text;
        } catch (error) {
            console.warn('Speech error:', error);
        }
    }, [isMuted]);

    // Geofence checking logic using geolib
    useEffect(() => {
        if (!driverLocation || !rideData) return;

        // Check geofences periodically
        const checkGeofences = () => {
            // Check pickup geofence (only relevant during 'to-pickup' phase)
            if (navigationPhase === 'to-pickup') {
                const distanceToPickup = getDistance(
                    {
                        latitude: driverLocation.latitude,
                        longitude: driverLocation.longitude
                    },
                    {
                        latitude: rideData.pickupLat,
                        longitude: rideData.pickupLng
                    }
                );

                const wasInPickupGeofence = isInPickupGeofence;
                const nowInPickupGeofence = distanceToPickup <= GEOFENCE_RADIUS_METERS;

                setIsInPickupGeofence(nowInPickupGeofence);

                // Entered pickup geofence
                if (!wasInPickupGeofence && nowInPickupGeofence) {
                    console.log('📍 Entered pickup geofence - Distance:', distanceToPickup, 'meters');
                    setNavigationPhase('at-pickup');
                    speakInstruction('You have arrived at the pickup location. Waiting for passenger.');

                    // Start pickup timer
                    let seconds = 0;
                    // Fix: Cast setInterval return value to number for React Native
                    pickupTimerInterval.current = setInterval(() => {
                        seconds++;
                        setPickupTimer(seconds);
                    }, 1000) as unknown as number;
                }
            }

            // Check destination geofence (only relevant during 'to-destination' phase)
            if (navigationPhase === 'to-destination') {
                const distanceToDestination = getDistance(
                    {
                        latitude: driverLocation.latitude,
                        longitude: driverLocation.longitude
                    },
                    {
                        latitude: rideData.destLat,
                        longitude: rideData.destLng
                    }
                );

                const wasInDestinationGeofence = isInDestinationGeofence;
                const nowInDestinationGeofence = distanceToDestination <= GEOFENCE_RADIUS_METERS;

                setIsInDestinationGeofence(nowInDestinationGeofence);

                // Entered destination geofence
                if (!wasInDestinationGeofence && nowInDestinationGeofence) {
                    console.log('📍 Entered destination geofence - Distance:', distanceToDestination, 'meters');
                    setNavigationPhase('at-destination');
                    speakInstruction('You have arrived at the destination.');
                }
            }
        };

        // Set up periodic geofence checking
        // Fix: Cast setInterval return value to number for React Native
        geofenceCheckInterval.current = setInterval(checkGeofences, GEOFENCE_CHECK_INTERVAL) as unknown as number;

        // Initial check
        checkGeofences();

        return () => {
            if (geofenceCheckInterval.current) {
                clearInterval(geofenceCheckInterval.current);
            }
        };
    }, [driverLocation, rideData, navigationPhase, isInPickupGeofence, isInDestinationGeofence, speakInstruction]);

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
    }, [navigationPhase, navConfig, isNavigating, isLoading, error]);

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

    // Handle passenger pickup confirmation
    const handlePassengerPickup = useCallback(() => {
        if (pickupTimerInterval.current) {
            clearInterval(pickupTimerInterval.current);
        }
        setNavigationPhase('picking-up');
        speakInstruction('Passenger picked up. Starting trip to destination.');

        // Simulate loading passenger and then start navigation to destination
        setTimeout(() => {
            setNavigationPhase('to-destination');
            setPickupTimer(0);
        }, 2000);
    }, [speakInstruction]);

    // Handle trip completion
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

    // Format timer
    const formatTimer = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

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
                <View className="flex-1 justify-center items-center">
                    <View className="bg-white rounded-2xl p-8 mx-8 items-center shadow-lg">
                        <ActivityIndicator size="large" color="#4285F4" />
                        <Text className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                            {locationLoading ? 'Getting Your Location...' : 'Starting Navigation...'}
                        </Text>
                        <Text className="text-base text-gray-600 text-center leading-6">
                            {locationLoading
                                ? 'Please wait while we locate you'
                                : `Calculating route to ${navConfig?.destinationName}`
                            }
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // Show error state
    if (error && !route) {
        return (
            <SafeAreaView className="flex-1 bg-gray-100">
                <Stack.Screen options={{ headerShown: false }} />
                <View className="flex-1 justify-center items-center">
                    <View className="bg-white rounded-2xl p-8 mx-8 items-center shadow-lg">
                        <Ionicons name="warning" size={48} color="#EA4335" />
                        <Text className="text-xl font-semibold text-gray-900 mt-4 mb-2 text-center">
                            Navigation Error
                        </Text>
                        <Text className="text-base text-gray-600 text-center leading-6 mb-6">
                            {error.message}
                        </Text>
                        <TouchableOpacity
                            onPress={retryNavigation}
                            className="bg-blue-500 rounded-xl px-6 py-3 mb-3"
                        >
                            <Text className="text-white font-semibold">
                                Try Again
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="bg-gray-100 rounded-xl px-6 py-3"
                        >
                            <Text className="text-gray-600 font-medium">
                                Go Back
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // Show pickup waiting screen when at pickup location
    if (navigationPhase === 'at-pickup') {
        return (
            <SafeAreaView className="flex-1 bg-blue-500">
                <Stack.Screen options={{ headerShown: false }} />
                <View className="flex-1">
                    {/* Map in background */}
                    <View className="absolute inset-0">
                        <NavigationMapboxMap
                            ref={mapRef}
                            driverLocation={currentPosition || driverLocation}
                            pickup={{
                                latitude: rideData.pickupLat,
                                longitude: rideData.pickupLng
                            }}
                            destination={{
                                latitude: rideData.destLat,
                                longitude: rideData.destLng
                            }}
                            geofenceAreas={[
                                {
                                    center: [rideData.pickupLng, rideData.pickupLat],
                                    radius: GEOFENCE_RADIUS_METERS,
                                    color: '#4285F4',
                                    opacity: 0.3
                                }
                            ]}
                            bearing={currentHeading}
                            pitch={0}
                            zoomLevel={17}
                            followMode="follow"
                            showUserLocation={true}
                            enableScrolling={true}
                            mapStyle="mapbox://styles/mapbox/navigation-day-v1"
                        />
                    </View>

                    {/* Overlay content */}
                    <View className="flex-1 justify-between pt-16">
                        {/* Header */}
                        <View className="bg-white mx-5 rounded-2xl p-5 shadow-lg">
                            <View className="flex-row items-center mb-4">
                                <View className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center">
                                    <Ionicons name="time" size={30} color="#4285F4" />
                                </View>
                                <View className="ml-4 flex-1">
                                    <Text className="text-sm text-gray-600 mb-1">
                                        Waiting at pickup
                                    </Text>
                                    <Text className="text-2xl font-bold text-gray-900">
                                        {formatTimer(pickupTimer)}
                                    </Text>
                                </View>
                            </View>

                            <View className="border-t border-gray-200 pt-4">
                                <Text className="text-lg font-semibold text-gray-900 mb-2">
                                    {rideData.passengerName}
                                </Text>
                                <View className="flex-row items-center mb-2">
                                    <Ionicons name="location" size={16} color="#666" />
                                    <Text className="text-sm text-gray-600 ml-2 flex-1" numberOfLines={2}>
                                        {rideData.pickupAddress}
                                    </Text>
                                </View>
                                <View className="flex-row items-center">
                                    <Ionicons name="cash-outline" size={16} color="#666" />
                                    <Text className="text-sm text-gray-600 ml-2">
                                        Est. fare: {rideData.estimatedPrice}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Bottom actions */}
                        <View className="bg-white px-5 pt-5 pb-10 rounded-t-3xl shadow-lg">
                            <TouchableOpacity
                                onPress={handlePassengerPickup}
                                className="bg-green-600 rounded-xl py-5 items-center mb-3"
                            >
                                <Text className="text-white text-lg font-semibold">
                                    Passenger Picked Up
                                </Text>
                            </TouchableOpacity>

                            <View className="flex-row gap-3">
                                <TouchableOpacity className="flex-1 bg-gray-100 rounded-xl py-4 items-center flex-row justify-center">
                                    <Ionicons name="call" size={20} color="#4285F4" />
                                    <Text className="text-blue-500 text-base font-semibold ml-2">
                                        Call
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity className="flex-1 bg-gray-100 rounded-xl py-4 items-center flex-row justify-center">
                                    <Ionicons name="chatbubble" size={20} color="#4285F4" />
                                    <Text className="text-blue-500 text-base font-semibold ml-2">
                                        Message
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={handleBackPress}
                                className="mt-3 py-3 items-center"
                            >
                                <Text className="text-red-500 text-base font-medium">
                                    Cancel Trip
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // Show loading screen when picking up passenger
    if (navigationPhase === 'picking-up') {
        return (
            <SafeAreaView className="flex-1 bg-green-600">
                <Stack.Screen options={{ headerShown: false }} />
                <View className="flex-1 justify-center items-center">
                    <View className="bg-white rounded-2xl p-8 mx-8 items-center shadow-lg">
                        <View className="w-20 h-20 rounded-full bg-green-50 items-center justify-center mb-5">
                            <Ionicons name="car" size={40} color="#34A853" />
                        </View>
                        <Text className="text-2xl font-bold text-gray-900 mb-2">
                            Starting Trip
                        </Text>
                        <Text className="text-base text-gray-600 text-center leading-6">
                            Navigating to {rideData.destAddress}
                        </Text>
                        <ActivityIndicator size="large" color="#34A853" className="mt-5" />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // Show arrival at destination screen
    if (navigationPhase === 'at-destination') {
        return (
            <SafeAreaView className="flex-1 bg-green-600">
                <Stack.Screen options={{ headerShown: false }} />
                <View className="flex-1">
                    {/* Map in background */}
                    <View className="absolute inset-0">
                        <NavigationMapboxMap
                            ref={mapRef}
                            driverLocation={currentPosition || driverLocation}
                            destination={{
                                latitude: rideData.destLat,
                                longitude: rideData.destLng
                            }}
                            geofenceAreas={[
                                {
                                    center: [rideData.destLng, rideData.destLat],
                                    radius: GEOFENCE_RADIUS_METERS,
                                    color: '#34A853',
                                    opacity: 0.3
                                }
                            ]}
                            bearing={currentHeading}
                            pitch={0}
                            zoomLevel={17}
                            followMode="follow"
                            showUserLocation={true}
                            enableScrolling={true}
                            mapStyle="mapbox://styles/mapbox/navigation-day-v1"
                        />
                    </View>

                    {/* Overlay content */}
                    <View className="flex-1 justify-end">
                        <View className="bg-white px-5 pt-6 pb-10 rounded-t-3xl shadow-lg">
                            <View className="items-center mb-6">
                                <View className="w-20 h-20 rounded-full bg-green-50 items-center justify-center mb-4">
                                    <Ionicons name="checkmark-circle" size={50} color="#34A853" />
                                </View>
                                <Text className="text-2xl font-bold text-gray-900 mb-2">
                                    Arrived at Destination
                                </Text>
                                <Text className="text-base text-gray-600 text-center">
                                    {rideData.destAddress}
                                </Text>
                            </View>

                            <View className="bg-gray-100 rounded-xl p-4 mb-5">
                                <Text className="text-sm text-gray-600 mb-2">
                                    Trip Summary
                                </Text>
                                <View className="flex-row justify-between mb-2">
                                    <Text className="text-base text-gray-900">
                                        Passenger
                                    </Text>
                                    <Text className="text-base font-semibold text-gray-900">
                                        {rideData.passengerName}
                                    </Text>
                                </View>
                                <View className="flex-row justify-between">
                                    <Text className="text-base text-gray-900">
                                        Fare
                                    </Text>
                                    <Text className="text-base font-semibold text-green-600">
                                        {rideData.estimatedPrice}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handleTripComplete}
                                className="bg-green-600 rounded-xl py-5 items-center"
                            >
                                <Text className="text-white text-lg font-semibold">
                                    Complete Trip
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
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
            <View className={`absolute top-16 left-5 right-5 ${navigationPhase === 'to-pickup' ? 'bg-blue-500' : 'bg-green-600'} rounded-xl p-3 shadow-lg flex-row items-center justify-between`}>
                <View className="flex-row items-center flex-1">
                    <Ionicons
                        name={navigationPhase === 'to-pickup' ? 'person' : 'location'}
                        size={24}
                        color="white"
                    />
                    <View className="ml-3 flex-1">
                        <Text className="text-white text-sm font-semibold">
                            {navigationPhase === 'to-pickup' ? 'Going to Pickup' : 'Going to Destination'}
                        </Text>
                        <Text className="text-white/90 text-xs mt-1" numberOfLines={1}>
                            {navigationPhase === 'to-pickup' ? rideData.pickupAddress : rideData.destAddress}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={handleBackPress}
                    className="bg-black/20 rounded-full p-2"
                >
                    <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
            </View>

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
                    // Fix: Use normalizeManeuverType to ensure proper type
                    maneuver={normalizeManeuverType(currentInstruction.maneuver?.type)}
                    isVisible={showInstructions && isNavigating}
                />
            )}

            {/* Passenger Info Card (shown during pickup phase) */}
            {navigationPhase === 'to-pickup' && (
                <View className="absolute bottom-52 left-5 right-5 bg-white rounded-xl p-4 shadow-sm">
                    <Text className="text-sm text-gray-600 mb-1">
                        Picking up
                    </Text>
                    <Text className="text-base font-semibold text-gray-900">
                        {rideData.passengerName}
                    </Text>
                    <View className="flex-row items-center mt-2">
                        <Ionicons name="cash-outline" size={16} color="#666" />
                        <Text className="text-sm text-gray-600 ml-2">
                            Estimated: {rideData.estimatedPrice || 'N/A'}
                        </Text>
                    </View>
                </View>
            )}

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