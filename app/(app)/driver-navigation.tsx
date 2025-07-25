// app/(app)/driver-navigation.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDriverNavigation, RideNavigationData } from '@/hooks/useDriverNavigation';

// Try to import MapboxNavigationView with error handling
let MapboxNavigationView: any = null;
try {
    const MapboxNavigation = require('@complexify/expo-mapbox-navigation');
    MapboxNavigationView = MapboxNavigation.MapboxNavigationView;
    console.log('✅ MapboxNavigationView imported successfully');
} catch (error) {
    console.error('❌ Failed to import MapboxNavigationView:', error);
}

export default function DriverNavigationScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    console.log('🚗 Driver Navigation Screen loaded with params:', params);

    // Validate required params
    if (!params.rideId || !params.pickupLat || !params.pickupLng || !params.destLat || !params.destLng) {
        console.error('❌ Missing required navigation params:', params);
        Alert.alert(
            'Navigation Error',
            'Missing ride information. Returning to driver dashboard.',
            [{ text: 'OK', onPress: () => router.replace('/(app)') }]
        );
        return null;
    }

    // Extract ride data from params
    const rideData: RideNavigationData = {
        id: params.rideId as string,
        pickupLat: parseFloat(params.pickupLat as string),
        pickupLng: parseFloat(params.pickupLng as string),
        pickupAddress: params.pickupAddress as string,
        destLat: parseFloat(params.destLat as string),
        destLng: parseFloat(params.destLng as string),
        destAddress: params.destAddress as string,
        passengerName: params.passengerName as string,
        estimatedPrice: params.estimatedPrice as string,
    };

    // Early return if MapboxNavigationView is not available
    if (!MapboxNavigationView) {
        return (
            <SafeAreaView className="flex-1 bg-black">
                <Stack.Screen options={{ headerShown: false }} />
                <View className="flex-1 justify-center items-center">
                    <View className="bg-white rounded-2xl p-6 mx-4 items-center">
                        <Ionicons name="warning-outline" size={48} color="#F59E0B" />
                        <Text className="text-lg font-semibold text-gray-800 mb-2 mt-4">
                            Navigation Not Available
                        </Text>
                        <Text className="text-gray-600 text-center mb-4">
                            The Mapbox Navigation component failed to load. Please check your installation.
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="bg-blue-500 rounded-lg px-6 py-3"
                        >
                            <Text className="text-white font-medium">Go Back</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    console.log('📍 Ride data parsed:', rideData);

    const {
        navigationPhase,
        isNavigationActive,
        currentDestination,
        driverLocation,
        estimatedTimeRemaining,
        distanceRemaining,
        handleArrivedAtPickup,
        handleArrivedAtDestination,
        handleNavigationError,
        handleRouteProgressChange,
        getPhaseTitle,
        getPhaseInstruction,
        formatTimeRemaining,
        formatDistanceRemaining,
        isAtPickupPhase,
        isAtDestinationPhase,
    } = useDriverNavigation({
        rideData,
        onNavigationComplete: () => {
            // Navigate back to driver dashboard
            router.replace('/(app)');
        },
        onNavigationError: (error) => {
            console.error('🚨 Navigation error occurred:', error);
            Alert.alert(
                'Navigation Error',
                'There was an issue with navigation. Please try again.',
                [
                    { text: 'Retry', onPress: () => {
                            console.log('🔄 Retrying navigation...');
                            // The hook will automatically restart navigation
                        }},
                    { text: 'Cancel', onPress: () => router.back() }
                ]
            );
        }
    });

    // Early return with loading state if driver location is not available
    if (!driverLocation) {
        return (
            <SafeAreaView className="flex-1 bg-black">
                <Stack.Screen options={{ headerShown: false }} />
                <View className="flex-1 justify-center items-center">
                    <View className="bg-white rounded-2xl p-6 mx-4 items-center">
                        <Text className="text-lg font-semibold text-gray-800 mb-2">
                            Getting your location...
                        </Text>
                        <Text className="text-gray-600 text-center">
                            Please ensure location permissions are enabled for navigation to work.
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="mt-4 bg-gray-500 rounded-lg px-4 py-2"
                        >
                            <Text className="text-white font-medium">Go Back</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // Validate coordinates before rendering navigation
    const isValidCoordinate = (lat: number, lng: number) => {
        return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    };

    const driverLat = driverLocation?.coords.latitude || 0;
    const driverLng = driverLocation?.coords.longitude || 0;
    const destLat = currentDestination.latitude;
    const destLng = currentDestination.longitude;

    const hasValidCoordinates = isValidCoordinate(driverLat, driverLng) && isValidCoordinate(destLat, destLng);

    console.log('🗺️ Coordinate validation:', {
        driver: { lat: driverLat, lng: driverLng, valid: isValidCoordinate(driverLat, driverLng) },
        destination: { lat: destLat, lng: destLng, valid: isValidCoordinate(destLat, destLng) },
        overall: hasValidCoordinates
    });

    const handleBackPress = () => {
        Alert.alert(
            'Cancel Navigation',
            'Are you sure you want to cancel this ride navigation?',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: () => router.back()
                }
            ]
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-black">
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />

            {/* Navigation View */}
            <View className="flex-1">
                {isNavigationActive && hasValidCoordinates ? (
                    <View className="flex-1">
                        <MapboxNavigationView
                            style={{ flex: 1 }}
                            coordinates={[
                                {
                                    latitude: driverLat,
                                    longitude: driverLng,
                                },
                                {
                                    latitude: destLat,
                                    longitude: destLng,
                                }
                            ]}
                            routeProfile="mapbox/driving-traffic"
                            muted={false}
                            onRouteProgressChanged={(event: { nativeEvent: { distanceRemaining: number; distanceTraveled: number; durationRemaining: number; fractionTraveled: number; }; }) => {
                                console.log('📊 Route progress:', event.nativeEvent);
                                handleRouteProgressChange(event.nativeEvent);
                            }}
                            onFinalDestinationArrival={() => {
                                console.log('🏁 Arrived at destination');
                                if (isAtPickupPhase) {
                                    handleArrivedAtPickup();
                                } else if (isAtDestinationPhase) {
                                    handleArrivedAtDestination();
                                }
                            }}
                            onCancelNavigation={() => {
                                console.log('❌ Navigation cancelled by user');
                                handleBackPress();
                            }}
                            onRouteChanged={() => {
                                console.log('🔄 Route changed or rerouted');
                            }}
                            onUserOffRoute={() => {
                                console.log('⚠️ User went off route');
                            }}
                            onRoutesLoaded={() => {
                                console.log('✅ Routes loaded successfully');
                            }}
                        />
                    </View>
                ) : (
                    <View className="flex-1 justify-center items-center bg-gray-100">
                        <View className="bg-white rounded-2xl p-6 mx-4 items-center">
                            {!hasValidCoordinates ? (
                                <>
                                    <Ionicons name="warning-outline" size={48} color="#F59E0B" />
                                    <Text className="text-lg font-semibold text-gray-800 mb-2 mt-4">
                                        Invalid Coordinates
                                    </Text>
                                    <Text className="text-gray-600 text-center mb-4">
                                        The navigation coordinates are invalid. Please check the ride data.
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Text className="text-lg font-semibold text-gray-800 mb-2">
                                        Initializing Navigation...
                                    </Text>
                                    <Text className="text-gray-600 text-center">
                                        Please wait while we set up your route.
                                    </Text>
                                    {__DEV__ && (
                                        <View className="mt-4 p-2 bg-gray-100 rounded">
                                            <Text className="text-xs text-gray-600">
                                                Debug: Driver Location: {driverLocation ? 'Available' : 'Loading...'}
                                            </Text>
                                            <Text className="text-xs text-gray-600">
                                                Mapbox Component: {MapboxNavigationView ? 'Loaded' : 'Failed'}
                                            </Text>
                                            <Text className="text-xs text-gray-600">
                                                Valid Coords: {hasValidCoordinates ? 'Yes' : 'No'}
                                            </Text>
                                        </View>
                                    )}
                                </>
                            )}
                            <TouchableOpacity
                                onPress={() => router.back()}
                                className="mt-4 bg-gray-500 rounded-lg px-6 py-3"
                            >
                                <Text className="text-white font-medium">Go Back</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Compact Status Overlay - only show when navigation is active */}
                {isNavigationActive && hasValidCoordinates && (
                    <View className="absolute bottom-24 left-4 right-4">
                        <View className="bg-white bg-opacity-95 rounded-xl p-3 shadow-lg">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-1">
                                    <Text className="text-sm font-bold text-gray-800">
                                        {getPhaseTitle()}
                                    </Text>
                                    <Text className="text-xs text-gray-600 mt-1" numberOfLines={1}>
                                        {getPhaseInstruction()}
                                    </Text>
                                </View>

                                {/* Compact Info */}
                                <View className="items-end ml-3">
                                    <Text className="text-sm font-bold text-green-600">
                                        {rideData.estimatedPrice}
                                    </Text>
                                    {(estimatedTimeRemaining || distanceRemaining) && (
                                        <Text className="text-xs text-gray-500">
                                            {formatTimeRemaining(estimatedTimeRemaining)} • {formatDistanceRemaining(distanceRemaining)}
                                        </Text>
                                    )}
                                </View>

                                <TouchableOpacity
                                    onPress={handleBackPress}
                                    className="ml-2 p-1 bg-gray-100 rounded-full"
                                >
                                    <Ionicons name="close" size={16} color="#666" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}

                {/* Action Buttons - only show when navigation is active */}
                {isNavigationActive && hasValidCoordinates && isAtPickupPhase && (
                    <View className="absolute bottom-4 left-4 right-4">
                        <TouchableOpacity
                            onPress={handleArrivedAtPickup}
                            className="bg-blue-500 rounded-xl p-4 items-center shadow-lg"
                        >
                            <Text className="text-white font-semibold text-base">
                                I've Arrived at Pickup
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isNavigationActive && hasValidCoordinates && isAtDestinationPhase && (
                    <View className="absolute bottom-4 left-4 right-4">
                        <TouchableOpacity
                            onPress={handleArrivedAtDestination}
                            className="bg-green-500 rounded-xl p-4 items-center shadow-lg"
                        >
                            <Text className="text-white font-semibold text-base">
                                Trip Completed
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}