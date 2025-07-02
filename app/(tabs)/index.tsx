import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StatusBar, Alert, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView from 'react-native-maps';
import { useRouter } from 'expo-router';
// import NetInfo from '@react-native-community/netinfo'; // For actual network check

import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { BottomSheet } from "@/components/BottomSheet";
import { Map } from "@/components/Map";
import {
    LocationService, // Note: locationService instance is used, not the class directly for most operations
    DirectionsService, // Note: directionsService instance is used
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
                    'This app needs location access to show your position and calculate routes. Please grant permission in your device settings.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Grant Permission',
                            onPress: () => initializeLocationServices() // Or link to settings: Linking.openSettings()
                        }
                    ]
                );
                return;
            }

            // const isConnected = await checkNetworkStatus();
            // if (!isConnected && !LocationService.lastKnownLocation && !await LocationService.getCachedLocation()) {
            //     Alert.alert(
            //         'Network & Location Error',
            //         'No internet connection to verify location and no cached location available. Some features may be limited.',
            //         [{ text: 'OK' }]
            //     );
            //     // Potentially stop here or allow limited functionality
            // }

            // Get initial location
            const location = await LocationService.getCurrentLocationWithFallback();
            setUserLocation(location);
            // Set current location as origin by default if not already set
            if (!origin && location) {
                setOrigin({
                    coordinates: {
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude,
                    },
                    address: `Current Location (${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)})`,
                    isCurrentLocation: true,
                });
            }


            // Start real-time tracking
            trackingService.subscribe((newLocation) => {
                setUserLocation(newLocation);

                // Update origin if it's set to current location and map marker is also at current
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
                // accuracy: 'high', // This is default in RealTimeTrackingService
                // timeInterval: 5000, // This is default baseInterval in RealTimeTrackingService if not overridden
                distanceInterval: 10 // meters
            });

        } catch (error: any) {
            console.error('Failed to initialize location services:', error);
            let alertMessage = 'Unable to access your location. Some features may not work properly.';
            if (error.message) {
                if (error.message.toLowerCase().includes('permission')) {
                    alertMessage = 'Location permission is required. Please enable it in your device settings and restart the app.';
                } else if (error.message.toLowerCase().includes('unable to get location')) {
                    alertMessage = 'Could not determine your current location. Please ensure GPS is enabled and you have a clear view of the sky, or check network connectivity.';
                }
            }
            Alert.alert(
                'Location Error',
                alertMessage,
                [{ text: 'OK' }]
            );
        }
    };

    const calculateRoute = async () => {
        if (!origin || !destination) {
            // Clear route if origin or destination is missing
            setRouteCoordinates([]);
            setRouteInfo(null);
            return;
        }

        // const isConnected = await checkNetworkStatus(); // Placeholder for NetInfo
        // if (!isConnected) {
        //     Alert.alert(
        //         'Network Error',
        //         'No internet connection. Please check your network settings and try again to calculate the route.',
        //         [{ text: 'OK' }]
        //     );
        //     setIsLoadingRoute(false);
        //     return;
        // }

        try {
            setIsLoadingRoute(true);
            setRouteCoordinates([]); // Clear previous route while loading new one
            setRouteInfo(null);

            const routeData = await directionsService.getDirections(
                origin.coordinates,
                destination.coordinates,
                {
                    mode: 'DRIVING',
                    alternatives: false,
                    avoid: '',
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

            updateRideEstimates(routeData);

        } catch (error: any) {
            console.error('Route calculation failed:', error);
            let errorMessage = 'Unable to calculate route. Please try again.';
            if (error.message) {
                if (error.message.includes('No route found') || error.message.startsWith('Directions API Error: ZERO_RESULTS')) {
                    errorMessage = 'No route could be found between the selected locations. Please ensure they are valid and accessible by road.';
                } else if (error.message.includes('Network request failed') || error.message.toLowerCase().includes('network error')) {
                    errorMessage = 'A network error occurred while calculating the route. Please check your connection and try again.';
                } else if (error.message.startsWith('Directions API Error:')) {
                    errorMessage = `Route calculation error: ${error.message.replace('Directions API Error: ', '')}. Please try again.`;
                }
            }
            Alert.alert('Route Calculation Error', errorMessage, [{ text: 'OK' }]);
            setRouteCoordinates([]); // Ensure route is cleared on error
            setRouteInfo(null);
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