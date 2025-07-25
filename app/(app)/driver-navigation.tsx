// app/(app)/driver-navigation.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MapboxNavigationView } from '@complexify/expo-mapbox-navigation';
import { useDriverNavigation, RideNavigationData } from '@/hooks/useDriverNavigation';

export default function DriverNavigationScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

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
            Alert.alert(
                'Navigation Error',
                'There was an issue with navigation. Please try again.',
                [
                    { text: 'Retry', onPress: () => {} },
                    { text: 'Cancel', onPress: () => router.back() }
                ]
            );
        }
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
                <MapboxNavigationView
                    style={{ flex: 1 }}
                    coordinates={[
                        {
                            latitude: driverLocation?.coords.latitude || 0,
                            longitude: driverLocation?.coords.longitude || 0,
                        },
                        currentDestination
                    ]}
                    routeProfile="mapbox/driving-traffic"
                    onRouteProgressChanged={(event) => {
                        handleRouteProgressChange(event.nativeEvent);
                    }}
                    onFinalDestinationArrival={() => {
                        if (isAtPickupPhase) {
                            handleArrivedAtPickup();
                        } else if (isAtDestinationPhase) {
                            handleArrivedAtDestination();
                        }
                    }}
                    onCancelNavigation={handleBackPress}
                    onRouteChanged={() => {
                        console.log('Route changed or rerouted');
                    }}
                    onUserOffRoute={() => {
                        console.log('User went off route');
                    }}
                    onRoutesLoaded={() => {
                        console.log('Routes loaded successfully');
                    }}
                />

                {/* Status Overlay */}
                <View className="absolute top-12 left-4 right-4">
                    <View className="bg-white rounded-2xl p-4 shadow-lg">
                        <View className="flex-row items-center justify-between mb-2">
                            <View className="flex-1">
                                <Text className="text-lg font-bold text-gray-800">
                                    {getPhaseTitle()}
                                </Text>
                                <Text className="text-sm text-gray-600 mt-1">
                                    {getPhaseInstruction()}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={handleBackPress}
                                className="ml-3 p-2 bg-gray-100 rounded-full"
                            >
                                <Ionicons name="close" size={20} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {/* Ride Info */}
                        <View className="border-t border-gray-200 pt-3 mt-3">
                            <View className="flex-row items-center justify-between mb-2">
                                <View className="flex-1">
                                    <Text className="text-sm font-medium text-gray-700">
                                        {rideData.passengerName || 'Passenger'}
                                    </Text>
                                    <Text className="text-xs text-gray-500">
                                        Ride ID: {rideData.id.substring(0, 8)}...
                                    </Text>
                                </View>
                                <View className="items-end">
                                    <Text className="text-lg font-bold text-green-600">
                                        {rideData.estimatedPrice}
                                    </Text>
                                    <Text className="text-xs text-gray-500">
                                        Estimated earnings
                                    </Text>
                                </View>
                            </View>

                            {/* ETA and Distance */}
                            {(estimatedTimeRemaining || distanceRemaining) && (
                                <View className="flex-row items-center justify-between mt-2 pt-2 border-t border-gray-100">
                                    <View className="flex-1 items-center">
                                        <Text className="text-lg font-bold text-blue-600">
                                            {formatTimeRemaining(estimatedTimeRemaining)}
                                        </Text>
                                        <Text className="text-xs text-gray-500">ETA</Text>
                                    </View>
                                    <View className="w-px h-8 bg-gray-300 mx-3" />
                                    <View className="flex-1 items-center">
                                        <Text className="text-lg font-bold text-orange-600">
                                            {formatDistanceRemaining(distanceRemaining)}
                                        </Text>
                                        <Text className="text-xs text-gray-500">Distance</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Phase Indicator */}
                        <View className="flex-row items-center mt-3 pt-3 border-t border-gray-200">
                            <View className="flex-row items-center flex-1">
                                <View className={`w-3 h-3 rounded-full mr-2 ${
                                    isAtPickupPhase ? 'bg-blue-500' : 'bg-green-500'
                                }`} />
                                <Text className="text-xs text-gray-600">Pickup</Text>
                            </View>
                            <View className="flex-1 h-px bg-gray-300 mx-2" />
                            <View className="flex-row items-center flex-1 justify-end">
                                <Text className="text-xs text-gray-600">Destination</Text>
                                <View className={`w-3 h-3 rounded-full ml-2 ${
                                    isAtDestinationPhase ? 'bg-blue-500' :
                                        navigationPhase === 'COMPLETED' ? 'bg-green-500' : 'bg-gray-300'
                                }`} />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                {isAtPickupPhase && (
                    <View className="absolute bottom-8 left-4 right-4">
                        <TouchableOpacity
                            onPress={handleArrivedAtPickup}
                            className="bg-blue-500 rounded-2xl p-4 items-center shadow-lg"
                        >
                            <Text className="text-white font-semibold text-lg">
                                I've Arrived at Pickup
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isAtDestinationPhase && (
                    <View className="absolute bottom-8 left-4 right-4">
                        <TouchableOpacity
                            onPress={handleArrivedAtDestination}
                            className="bg-green-500 rounded-2xl p-4 items-center shadow-lg"
                        >
                            <Text className="text-white font-semibold text-lg">
                                Trip Completed
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}