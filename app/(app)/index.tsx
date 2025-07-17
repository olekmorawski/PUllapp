import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StatusBar, Alert, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import {Sidebar} from "@/components/Sidebar/Sidebar";
import { BottomSheet } from '@/components/BottomSheet/BottomSheet';
import { DriverBottomSheet } from '@/components/DriverBottomSheet';
import { MapboxMap } from '@/components/MapboxMap';
import Mapbox from '@rnmapbox/maps';

import { DirectionsService } from '@/components/DirectionsService';
import {useLocation} from "@/hooks/Location/useLocation";

// API Base URL - update this to match your backend
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

interface LocationData {
    coordinates: {
        latitude: number;
        longitude: number;
    };
    address: string;
    isCurrentLocation?: boolean;
}

// Ride interface matching your backend
interface AvailableRide {
    id: string;
    userId: string;
    userEmail: string;
    walletAddress: string;
    originCoordinates: { latitude: number; longitude: number };
    destinationCoordinates: { latitude: number; longitude: number };
    originAddress: string;
    destinationAddress: string;
    estimatedPrice?: string;
    customPrice?: string;
    status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
    createdAt: string;
    updatedAt: string;
}

export default function RideAppInterface() {
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);
    const [origin, setOrigin] = useState<LocationData | null>(null);
    const [destination, setDestination] = useState<LocationData | null>(null);
    const [routeGeoJSON, setRouteGeoJSON] = useState<GeoJSON.Feature | null>(null);
    const [routeInfo, setRouteInfo] = useState<{
        distance: string;
        duration: string;
        distanceValue: number;
        durationValue: number;
    } | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);
    const [selectedRide, setSelectedRide] = useState<any>(null);
    const [isDriverViewActive, setIsDriverViewActive] = useState(false);

    // Driver-specific states
    const [availableRides, setAvailableRides] = useState<AvailableRide[]>([]);
    const [isLoadingRides, setIsLoadingRides] = useState(false);
    const [isAcceptingRide, setIsAcceptingRide] = useState<string | null>(null);

    // Driver route states
    const [driverToClientRouteGeoJSON, setDriverToClientRouteGeoJSON] = useState<GeoJSON.Feature | null>(null);
    const [clientToDestRouteGeoJSON, setClientToDestRouteGeoJSON] = useState<GeoJSON.Feature | null>(null);

    // Define sample ride options
    const sampleRideOptions = [
        { id: 1, type: 'Standard', time: '5 min', suggestedRange: '$10-12', icon: 'car' },
    ];

    const mapRef = useRef<Mapbox.MapView>(null);
    const router = useRouter();
    const directionsService = new DirectionsService();

    const {
        location: userLocation,
        error: locationError,
        isLoading: isGettingLocation,
    } = useLocation({ autoStart: true });

    const initialStaticRegion = {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    // API Functions - Direct implementation
    const fetchAvailableRides = useCallback(async () => {
        if (!isDriverViewActive) return;

        setIsLoadingRides(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/rides?status=pending`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setAvailableRides(data.rides || []);
        } catch (error: any) {
            console.error('Error fetching available rides:', error);
            Alert.alert(
                'Error Loading Rides',
                error.message || 'Failed to fetch available rides. Please check your connection and try again.',
                [
                    { text: 'Retry', onPress: () => fetchAvailableRides() },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
            // Don't clear existing rides on error
        } finally {
            setIsLoadingRides(false);
        }
    }, [isDriverViewActive]);

    const acceptRide = useCallback(async (rideId: string): Promise<AvailableRide> => {
        const response = await fetch(`${API_BASE_URL}/api/rides/${rideId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: 'accepted'
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        if (!data.success) {
            throw new Error('Failed to accept ride');
        }

        return data.ride;
    }, []);

    const handleAcceptRide = useCallback(async (rideId: string) => {
        setIsAcceptingRide(rideId);
        try {
            // Accept the ride via API
            const acceptedRide = await acceptRide(rideId);

            // Remove the accepted ride from available rides
            setAvailableRides(prev => prev.filter(ride => ride.id !== rideId));

            Alert.alert(
                'Ride Accepted!',
                `You have successfully accepted the ride from ${acceptedRide.originAddress} to ${acceptedRide.destinationAddress}.`,
                [
                    {
                        text: 'View Details',
                        onPress: () => {
                            // You can navigate to a ride details screen here
                            console.log('Navigate to ride details:', acceptedRide);
                        }
                    },
                    { text: 'OK', style: 'default' }
                ]
            );

            console.log('Successfully accepted ride:', acceptedRide);

        } catch (error: any) {
            console.error('Error accepting ride:', error);
            Alert.alert(
                'Failed to Accept Ride',
                error.message || 'Unable to accept the ride. Please try again.',
                [
                    { text: 'Retry', onPress: () => handleAcceptRide(rideId) },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        } finally {
            setIsAcceptingRide(null);
        }
    }, [acceptRide]);

    const handleRejectRide = useCallback(async (rideId: string) => {
        try {
            // For now, just remove from local state
            // In the future, you might want to track rejections via API
            setAvailableRides(prev => prev.filter(ride => ride.id !== rideId));
            console.log('Rejected ride:', rideId);
        } catch (error: any) {
            console.error('Error rejecting ride:', error);
            Alert.alert('Error', 'Failed to reject ride.');
        }
    }, []);

    useEffect(() => {
        if (userLocation && !origin) {
            const address = `Current Location (${userLocation.coords.latitude.toFixed(4)}, ${userLocation.coords.longitude.toFixed(4)})`;
            setOrigin({
                coordinates: userLocation.coords,
                address,
                isCurrentLocation: true,
            });
        }

        if (locationError) {
            Alert.alert('Location Error', 'Unable to access your location.');
        }
    }, [userLocation, locationError]);

    // Calculate route when both origin and destination are set
    useEffect(() => {
        if (!origin || !destination) return;

        const calculateRoute = async () => {
            setIsLoadingRoute(true);
            setRouteGeoJSON(null);
            setRouteInfo(null);

            try {
                const routeData = await directionsService.getDirections(
                    origin.coordinates,
                    destination.coordinates
                );

                setRouteGeoJSON(routeData.geoJSON);
                setRouteInfo({
                    distance: routeData.distanceText,
                    duration: routeData.durationText,
                    distanceValue: routeData.distance,
                    durationValue: routeData.duration,
                });

                updateRideEstimates(routeData);
            } catch (error: any) {
                Alert.alert('Route Error', error.message || 'Failed to calculate route');
            } finally {
                setIsLoadingRoute(false);
            }
        };

        calculateRoute();
    }, [origin, destination]);

    const updateRideEstimates = (routeData: any) => {
        const distanceKm = routeData.distance / 1000;
        const baseFare = 3;
        const perKmRate = 1.5;
        const estimatedPrice = baseFare + distanceKm * perKmRate;

        console.log('Updated estimates for', distanceKm.toFixed(1), 'km route');
    };

    const handleLocationSelect = useCallback(
        (type: 'origin' | 'destination', location: LocationData) => {
            if (type === 'origin') {
                setOrigin(location);
            } else {
                setDestination(location);
            }
        },
        []
    );

    const handleRideSelect = useCallback((ride: any, customPrice: string) => {
        setSelectedRide({ ...ride, customPrice });
    }, []);

    const handleConfirmRide = useCallback(() => {
        if (!origin || !destination || !selectedRide) {
            Alert.alert('Missing Information', 'Please select pickup, destination, and ride type');
            return;
        }

        const estimatedFare = ((routeInfo?.distanceValue || 0) / 1000) * 1.5 + 3;

        Alert.alert(
            'Confirm Ride',
            `Confirm ${selectedRide.type} from ${origin.address} to ${destination.address}\n\nEstimated fare: $${estimatedFare.toFixed(2)}`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', onPress: processRideConfirmation },
            ]
        );
    }, [origin, destination, selectedRide, routeInfo]);

    const processRideConfirmation = () => {
        const estimatedFare = ((routeInfo?.distanceValue || 0) / 1000) * 1.5 + 3;

        router.push({
            pathname: '/(app)/loading',
            params: {
                price: estimatedFare.toFixed(2),
                pickupAddress: origin?.address || 'Current Location',
                destinationAddress: destination?.address || 'Not specified',
            },
        });
    };

    const handleLocationUpdate = useCallback(
        (mapboxLocation: Mapbox.Location) => {
            const coords = mapboxLocation.coords;
            if (origin?.isCurrentLocation) {
                const address = `Current Location (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`;
                setOrigin({
                    coordinates: coords,
                    address,
                    isCurrentLocation: true,
                });
            }
        },
        [origin]
    );

    const getInitialRegion = () => {
        if (userLocation?.coords) {
            return {
                latitude: userLocation.coords.latitude,
                longitude: userLocation.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };
        }
        return initialStaticRegion;
    };

    const handleToggleDriverView = () => {
        const newDriverState = !isDriverViewActive;
        setIsDriverViewActive(newDriverState);

        if (newDriverState) {
            // Switching to driver view
            setAvailableRides([]); // Clear any existing rides
            fetchAvailableRides(); // Fetch fresh data

            // Clear passenger-specific state
            setRouteGeoJSON(null);
            setRouteInfo(null);
            setSelectedRide(null);

        } else {
            // Switching to passenger view
            setAvailableRides([]);
            setDriverToClientRouteGeoJSON(null);
            setClientToDestRouteGeoJSON(null);
            setIsAcceptingRide(null);
        }

        setIsSidebarVisible(false);
    };

    // Auto-refresh available rides every 30 seconds when in driver view
    useEffect(() => {
        if (!isDriverViewActive) return;

        // Initial fetch
        fetchAvailableRides();

        // Set up interval for auto-refresh
        const interval = setInterval(() => {
            fetchAvailableRides();
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [isDriverViewActive, fetchAvailableRides]);

    const handleMenuPress = () => setIsSidebarVisible(true);
    const handleNotificationPress = () => console.log('Notifications pressed');
    const handleProfilePress = () => router.push('/(app)/profile');
    const handleHistoryPress = () => router.push('/(app)/history');
    const handlePaymentPress = () => console.log('Payment pressed');
    const handleSettingsPress = () => router.push('/(app)/settings');
    const handleBecomeDriverPress = () => router.push('/(app)/become-driver');

    return (
        <SafeAreaView className="flex-1 bg-gray-100" edges={['right', 'top', 'left', 'bottom']}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

            <Header onMenuPress={handleMenuPress} onNotificationPress={handleNotificationPress} />

            {isDriverViewActive ? (
                <>
                    <MapboxMap
                        mapRef={mapRef}
                        initialRegion={getInitialRegion()}
                        showUserLocation={true}
                    />
                    <DriverBottomSheet
                        availableRides={availableRides}
                        isVisible={isDriverViewActive}
                        onAcceptRide={handleAcceptRide}
                        onRejectRide={handleRejectRide}
                        onRefresh={fetchAvailableRides}
                        isLoading={isLoadingRides}
                        isAcceptingRide={isAcceptingRide}
                    />
                </>
            ) : (
                <>
                    <MapboxMap
                        mapRef={mapRef}
                        initialRegion={getInitialRegion()}
                        origin={origin?.coordinates}
                        destination={destination?.coordinates}
                        routeGeoJSON={routeGeoJSON}
                        onLocationUpdate={handleLocationUpdate}
                        showUserLocation={true}
                    />

                    {isLoadingRoute && (
                        <View className="absolute top-24 left-5 right-5 bg-white p-4 rounded-lg shadow-md flex-row items-center">
                            <ActivityIndicator size="small" color="#007AFF" />
                            <Text className="ml-3 text-gray-600">Calculating route...</Text>
                        </View>
                    )}

                    {routeInfo && !isLoadingRoute && (
                        <View className="absolute top-24 left-5 right-5 bg-white p-4 rounded-lg shadow-md">
                            <Text className="text-lg font-semibold">
                                {routeInfo.distance} • {routeInfo.duration}
                            </Text>
                            <Text className="text-gray-500 text-sm">Estimated route</Text>
                        </View>
                    )}

                    <BottomSheet
                        rideOptions={sampleRideOptions}
                        onRideSelect={handleRideSelect}
                        onConfirmRide={handleConfirmRide}
                        onLocationSelect={handleLocationSelect}
                    />
                </>
            )}

            <Sidebar
                isVisible={isSidebarVisible}
                onClose={() => setIsSidebarVisible(false)}
                onProfilePress={handleProfilePress}
                onHistoryPress={handleHistoryPress}
                onPaymentPress={handlePaymentPress}
                onSettingsPress={handleSettingsPress}
                onBecomeDriverPress={!isDriverViewActive ? handleBecomeDriverPress : undefined}
                onSwitchToDriverViewPress={!isDriverViewActive ? handleToggleDriverView : undefined}
                onSwitchToPassengerViewPress={isDriverViewActive ? handleToggleDriverView : undefined}
            />
        </SafeAreaView>
    );
}