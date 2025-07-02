import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StatusBar, Alert, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView from 'react-native-maps';
import { useRouter } from 'expo-router';
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { BottomSheet } from "@/components/BottomSheet";
import { Map } from "@/components/Map";
import {
    LocationService,
    DirectionsService,
    RealTimeTrackingService,
    trackingService
} from '@/components/LocationService';

interface LocationData {
    coordinates: {
        latitude: number;
        longitude: number;
    };
    address: string;
    isCurrentLocation?: boolean;
}

export default function RideAppInterface() {
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);
    const [userLocation, setUserLocation] = useState<any>(null);
    const [origin, setOrigin] = useState<LocationData | null>(null);
    const [destination, setDestination] = useState<LocationData | null>(null);
    const [routeCoordinates, setRouteCoordinates] = useState<Array<{latitude: number, longitude: number}>>([]);
    const [routeInfo, setRouteInfo] = useState<any>(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);
    const [selectedRide, setSelectedRide] = useState<any>(null);

    const mapRef = useRef<MapView>(null);
    const router = useRouter();
    const directionsService = new DirectionsService();

    // Default region (San Francisco)
    const initialRegion = {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    // Initialize location tracking on mount
    useEffect(() => {
        initializeLocationServices();

        return () => {
            // Cleanup
            trackingService.stopTracking();
        };
    }, []);

    // Calculate route when both origin and destination are set
    useEffect(() => {
        if (origin && destination) {
            calculateRoute();
        } else {
            setRouteCoordinates([]);
            setRouteInfo(null);
        }
    }, [origin, destination]);

    const initializeLocationServices = async () => {
        try {
            // Request permissions
            const permissions = await LocationService.requestPermissions();

            if (permissions.foreground !== 'granted') {
                Alert.alert(
                    'Location Permission Required',
                    'This app needs location access to show your position and calculate routes.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Grant Permission',
                            onPress: () => initializeLocationServices()
                        }
                    ]
                );
                return;
            }

            // Get initial location
            const location = await LocationService.getCurrentLocationWithFallback();
            setUserLocation(location);

            // Start real-time tracking
            const unsubscribe = trackingService.subscribe((newLocation) => {
                setUserLocation(newLocation);

                // Update origin if it's set to current location
                if (origin?.isCurrentLocation) {
                    setOrigin({
                        coordinates: {
                            latitude: newLocation.coords.latitude,
                            longitude: newLocation.coords.longitude
                        },
                        address: `Current Location (${newLocation.coords.latitude.toFixed(4)}, ${newLocation.coords.longitude.toFixed(4)})`,
                        isCurrentLocation: true
                    });
                }
            });

            await trackingService.startTracking({
                accuracy: 'high',
                timeInterval: 5000, // 5 seconds for demo
                distanceInterval: 10
            });

        } catch (error) {
            console.error('Failed to initialize location services:', error);
            Alert.alert(
                'Location Error',
                'Unable to access your location. Some features may not work properly.',
                [{ text: 'OK' }]
            );
        }
    };

    const calculateRoute = async () => {
        if (!origin || !destination) return;

        try {
            setIsLoadingRoute(true);

            const routeData = await directionsService.getDirections(
                origin.coordinates,
                destination.coordinates,
                {
                    mode: 'DRIVING',
                    alternatives: false,
                    avoid: '', // Can be 'tolls', 'highways', 'ferries'
                    language: 'en'
                }
            );

            setRouteCoordinates(routeData.coordinates);
            setRouteInfo({
                distance: routeData.distanceText,
                duration: routeData.durationText,
                distanceValue: routeData.distance,
                durationValue: routeData.duration
            });

            // Update ride options with estimated time and pricing based on distance
            updateRideEstimates(routeData);

        } catch (error) {
            console.error('Route calculation failed:', error);
            Alert.alert(
                'Route Error',
                'Unable to calculate route. Please check your internet connection and try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsLoadingRoute(false);
        }
    };

    const updateRideEstimates = (routeData: any) => {
        // This would typically call your backend for real pricing
        // For demo purposes, we'll calculate estimated prices based on distance
        const distanceKm = routeData.distance / 1000;
        const baseFare = 3;
        const perKmRate = 1.5;

        // Update ride options with dynamic pricing (this would be passed to BottomSheet)
        console.log('Updated estimates for', distanceKm, 'km route');
    };

    // Handle location selection from BottomSheet
    const handleLocationSelect = useCallback((type: 'origin' | 'destination', location: LocationData) => {
        if (type === 'origin') {
            setOrigin(location);
        } else {
            setDestination(location);
        }
    }, []);

    // Handle ride selection
    const handleRideSelect = useCallback((ride: any, customPrice: string) => {
        setSelectedRide({ ...ride, customPrice });
        console.log('Selected ride:', ride, 'with price:', customPrice);
    }, []);

    // Handle ride confirmation
    const handleConfirmRide = useCallback(() => {
        if (!origin || !destination || !selectedRide) {
            Alert.alert('Missing Information', 'Please select pickup location, destination, and ride type.');
            return;
        }

        Alert.alert(
            'Confirm Ride',
            `Confirm ${selectedRide.type} from ${origin.address} to ${destination.address}?\n\nEstimated fare: ${selectedRide.customPrice || selectedRide.suggestedRange}\nDistance: ${routeInfo?.distance || 'Calculating...'}\nTime: ${routeInfo?.duration || 'Calculating...'}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm Ride',
                    onPress: () => processRideConfirmation()
                }
            ]
        );
    }, [origin, destination, selectedRide, routeInfo]);

    const processRideConfirmation = () => {
        // Here you would typically:
        // 1. Send ride request to your backend
        // 2. Handle payment processing
        // 3. Find available drivers
        // 4. Start real-time ride tracking

        console.log('Processing ride confirmation...');

        Alert.alert(
            'Ride Requested!',
            'Your ride has been requested. Finding nearby drivers...',
            [{ text: 'OK' }]
        );

        // For demo: simulate finding a driver
        setTimeout(() => {
            Alert.alert(
                'Driver Found!',
                'John Doe will pick you up in 3 minutes.\nToyota Camry - ABC 123',
                [{ text: 'OK' }]
            );
        }, 2000);
    };

    // Handle location updates for real-time tracking
    const handleLocationUpdate = useCallback((location: any) => {
        // This callback receives location updates from the Map component
        // You can use this for additional processing if needed
        console.log('Location updated:', location);
    }, []);

    // Sidebar handlers
    const handleMenuPress = () => setIsSidebarVisible(true);
    const handleNotificationPress = () => console.log('Navigate to notifications');
    const handleProfilePress = () => {
        router.push('/(tabs)/profile');
        setIsSidebarVisible(false);
    };
    const handleHistoryPress = () => {
        router.push('/(tabs)/history');
        setIsSidebarVisible(false);
    };
    const handlePaymentPress = () => {
        console.log('Navigate to payment');
        setIsSidebarVisible(false);
    };
    const handleSettingsPress = () => {
        router.push('/(tabs)/settings');
        setIsSidebarVisible(false);
    };
    const handleBecomeDriverPress = () => {
        router.push('/(tabs)/become-driver');
        setIsSidebarVisible(false);
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-100" edges={["right", "top", "left", "bottom"]}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

            {/* Header */}
            <Header
                onMenuPress={handleMenuPress}
                onNotificationPress={handleNotificationPress}
            />

            {/* Enhanced Map with Route Display */}
            <Map
                mapRef={mapRef}
                initialRegion={userLocation ? {
                    latitude: userLocation.coords.latitude,
                    longitude: userLocation.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                } : initialRegion}
                className="flex-1"
                origin={origin?.coordinates}
                destination={destination?.coordinates}
                routeCoordinates={routeCoordinates}
                onLocationUpdate={handleLocationUpdate}
                showUserLocation={true}
            />

            {/* Loading Indicator for Route Calculation */}
            {isLoadingRoute && (
                <View style={{
                    position: 'absolute',
                    top: 100,
                    left: 20,
                    right: 20,
                    backgroundColor: 'white',
                    padding: 12,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                }}>
                    <Text style={{ marginLeft: 8, fontSize: 14, color: '#666' }}>
                        Calculating route...
                    </Text>
                </View>
            )}

            {/* Route Information Display */}
            {routeInfo && !isLoadingRoute && (
                <View style={{
                    position: 'absolute',
                    top: 100,
                    left: 20,
                    right: 20,
                    backgroundColor: 'white',
                    padding: 12,
                    borderRadius: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>
                        {routeInfo.distance} • {routeInfo.duration}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                        Estimated route
                    </Text>
                </View>
            )}

            {/* Enhanced BottomSheet with Place Search */}
            <BottomSheet
                onRideSelect={handleRideSelect}
                onConfirmRide={handleConfirmRide}
                onLocationSelect={handleLocationSelect}
                userLocation={userLocation}
            />

            {/* Sidebar */}
            <Sidebar
                isVisible={isSidebarVisible}
                onClose={() => setIsSidebarVisible(false)}
                onProfilePress={handleProfilePress}
                onHistoryPress={handleHistoryPress}
                onPaymentPress={handlePaymentPress}
                onSettingsPress={handleSettingsPress}
                onBecomeDriverPress={handleBecomeDriverPress}
            />
        </SafeAreaView>
    );
}