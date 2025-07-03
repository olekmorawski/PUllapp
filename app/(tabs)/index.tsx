import React, { useState, useRef, useEffect, useCallback } from 'react';
import { StatusBar, Alert, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { BottomSheet } from '@/components/BottomSheet/BottomSheet';
import { MapboxMap } from '@/components/MapboxMap';
import Mapbox from '@rnmapbox/maps';

import { DirectionsService } from '@/components/DirectionsService';
import {useLocation} from "@/hooks/Location/useLocation";

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

    // Define sample ride options
    const sampleRideOptions = [
        { id: 1, type: 'Standard', time: '5 min', suggestedRange: '$10-12', icon: 'car' },
        { id: 2, type: 'XL', time: '8 min', suggestedRange: '$15-18', icon: 'suv' },
        { id: 3, type: 'Luxury', time: '6 min', suggestedRange: '$25-30', icon: 'luxury_car' },
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
        Alert.alert('Ride Requested', 'Finding nearby drivers...');

        setTimeout(() => {
            Alert.alert('Driver Found', 'Your driver will arrive in 5 minutes');
        }, 3000);
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

    const handleMenuPress = () => setIsSidebarVisible(true);
    const handleNotificationPress = () => console.log('Notifications pressed');
    const handleProfilePress = () => router.push('/(tabs)/profile');
    const handleHistoryPress = () => router.push('/(tabs)/history');
    const handlePaymentPress = () => console.log('Payment pressed');
    const handleSettingsPress = () => router.push('/(tabs)/settings');
    const handleBecomeDriverPress = () => router.push('/(tabs)/become-driver');

    return (
        <SafeAreaView className="flex-1 bg-gray-100" edges={['right', 'top', 'left', 'bottom']}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

            <Header onMenuPress={handleMenuPress} onNotificationPress={handleNotificationPress} />

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
