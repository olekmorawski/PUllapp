import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, SafeAreaView, Dimensions, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Location from 'expo-location';
import { useOSRMNavigation } from '@/hooks/useOSRMNavigation';
import { RideNavigationData } from '@/hooks/useEnhancedDriverNavigation';
import NavigationMapboxMap, { NavigationMapboxMapRef } from '@/components/NavigationMapboxMap';
import {
    SpeedIndicator,
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

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
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
    const geofenceCheckInterval = useRef<NodeJS.Timeout | null>(null);
    const [isInPickupGeofence, setIsInPickupGeofence] = useState(false);
    const [isInDestinationGeofence, setIsInDestinationGeofence] = useState(false);
    const [pickupTimer, setPickupTimer] = useState(0);
    const pickupTimerInterval = useRef<NodeJS.Timeout | null>(null);
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
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{
                        backgroundColor: 'white',
                        borderRadius: 20,
                        padding: 32,
                        marginHorizontal: 32,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 8
                    }}>
                        <Ionicons name="warning" size={48} color="#EA4335" />
                        <Text style={{
                            fontSize: 20,
                            fontWeight: '600',
                            color: '#1a1a1a',
                            marginTop: 16,
                            marginBottom: 8,
                            textAlign: 'center'
                        }}>
                            Invalid Navigation Data
                        </Text>
                        <Text style={{
                            fontSize: 16,
                            color: '#666',
                            textAlign: 'center',
                            lineHeight: 22,
                            marginBottom: 24
                        }}>
                            The ride information is missing or invalid. Please try again.
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.replace('/(app)')}
                            style={{
                                backgroundColor: '#4285F4',
                                borderRadius: 12,
                                paddingHorizontal: 24,
                                paddingVertical: 12
                            }}
                        >
                            <Text style={{ color: 'white', fontWeight: '600' }}>
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

    // Geofence checking logic
    useEffect(() => {
        if (!driverLocation || !rideData) return;

        // Check geofences periodically
        const checkGeofences = () => {
            // Check pickup geofence (only relevant during 'to-pickup' phase)
            if (navigationPhase === 'to-pickup') {
                const distanceToPickup = calculateDistance(
                    driverLocation.latitude,
                    driverLocation.longitude,
                    rideData.pickupLat,
                    rideData.pickupLng
                );

                const wasInPickupGeofence = isInPickupGeofence;
                const nowInPickupGeofence = distanceToPickup <= GEOFENCE_RADIUS_METERS;

                setIsInPickupGeofence(nowInPickupGeofence);

                // Entered pickup geofence
                if (!wasInPickupGeofence && nowInPickupGeofence) {
                    console.log('📍 Entered pickup geofence');
                    setNavigationPhase('at-pickup');
                    speakInstruction('You have arrived at the pickup location. Waiting for passenger.');

                    // Start pickup timer
                    let seconds = 0;
                    pickupTimerInterval.current = setInterval(() => {
                        seconds++;
                        setPickupTimer(seconds);
                    }, 1000);
                }
            }

            // Check destination geofence (only relevant during 'to-destination' phase)
            if (navigationPhase === 'to-destination') {
                const distanceToDestination = calculateDistance(
                    driverLocation.latitude,
                    driverLocation.longitude,
                    rideData.destLat,
                    rideData.destLng
                );

                const wasInDestinationGeofence = isInDestinationGeofence;
                const nowInDestinationGeofence = distanceToDestination <= GEOFENCE_RADIUS_METERS;

                setIsInDestinationGeofence(nowInDestinationGeofence);

                // Entered destination geofence
                if (!wasInDestinationGeofence && nowInDestinationGeofence) {
                    console.log('📍 Entered destination geofence');
                    setNavigationPhase('at-destination');
                    speakInstruction('You have arrived at the destination.');
                }
            }
        };

        // Set up periodic geofence checking
        geofenceCheckInterval.current = setInterval(checkGeofences, GEOFENCE_CHECK_INTERVAL);

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
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{
                        backgroundColor: 'white',
                        borderRadius: 20,
                        padding: 32,
                        marginHorizontal: 32,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 8
                    }}>
                        <ActivityIndicator size="large" color="#4285F4" />
                        <Text style={{
                            fontSize: 20,
                            fontWeight: '600',
                            color: '#1a1a1a',
                            marginTop: 16,
                            marginBottom: 8
                        }}>
                            {locationLoading ? 'Getting Your Location...' : 'Starting Navigation...'}
                        </Text>
                        <Text style={{
                            fontSize: 16,
                            color: '#666',
                            textAlign: 'center',
                            lineHeight: 22
                        }}>
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
            <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{
                        backgroundColor: 'white',
                        borderRadius: 20,
                        padding: 32,
                        marginHorizontal: 32,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 8
                    }}>
                        <Ionicons name="warning" size={48} color="#EA4335" />
                        <Text style={{
                            fontSize: 20,
                            fontWeight: '600',
                            color: '#1a1a1a',
                            marginTop: 16,
                            marginBottom: 8,
                            textAlign: 'center'
                        }}>
                            Navigation Error
                        </Text>
                        <Text style={{
                            fontSize: 16,
                            color: '#666',
                            textAlign: 'center',
                            lineHeight: 22,
                            marginBottom: 24
                        }}>
                            {error.message}
                        </Text>
                        <TouchableOpacity
                            onPress={retryNavigation}
                            style={{
                                backgroundColor: '#4285F4',
                                borderRadius: 12,
                                paddingHorizontal: 24,
                                paddingVertical: 12,
                                marginBottom: 12
                            }}
                        >
                            <Text style={{ color: 'white', fontWeight: '600' }}>
                                Try Again
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{
                                backgroundColor: '#f5f5f5',
                                borderRadius: 12,
                                paddingHorizontal: 24,
                                paddingVertical: 12
                            }}
                        >
                            <Text style={{ color: '#666', fontWeight: '500' }}>
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
            <SafeAreaView style={{ flex: 1, backgroundColor: '#4285F4' }}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={{ flex: 1 }}>
                    {/* Map in background */}
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
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
                    <View style={{
                        flex: 1,
                        justifyContent: 'space-between',
                        paddingTop: 60
                    }}>
                        {/* Header */}
                        <View style={{
                            backgroundColor: 'white',
                            marginHorizontal: 20,
                            borderRadius: 16,
                            padding: 20,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.15,
                            shadowRadius: 8,
                            elevation: 6
                        }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                                <View style={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: 30,
                                    backgroundColor: '#E8F0FE',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Ionicons name="time" size={30} color="#4285F4" />
                                </View>
                                <View style={{ marginLeft: 16, flex: 1 }}>
                                    <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                                        Waiting at pickup
                                    </Text>
                                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#1a1a1a' }}>
                                        {formatTimer(pickupTimer)}
                                    </Text>
                                </View>
                            </View>

                            <View style={{
                                borderTopWidth: 1,
                                borderTopColor: '#f0f0f0',
                                paddingTop: 16
                            }}>
                                <Text style={{ fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 }}>
                                    {rideData.passengerName}
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                                    <Ionicons name="location" size={16} color="#666" />
                                    <Text style={{ fontSize: 14, color: '#666', marginLeft: 8, flex: 1 }} numberOfLines={2}>
                                        {rideData.pickupAddress}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="cash-outline" size={16} color="#666" />
                                    <Text style={{ fontSize: 14, color: '#666', marginLeft: 8 }}>
                                        Est. fare: {rideData.estimatedPrice}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Bottom actions */}
                        <View style={{
                            backgroundColor: 'white',
                            paddingHorizontal: 20,
                            paddingTop: 20,
                            paddingBottom: 40,
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 10
                        }}>
                            <TouchableOpacity
                                onPress={handlePassengerPickup}
                                style={{
                                    backgroundColor: '#34A853',
                                    borderRadius: 12,
                                    paddingVertical: 18,
                                    alignItems: 'center',
                                    marginBottom: 12
                                }}
                            >
                                <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
                                    Passenger Picked Up
                                </Text>
                            </TouchableOpacity>

                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#f5f5f5',
                                        borderRadius: 12,
                                        paddingVertical: 16,
                                        alignItems: 'center',
                                        flexDirection: 'row',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Ionicons name="call" size={20} color="#4285F4" />
                                    <Text style={{ color: '#4285F4', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                                        Call
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#f5f5f5',
                                        borderRadius: 12,
                                        paddingVertical: 16,
                                        alignItems: 'center',
                                        flexDirection: 'row',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Ionicons name="chatbubble" size={20} color="#4285F4" />
                                    <Text style={{ color: '#4285F4', fontSize: 16, fontWeight: '600', marginLeft: 8 }}>
                                        Message
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                onPress={handleBackPress}
                                style={{
                                    marginTop: 12,
                                    paddingVertical: 12,
                                    alignItems: 'center'
                                }}
                            >
                                <Text style={{ color: '#EA4335', fontSize: 16, fontWeight: '500' }}>
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
            <SafeAreaView style={{ flex: 1, backgroundColor: '#34A853' }}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <View style={{
                        backgroundColor: 'white',
                        borderRadius: 20,
                        padding: 32,
                        marginHorizontal: 32,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 12,
                        elevation: 8
                    }}>
                        <View style={{
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            backgroundColor: '#E6F4EA',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 20
                        }}>
                            <Ionicons name="car" size={40} color="#34A853" />
                        </View>
                        <Text style={{
                            fontSize: 24,
                            fontWeight: '700',
                            color: '#1a1a1a',
                            marginBottom: 8
                        }}>
                            Starting Trip
                        </Text>
                        <Text style={{
                            fontSize: 16,
                            color: '#666',
                            textAlign: 'center',
                            lineHeight: 22
                        }}>
                            Navigating to {rideData.destAddress}
                        </Text>
                        <ActivityIndicator size="large" color="#34A853" style={{ marginTop: 20 }} />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // Show arrival at destination screen
    if (navigationPhase === 'at-destination') {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: '#34A853' }}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={{ flex: 1 }}>
                    {/* Map in background */}
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
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
                    <View style={{
                        flex: 1,
                        justifyContent: 'flex-end'
                    }}>
                        <View style={{
                            backgroundColor: 'white',
                            paddingHorizontal: 20,
                            paddingTop: 24,
                            paddingBottom: 40,
                            borderTopLeftRadius: 24,
                            borderTopRightRadius: 24,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: -4 },
                            shadowOpacity: 0.1,
                            shadowRadius: 8,
                            elevation: 10
                        }}>
                            <View style={{ alignItems: 'center', marginBottom: 24 }}>
                                <View style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 40,
                                    backgroundColor: '#E6F4EA',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: 16
                                }}>
                                    <Ionicons name="checkmark-circle" size={50} color="#34A853" />
                                </View>
                                <Text style={{ fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 }}>
                                    Arrived at Destination
                                </Text>
                                <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
                                    {rideData.destAddress}
                                </Text>
                            </View>

                            <View style={{
                                backgroundColor: '#f5f5f5',
                                borderRadius: 12,
                                padding: 16,
                                marginBottom: 20
                            }}>
                                <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                                    Trip Summary
                                </Text>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{ fontSize: 16, color: '#1a1a1a' }}>
                                        Passenger
                                    </Text>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1a1a1a' }}>
                                        {rideData.passengerName}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: 16, color: '#1a1a1a' }}>
                                        Fare
                                    </Text>
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#34A853' }}>
                                        {rideData.estimatedPrice}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                onPress={handleTripComplete}
                                style={{
                                    backgroundColor: '#34A853',
                                    borderRadius: 12,
                                    paddingVertical: 18,
                                    alignItems: 'center'
                                }}
                            >
                                <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
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
        <View style={{ flex: 1 }}>
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
            <View style={{
                position: 'absolute',
                top: 60,
                left: 20,
                right: 20,
                backgroundColor: navigationPhase === 'to-pickup' ? '#4285F4' : '#34A853',
                borderRadius: 12,
                padding: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons
                        name={navigationPhase === 'to-pickup' ? 'person' : 'location'}
                        size={24}
                        color="white"
                    />
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={{ color: 'white', fontSize: 14, fontWeight: '600' }}>
                            {navigationPhase === 'to-pickup' ? 'Going to Pickup' : 'Going to Destination'}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                            {navigationPhase === 'to-pickup' ? rideData.pickupAddress : rideData.destAddress}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={handleBackPress}
                    style={{
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        borderRadius: 20,
                        padding: 8
                    }}
                >
                    <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
            </View>

            {/* Speed Indicator */}
            {currentPosition && isNavigating && (
                <SpeedIndicator
                    speed={currentPosition.speed ? currentPosition.speed * 3.6 : 0} // Convert m/s to km/h
                    speedLimit={50}
                    isVisible={isNavigating && (currentPosition.speed || 0) > 0.5}
                />
            )}

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
                    maneuver={currentInstruction.maneuver?.type || 'straight'}
                    isVisible={showInstructions && isNavigating}
                />
            )}

            {/* Passenger Info Card (shown during pickup phase) */}
            {navigationPhase === 'to-pickup' && (
                <View style={{
                    position: 'absolute',
                    bottom: 200,
                    left: 20,
                    right: 20,
                    backgroundColor: 'white',
                    borderRadius: 12,
                    padding: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3
                }}>
                    <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
                        Picking up
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1a1a1a' }}>
                        {rideData.passengerName}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                        <Ionicons name="cash-outline" size={16} color="#666" />
                        <Text style={{ fontSize: 14, color: '#666', marginLeft: 6 }}>
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