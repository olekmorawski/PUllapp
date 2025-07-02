import React, { useState, useRef, useEffect } from 'react';
import {StatusBar, Alert, View, Text, ActivityIndicator} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { BottomSheet } from "@/components/BottomSheet";
import { MapboxMap } from "@/components/MapboxMap";
import { DirectionsService } from '@/components/DirectionsService';
import { LocationService } from '@/components/LocationService';
import {MapView} from "@rnmapbox/maps";

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
    const [routeGeoJSON, setRouteGeoJSON] = useState<GeoJSON.Feature | null>(null);
    const [routeInfo, setRouteInfo] = useState<any>(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);
    const [selectedRide, setSelectedRide] = useState<any>(null);

    const mapRef = useRef<MapView>(null);
    const router = useRouter();
    const directionsService = new DirectionsService();

    // Default static region
    const initialStaticRegion = {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    // Initialize location services
    useEffect(() => {
        const initializeLocation = async () => {
            try {
                await LocationService.requestPermissions();
                const location = await LocationService.getCurrentLocationWithFallback();
                setUserLocation(location);

                if (!origin) {
                    const address = `Current Location (${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)})`;
                    setOrigin({
                        coordinates: location.coords,
                        address,
                        isCurrentLocation: true
                    });
                }
            } catch (error) {
                console.error('Location initialization error:', error);
                Alert.alert('Location Error', 'Could not access your location. Some features may be limited.');
            }
        };

        initializeLocation();
    }, []);

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
                    durationValue: routeData.duration
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
        // Calculate dynamic pricing based on distance
        const distanceKm = routeData.distance / 1000;
        const baseFare = 3;
        const perKmRate = 1.5;
        const estimatedPrice = baseFare + (distanceKm * perKmRate);

        // Update ride options with dynamic pricing
        console.log('Updated estimates for', distanceKm.toFixed(1), 'km route');
    };

    const handleLocationSelect = (type: 'origin' | 'destination', location: LocationData) => {
        if (type === 'origin') {
            setOrigin(location);
        } else {
            setDestination(location);
        }
    };

    const handleRideSelect = (ride: any, customPrice: string) => {
        setSelectedRide({ ...ride, customPrice });
    };

    const handleConfirmRide = () => {
        if (!origin || !destination || !selectedRide) {
            Alert.alert('Missing Information', 'Please select pickup, destination, and ride type');
            return;
        }

        Alert.alert(
            'Confirm Ride',
            `Confirm ${selectedRide.type} from ${origin.address} to ${destination.address}`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Confirm', onPress: processRideConfirmation }
            ]
        );
    };

    const processRideConfirmation = () => {
        // Ride processing logic
        Alert.alert('Ride Requested', 'Finding nearby drivers...');

        setTimeout(() => {
            Alert.alert('Driver Found', 'Your driver will arrive in 5 minutes');
        }, 3000);
    };

    const handleLocationUpdate = (location: any) => {
        setUserLocation(location);

        // Update origin if it's set to current location
        if (origin?.isCurrentLocation) {
            const address = `Current Location (${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)})`;
            setOrigin({
                coordinates: location.coords,
                address,
                isCurrentLocation: true
            });
        }
    };

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

    return (
        <SafeAreaView className="flex-1 bg-gray-100">
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

            <Header
                onMenuPress={() => setIsSidebarVisible(true)}
                onNotificationPress={() => console.log('Notifications pressed')}
            />

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
                onRideSelect={handleRideSelect}
                onConfirmRide={handleConfirmRide}
                onLocationSelect={handleLocationSelect}
                userLocation={userLocation}
            />

            <Sidebar
                isVisible={isSidebarVisible}
                onClose={() => setIsSidebarVisible(false)}
                onProfilePress={() => router.push('/(tabs)/profile')}
                onHistoryPress={() => router.push('/(tabs)/history')}
                onPaymentPress={() => console.log('Payment pressed')}
                onSettingsPress={() => router.push('/(tabs)/settings')}
                onBecomeDriverPress={() => router.push('/(tabs)/become-driver')}
            />
        </SafeAreaView>
    );
}