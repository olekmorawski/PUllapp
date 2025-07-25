// app/(app)/driver-navigation.tsx - Fixed with Voice Guidance and Maneuver Arrows
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, SafeAreaView, Dimensions, Animated, ViewStyle, Switch } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useOSRMNavigation } from '@/hooks/useOSRMNavigation';
import { RideNavigationData } from '@/hooks/useEnhancedDriverNavigation';
import NavigationMapboxMap, { NavigationMapboxMapRef } from '@/components/NavigationMapboxMap';
import {
    NavigationCompass,
    SpeedIndicator,
    EtaCard,
    NavigationInstruction,
    NavigationControls,
    NavigationStatusBar
} from '@/components/NavigationUIComponents';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

interface NavigationInfoPanelProps {
    currentInstruction: any;
    nextInstruction: any;
    progress: any;
    rideData: RideNavigationData;
    onCancel: () => void;
    formatDistance: (meters: number) => string;
    formatDuration: (seconds: number) => string;
    isMuted: boolean;
    onMuteToggle: () => void;
}

const NavigationInfoPanel: React.FC<NavigationInfoPanelProps> = ({
                                                                     currentInstruction,
                                                                     nextInstruction,
                                                                     progress,
                                                                     rideData,
                                                                     onCancel,
                                                                     formatDistance,
                                                                     formatDuration,
                                                                     isMuted,
                                                                     onMuteToggle
                                                                 }) => {
    const slideAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [slideAnim]);

    return (
        <Animated.View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: [{
                translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 0],
                })
            }]
        }}>
            <SafeAreaView>
                <View style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    marginHorizontal: 16,
                    marginTop: 8,
                    borderRadius: 16,
                    padding: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 5,
                }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <View style={{ flex: 1 }}>
                            <Text style={{
                                fontSize: 18,
                                fontWeight: '700',
                                color: '#1a1a1a',
                                marginBottom: 4
                            }}>
                                Navigation Active
                            </Text>
                            <Text style={{
                                fontSize: 14,
                                color: '#666',
                                lineHeight: 20
                            }} numberOfLines={2}>
                                {currentInstruction?.text || `Navigating to ${rideData.destAddress}`}
                            </Text>
                        </View>

                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginRight: 12
                        }}>
                            <Ionicons
                                name={isMuted ? "volume-mute" : "volume-high"}
                                size={20}
                                color="#666"
                                style={{ marginRight: 8 }}
                            />
                            <Switch
                                value={!isMuted}
                                onValueChange={() => onMuteToggle()}
                                trackColor={{ false: "#767577", true: "#4285F4" }}
                                thumbColor={!isMuted ? "#fff" : "#f4f3f4"}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={onCancel}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: '#f5f5f5',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <Ionicons name="close" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {progress && (
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: 12,
                            paddingTop: 12,
                            borderTopWidth: 1,
                            borderTopColor: '#f0f0f0'
                        }}>
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                flex: 1
                            }}>
                                <Ionicons name="time" size={16} color="#4285F4" />
                                <Text style={{
                                    fontSize: 16,
                                    fontWeight: '600',
                                    marginLeft: 6,
                                    color: '#4285F4'
                                }}>
                                    {formatDuration(progress.durationRemaining || 0)}
                                </Text>
                            </View>

                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                flex: 1
                            }}>
                                <Ionicons name="navigate" size={16} color="#34A853" />
                                <Text style={{
                                    fontSize: 16,
                                    fontWeight: '600',
                                    marginLeft: 6,
                                    color: '#34A853'
                                }}>
                                    {formatDistance(progress.distanceRemaining || 0)}
                                </Text>
                            </View>

                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                flex: 1,
                                justifyContent: 'flex-end'
                            }}>
                                <Ionicons name="cash" size={16} color="#FBBC04" />
                                <Text style={{
                                    fontSize: 16,
                                    fontWeight: '600',
                                    marginLeft: 6,
                                    color: '#FBBC04'
                                }}>
                                    {rideData.estimatedPrice}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </SafeAreaView>
        </Animated.View>
    );
};

export default function OSRMDriverNavigationScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const mapRef = useRef<NavigationMapboxMapRef>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [showInstructions, setShowInstructions] = useState(true);
    const lastSpokenInstructionRef = useRef<string>('');
    const [maneuverPoints, setManeuverPoints] = useState<Array<{
        coordinate: [number, number];
        type: string;
        modifier?: string;
        instruction: string;
    }>>([]);

    console.log('🚗 OSRM Driver Navigation Screen loaded with params:', params);

    // Validate and extract ride data from params
    const rideData = validateParams(params);

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
            // Stop any ongoing speech
            await Speech.stop();

            // Speak the new instruction
            await Speech.speak(text, VOICE_OPTIONS);
            lastSpokenInstructionRef.current = text;
        } catch (error) {
            console.warn('Speech error:', error);
        }
    }, [isMuted]);

    // Use OSRM navigation hook
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
        origin: {
            latitude: rideData.pickupLat,
            longitude: rideData.pickupLng
        },
        destination: {
            latitude: rideData.destLat,
            longitude: rideData.destLng
        },
        onDestinationReached: () => {
            speakInstruction('You have arrived at your destination');
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

    // Auto-start navigation when component mounts
    useEffect(() => {
        if (!isNavigating && !isLoading && !error) {
            console.log('🚀 Auto-starting navigation...');
            startNavigation();

            // Initial voice announcement
            setTimeout(() => {
                speakInstruction(`Starting navigation to ${rideData.destAddress}`);
            }, 1000);
        }
    }, []); // Empty dependency array - only run once

    // Update map camera when position changes
    useEffect(() => {
        if (currentPosition && mapRef.current) {
            console.log('📍 Updating camera to follow driver at:', currentPosition);

            // Get camera config from OSRM hook
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
            'Are you sure you want to cancel this navigation?',
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
    if (isLoading) {
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
                        <Ionicons name="navigate" size={48} color="#4285F4" />
                        <Text style={{
                            fontSize: 20,
                            fontWeight: '600',
                            color: '#1a1a1a',
                            marginTop: 16,
                            marginBottom: 8
                        }}>
                            Starting Navigation...
                        </Text>
                        <Text style={{
                            fontSize: 16,
                            color: '#666',
                            textAlign: 'center',
                            lineHeight: 22
                        }}>
                            Calculating the best route to your destination
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // Show error state
    if (error) {
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
                driverLocation={currentPosition}
                destination={{
                    latitude: rideData.destLat,
                    longitude: rideData.destLng
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

            {/* Navigation Status Bar */}
            <NavigationStatusBar
                connectionStatus="connected"
                gpsAccuracy="high"
                batteryLevel={85}
                isVisible={true}
            />

            {/* Navigation Compass */}
            <NavigationCompass
                bearing={currentHeading}
                isVisible={isNavigating}
                onPress={handleRecenter}
            />

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

            {/* Navigation Controls */}
            <NavigationControls
                onRecenter={handleRecenter}
                onVolumeToggle={handleVolumeToggle}
                onRouteOptions={() => {
                    Alert.alert(
                        'Route Options',
                        'Navigation in progress',
                        [{ text: 'OK' }]
                    );
                }}
                isMuted={isMuted}
                isVisible={isNavigating}
            />

            {/* Top info panel with mute control */}
            <NavigationInfoPanel
                currentInstruction={currentInstruction}
                nextInstruction={nextInstruction}
                progress={progress}
                rideData={rideData}
                onCancel={handleBackPress}
                formatDistance={formatDistance}
                formatDuration={formatDuration}
                isMuted={isMuted}
                onMuteToggle={handleVolumeToggle}
            />

            {/* Center crosshair indicator */}
            <View style={{
                position: 'absolute',
                top: SCREEN_HEIGHT / 2 - 12,
                left: SCREEN_WIDTH / 2 - 12,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: 'rgba(66, 133, 244, 0.9)',
                borderWidth: 3,
                borderColor: 'white',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 5,
                pointerEvents: 'none',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <View style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'white'
                }} />
            </View>
        </View>
    );
}