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

// Navigation phases
type NavigationPhase = 'to-pickup' | 'to-destination' | 'completed';

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

export default function TwoPhaseDriverNavigationScreen() {
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
    const [hasArrivedAtPickup, setHasArrivedAtPickup] = useState(false);
    const [maneuverPoints, setManeuverPoints] = useState<Array<{
        coordinate: [number, number];
        type: string;
        modifier?: string;
        instruction: string;
    }>>([]);

    console.log('🚗 Two-Phase Driver Navigation Screen loaded with params:', params);

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

    // Determine current navigation origin and destination based on phase
    const getCurrentNavigationConfig = () => {
        if (navigationPhase === 'to-pickup' && driverLocation) {
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
        } else if (navigationPhase === 'to-destination') {
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
        enabled: !!navConfig && !!driverLocation && !locationLoading,
        onDestinationReached: () => {
            if (navigationPhase === 'to-pickup') {
                // Arrived at pickup
                speakInstruction('You have arrived at the pickup location. Please wait for passenger confirmation.');
                setHasArrivedAtPickup(true);
                stopNavigation();

                Alert.alert(
                    'Arrived at Pickup! 📍',
                    `You've arrived at ${rideData.pickupAddress}. Passenger: ${rideData.passengerName}`,
                    [
                        {
                            text: 'Start Trip to Destination',
                            onPress: () => {
                                setNavigationPhase('to-destination');
                                setHasArrivedAtPickup(false);
                                // Navigation will auto-restart with new destination
                            }
                        }
                    ]
                );
            } else if (navigationPhase === 'to-destination') {
                // Arrived at destination
                speakInstruction('You have arrived at your destination. Trip completed!');
                setNavigationPhase('completed');

                Alert.alert(
                    'Destination Reached! 🎉',
                    `You've arrived at ${rideData.destAddress}`,
                    [
                        {
                            text: 'Complete Trip',
                            onPress: () => router.replace('/(app)')
                        }
                    ]
                );
            }
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
        if (!isNavigating && !isLoading && !error && navConfig && !hasArrivedAtPickup && navigationPhase !== 'completed') {
            console.log('🚀 Auto-starting navigation for phase:', navigationPhase);
            startNavigation();

            // Initial voice announcement
            setTimeout(() => {
                if (navigationPhase === 'to-pickup') {
                    speakInstruction(`Starting navigation to pickup location at ${rideData.pickupAddress}`);
                } else {
                    speakInstruction(`Starting navigation to destination at ${rideData.destAddress}`);
                }
            }, 1000);
        }
    }, [navigationPhase, navConfig, isNavigating, isLoading, error, hasArrivedAtPickup]);

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
                                : navigationPhase === 'to-pickup'
                                    ? `Calculating route to pickup at ${rideData.pickupAddress}`
                                    : `Calculating route to destination at ${rideData.destAddress}`
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

    // Get route GeoJSON for display
    const routeGeoJSON = getRouteGeoJSON();

    return (
        <View style={{ flex: 1 }}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Navigation Map with Route and Maneuver Arrows */}
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
            {currentPosition && (
                <SpeedIndicator
                    speed={currentPosition.speed ? currentPosition.speed * 3.6 : 0} // Convert m/s to km/h
                    speedLimit={50}
                    isVisible={isNavigating && (currentPosition.speed || 0) > 0.5}
                />
            )}

            {/* ETA Card */}
            <EtaCard
                arrivalTime={calculateETA()}
                timeRemaining={formatDuration(progress?.durationRemaining || 0)}
                distance={formatDistance(progress?.distanceRemaining || 0)}
                isVisible={isNavigating && progress !== null}
            />

            {/* Navigation Instructions */}
            {currentInstruction && (
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
            <NavigationControls
                onRecenter={handleRecenter}
                onVolumeToggle={handleVolumeToggle}
                onRouteOptions={() => {
                    Alert.alert(
                        'Navigation Phase',
                        `Currently: ${navigationPhase === 'to-pickup' ? 'Going to pickup location' : 'Going to destination'}`,
                        [{ text: 'OK' }]
                    );
                }}
                isMuted={isMuted}
                isVisible={isNavigating}
            />
        </View>
    );
}