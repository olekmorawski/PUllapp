// app/(app)/driver-navigation.tsx - Fixed infinite loop and improved error handling
import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, SafeAreaView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Mapbox from '@rnmapbox/maps';
import { MapboxNavigationMap } from '@/components/DriverNavigation';
import { useOSRMNavigation } from '@/hooks/useOSRMNavigation';
import { NavigationCoordinates, NavigationInstruction } from '@/services/OSRMNavigationService';

// Fixed interface with index signature for dynamic access
interface RideParams {
    rideId: string;
    pickupLat: string;
    pickupLng: string;
    pickupAddress: string;
    destLat: string;
    destLng: string;
    destAddress: string;
    passengerName: string;
    estimatedPrice: string;
    // Add index signature to allow dynamic string access
    [key: string]: string | undefined;
}

interface ParsedRideData {
    id: string;
    pickup: NavigationCoordinates;
    destination: NavigationCoordinates;
    pickupAddress: string;
    destAddress: string;
    passengerName: string;
    estimatedPrice: string;
}

export default function DriverNavigationScreen(): React.JSX.Element | null {
    const router = useRouter();
    const rawParams = useLocalSearchParams();
    const mapRef = useRef<Mapbox.MapView>(null);
    const cameraRef = useRef<Mapbox.Camera>(null);
    const hasStartedNavigation = useRef<boolean>(false);

    // Type assertion to our expected params structure
    const params = rawParams as unknown as RideParams;

    console.log('🚗 Driver Navigation Screen loaded with params:', params);

    // Validate required params with proper typing
    const requiredParams: (keyof RideParams)[] = ['rideId', 'pickupLat', 'pickupLng', 'destLat', 'destLng'];
    const missingParams = requiredParams.filter(param => {
        const value = params[param];
        return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (missingParams.length > 0) {
        console.error('❌ Missing required navigation params:', missingParams);
        Alert.alert(
            'Navigation Error',
            'Missing ride information. Returning to driver dashboard.',
            [{ text: 'OK', onPress: () => router.replace('/(app)') }]
        );
        return null;
    }

    // Parse and validate coordinates with better error handling
    const parseCoordinate = (value: string | string[] | undefined, name: string): number => {
        if (!value) {
            throw new Error(`Missing ${name}`);
        }

        const stringValue = Array.isArray(value) ? value[0] : value;

        if (!stringValue || stringValue.trim() === '') {
            throw new Error(`Empty ${name}`);
        }

        const parsed = parseFloat(stringValue);
        if (isNaN(parsed)) {
            throw new Error(`Invalid ${name}: ${stringValue}`);
        }
        return parsed;
    };

    const isValidCoordinate = (lat: number, lng: number): boolean => {
        return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    };

    let rideData: ParsedRideData;

    try {
        const pickupLat = parseCoordinate(params.pickupLat, 'pickup latitude');
        const pickupLng = parseCoordinate(params.pickupLng, 'pickup longitude');
        const destLat = parseCoordinate(params.destLat, 'destination latitude');
        const destLng = parseCoordinate(params.destLng, 'destination longitude');

        if (!isValidCoordinate(pickupLat, pickupLng) || !isValidCoordinate(destLat, destLng)) {
            throw new Error('Coordinates out of valid range');
        }

        const getStringParam = (value: string | string[] | undefined, fallback: string): string => {
            if (!value) return fallback;
            return Array.isArray(value) ? (value[0] || fallback) : value;
        };

        rideData = {
            id: getStringParam(params.rideId, 'unknown'),
            pickup: { latitude: pickupLat, longitude: pickupLng },
            destination: { latitude: destLat, longitude: destLng },
            pickupAddress: getStringParam(params.pickupAddress, 'Pickup Location'),
            destAddress: getStringParam(params.destAddress, 'Destination'),
            passengerName: getStringParam(params.passengerName, 'Passenger'),
            estimatedPrice: getStringParam(params.estimatedPrice, '$0.00'),
        };
    } catch (error) {
        Alert.alert(
            'Invalid Coordinates',
            `The ride coordinates are invalid: ${error instanceof Error ? error.message : 'Unknown error'}`,
            [{ text: 'OK', onPress: () => router.back() }]
        );
        return null;
    }

    const {
        navigationPhase,
        isNavigationActive,
        currentDestination,
        driverLocation,
        handleArrivedAtPickup,
        handleArrivedAtDestination,
        isAtPickupPhase,
    } = useDriverNavigation({
        rideData: {
            ...rideData,
            pickupLat: rideData.pickup.latitude,
            pickupLng: rideData.pickup.longitude,
            destLat: rideData.destination.latitude,
            destLng: rideData.destination.longitude,
        },
        onNavigationComplete: () => router.replace('/(app)'),
    });

    const navigationOrigin = driverLocation ? {
        latitude: driverLocation.coords.latitude,
        longitude: driverLocation.coords.longitude
    } : rideData.pickup;

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
        retryCount,
        startNavigation,
        stopNavigation,
        retryNavigation,
        getMapboxCameraConfig,
        getRouteGeoJSON,
        formatDistance,
        formatDuration,
        getManeuverIcon,
    } = useOSRMNavigation({
        origin: navigationOrigin,
        destination: currentDestination,
        onDestinationReached: () => {
            if (isAtPickupPhase) {
                handleArrivedAtPickup();
            } else {
                handleArrivedAtDestination();
            }
        },
        onNavigationError: (error: Error) => {
            if (retryCount >= 2) {
                Alert.alert(
                    'Navigation Error',
                    `${error.message}. Please check your connection.`,
                    [
                        { text: 'Go Back', onPress: () => router.back() },
                        { text: 'Retry', onPress: retryNavigation }
                    ]
                );
            }
        },
    });

    useEffect(() => {
        if (isNavigationActive && !isNavigating && !isLoading && !error) {
            startNavigation();
        }
    }, [isNavigationActive, isNavigating, isLoading, error, startNavigation]);

    const handleStopNavigation = (): void => {
        Alert.alert(
            'Cancel Navigation',
            'Are you sure you want to cancel this trip? This may affect your driver rating.',
            [
                { text: 'Continue Trip', style: 'cancel' },
                {
                    text: 'Cancel Trip',
                    style: 'destructive',
                    onPress: () => {
                        stopNavigation();
                        router.replace('/(app)');
                    }
                }
            ]
        );
    };

    const handleRecenterCamera = (): void => {
        const cameraConfig = getMapboxCameraConfig();
        if (cameraRef.current && cameraConfig) {
            cameraRef.current.setCamera({
                centerCoordinate: cameraConfig.centerCoordinate,
                zoomLevel: cameraConfig.zoomLevel,
                pitch: cameraConfig.pitch,
                heading: cameraConfig.heading,
                animationMode: 'easeTo',
                animationDuration: 500,
            });
        }
    };

    const handleCallPassenger = (): void => {
        Alert.alert(
            'Call Passenger',
            `Do you want to call ${rideData.passengerName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Call', onPress: () => console.log('Calling passenger...') }
            ]
        );
    };

    const handleRetry = (): void => {
        hasStartedNavigation.current = false;
        retryNavigation();
    };

    // Error state with retry option
    if (error && retryCount >= 3) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={styles.errorContainer}>
                    <Ionicons name="warning-outline" size={48} color="#F59E0B" />
                    <Text style={styles.errorTitle}>Navigation Error</Text>
                    <Text style={styles.errorMessage}>
                        {error.message}
                        {'\n\n'}Please check your internet connection and try again.
                    </Text>
                    <View style={styles.errorButtonContainer}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={[styles.errorButton, styles.secondaryButton]}
                        >
                            <Text style={styles.secondaryButtonText}>Go Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleRetry}
                            style={styles.errorButton}
                        >
                            <Text style={styles.errorButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Mapbox Navigation Map */}
            <MapboxNavigationMap
                mapRef={mapRef}
                cameraRef={cameraRef}
                initialRegion={{
                    latitude: rideData.pickup.latitude,
                    longitude: rideData.pickup.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
                routeGeoJSON={getRouteGeoJSON()}
                currentPosition={currentPosition}
                currentHeading={currentHeading}
                destination={currentDestination}
                cameraConfig={getMapboxCameraConfig()}
                showUserLocation={true}
                style={styles.map}
            />

            {/* Loading overlay */}
            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <Text style={styles.loadingText}>
                        {retryCount > 0 ? `Retrying... (${retryCount}/3)` : 'Calculating route...'}
                    </Text>
                </View>
            )}

            {/* Error overlay for retryable errors */}
            {error && retryCount < 3 && (
                <View style={styles.errorOverlay}>
                    <View style={styles.errorCard}>
                        <Ionicons name="warning-outline" size={24} color="#F59E0B" />
                        <Text style={styles.errorCardText}>Connection issue - retrying...</Text>
                    </View>
                </View>
            )}

            {/* Navigation instructions overlay */}
            {isNavigating && (
                <View style={styles.navigationOverlay}>
                    {/* Progress bar */}
                    {progress && (
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${Math.min(progress.fractionTraveled * 100, 100)}%` }
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>
                                {formatDistance(progress.distanceRemaining)} • {formatDuration(progress.durationRemaining)}
                            </Text>
                        </View>
                    )}

                    {/* Current instruction */}
                    {currentInstruction && (
                        <View style={styles.instructionPanel}>
                            <View style={styles.instructionMain}>
                                <View style={styles.maneuverIcon}>
                                    <Ionicons
                                        name={getManeuverIcon(currentInstruction.maneuver.type, currentInstruction.maneuver.modifier) as any}
                                        size={30}
                                        color="white"
                                    />
                                </View>
                                <View style={styles.instructionText}>
                                    <Text style={styles.instructionTitle}>
                                        {currentInstruction.text}
                                    </Text>
                                    <Text style={styles.instructionDistance}>
                                        in {formatDistance(currentInstruction.distance)}
                                    </Text>
                                </View>
                            </View>

                            {/* Next instruction preview */}
                            {nextInstruction && (
                                <View style={styles.nextInstructionPreview}>
                                    <Ionicons
                                        name={getManeuverIcon(nextInstruction.maneuver.type, nextInstruction.maneuver.modifier) as any}
                                        size={16}
                                        color="#666"
                                    />
                                    <Text style={styles.nextInstructionText}>
                                        Then {nextInstruction.text.toLowerCase()}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
            )}

            {/* Control buttons */}
            <View style={styles.controlsContainer}>
                <TouchableOpacity
                    style={styles.stopButton}
                    onPress={handleStopNavigation}
                >
                    <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.centerButton}
                    onPress={handleRecenterCamera}
                >
                    <Ionicons name="locate" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>

            {/* Trip info and speed */}
            <View style={styles.bottomContainer}>
                {/* Speed display */}
                {currentPosition && (
                    <View style={styles.speedometer}>
                        <Text style={styles.speedText}>
                            {Math.round((currentPosition.speed || 0) * 3.6)}
                        </Text>
                        <Text style={styles.speedUnit}>km/h</Text>
                    </View>
                )}

                {/* Trip info */}
                <View style={styles.tripInfo}>
                    <View style={styles.tripInfoContent}>
                        <Text style={styles.tripDestination} numberOfLines={1}>
                            {navigationPhase === 'TO_PICKUP' ? 'To: ' + rideData.pickupAddress : 'To: ' + rideData.destAddress}
                        </Text>
                        <Text style={styles.tripPassenger} numberOfLines={1}>
                            Passenger: {rideData.passengerName}
                        </Text>
                        <Text style={styles.tripEarnings}>
                            Earnings: {rideData.estimatedPrice}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.callButton}
                        onPress={handleCallPassenger}
                    >
                        <Ionicons name="call" size={20} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    map: {
        flex: 1,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '500',
    },
    errorOverlay: {
        position: 'absolute',
        top: 100,
        left: 20,
        right: 20,
        zIndex: 200,
    },
    errorCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 10,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    errorCardText: {
        marginLeft: 10,
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    navigationOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    progressContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 15,
        alignItems: 'center',
    },
    progressBar: {
        width: '100%',
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
        marginBottom: 5,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 2,
    },
    progressText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    instructionPanel: {
        backgroundColor: 'white',
        marginHorizontal: 15,
        marginTop: 15,
        borderRadius: 15,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    instructionMain: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    maneuverIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    instructionText: {
        flex: 1,
    },
    instructionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    instructionDistance: {
        fontSize: 14,
        color: '#666',
    },
    nextInstructionPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    nextInstructionText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
        flex: 1,
    },
    controlsContainer: {
        position: 'absolute',
        right: 15,
        top: '50%',
        transform: [{ translateY: -50 }],
        zIndex: 50,
    },
    stopButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    centerButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 30,
        left: 15,
        right: 15,
        flexDirection: 'row',
        alignItems: 'flex-end',
        zIndex: 50,
    },
    speedometer: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 12,
        padding: 12,
        marginRight: 15,
        alignItems: 'center',
        minWidth: 80,
    },
    speedText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    speedUnit: {
        color: 'white',
        fontSize: 12,
        textAlign: 'center',
        opacity: 0.8,
    },
    tripInfo: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 15,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    tripInfoContent: {
        flex: 1,
    },
    tripDestination: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    tripPassenger: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    tripEarnings: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    callButton: {
        backgroundColor: '#007AFF',
        borderRadius: 20,
        padding: 12,
        marginLeft: 10,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 15,
        marginBottom: 10,
    },
    errorMessage: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    errorButtonContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    errorButton: {
        backgroundColor: '#007AFF',
        borderRadius: 8,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    secondaryButton: {
        backgroundColor: '#6B7280',
    },
    errorButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    secondaryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
});