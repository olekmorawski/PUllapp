import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Alert } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import { MapboxMap } from '@/components/MapboxMap';
import { DirectionsService } from '@/components/DirectionsService';
import { useLocation } from "@/hooks/Location/useLocation";
import { useSocket } from '@/hooks/useSocket';

const MOCK_DRIVER_START_LAT = 37.79000;
const MOCK_DRIVER_START_LNG = -122.4324;

const TripScreen = () => {

    const isValidNumber = (value: any): value is number => {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    };

    const isValidCoordinateObject = (coord: any): coord is { latitude: number; longitude: number } => {
        return coord &&
            isValidNumber(coord.latitude) &&
            isValidNumber(coord.longitude) &&
            coord.latitude >= -90 && coord.latitude <= 90 &&
            coord.longitude >= -180 && coord.longitude <= 180;
    };

    const params = useLocalSearchParams();
    const socket = useSocket();
    const {
        price,
        pickupAddress,
        destinationAddress,
        driverName,
        driverVehicle,
    } = params;

    const mapRef = useRef<Mapbox.MapView>(null);
    const directionsService = new DirectionsService();

    const [userPickupCoords, setUserPickupCoords] = useState<[number, number] | null>(null);
    const [driverCoords, setDriverCoords] = useState<[number, number]>([MOCK_DRIVER_START_LNG, MOCK_DRIVER_START_LAT]);
    const [routeToPickupGeoJSON, setRouteToPickupGeoJSON] = useState<GeoJSON.Feature | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);
    const [currentLegIndex, setCurrentLegIndex] = useState(0);
    const [tripStatus, setTripStatus] = useState("Approaching Pickup");

    const { location: currentUserLocation } = useLocation({ autoStart: true });

    useEffect(() => {
        const geocodePickup = async () => {
            if (pickupAddress === 'Current Location' && currentUserLocation && isValidCoordinateObject(currentUserLocation.coords)) {
                setUserPickupCoords([currentUserLocation.coords.longitude, currentUserLocation.coords.latitude]);
            } else if (typeof pickupAddress === 'string') {
                try {
                    if (pickupAddress.includes(',')) {
                        const parts = pickupAddress.split(',');
                        const lat = parseFloat(parts[0]);
                        const lon = parseFloat(parts[1]);
                        if (isValidNumber(lat) && isValidNumber(lon)) {
                            setUserPickupCoords([lon, lat]);
                            return;
                        }
                    }
                    console.warn("Cannot determine pickup coordinates for address:", pickupAddress);

                    // Use current location if available and valid
                    if (currentUserLocation && isValidCoordinateObject(currentUserLocation.coords)) {
                        setUserPickupCoords([currentUserLocation.coords.longitude, currentUserLocation.coords.latitude]);
                    } else {
                        // Safe fallback coordinates (San Francisco)
                        setUserPickupCoords([-122.4324, 37.78825]);
                        Alert.alert("Location Issue", "Could not determine exact pickup coordinates. Using a default location.");
                    }
                } catch (e) {
                    console.error("Error processing pickupAddress:", e);
                    if (currentUserLocation && isValidCoordinateObject(currentUserLocation.coords)) {
                        setUserPickupCoords([currentUserLocation.coords.longitude, currentUserLocation.coords.latitude]);
                    } else {
                        setUserPickupCoords([-122.4324, 37.78825]);
                    }
                }
            }
        };
        geocodePickup();
    }, [pickupAddress, currentUserLocation]);

    useEffect(() => {
        const initialDriverLocationForRoute = { longitude: MOCK_DRIVER_START_LNG, latitude: MOCK_DRIVER_START_LAT };

        if (initialDriverLocationForRoute && userPickupCoords) {
            const calculateRoute = async () => {
                setIsLoadingRoute(true);
                setRouteToPickupGeoJSON(null);
                try {
                    const routeData = await directionsService.getDirections(
                        initialDriverLocationForRoute,
                        { longitude: userPickupCoords[0], latitude: userPickupCoords[1] }
                    );
                    setRouteToPickupGeoJSON(routeData.geoJSON);
                    if (routeData.geoJSON?.geometry?.type === 'LineString' && routeData.geoJSON.geometry.coordinates.length > 0) {
                        setDriverCoords(routeData.geoJSON.geometry.coordinates[0] as [number, number]);
                        setCurrentLegIndex(0);
                    } else {
                        setDriverCoords([MOCK_DRIVER_START_LNG, MOCK_DRIVER_START_LAT]);
                    }
                } catch (error: any) {
                    Alert.alert('Route Error', error.message || 'Failed to calculate route for driver to pickup.');
                } finally {
                    setIsLoadingRoute(false);
                }
            };
            calculateRoute();
        }
    }, [userPickupCoords]);

    useEffect(() => {
        if (!routeToPickupGeoJSON || !userPickupCoords || !socket) return;

        let waypoints: [number, number][] = [];
        const geometry = routeToPickupGeoJSON.geometry;

        if (geometry.type === 'LineString') {
            waypoints = geometry.coordinates as [number, number][];
        }

        if (waypoints.length === 0 || currentLegIndex >= waypoints.length - 1) {
            return;
        }

        const moveInterval = setInterval(() => {
            setCurrentLegIndex(prevIndex => {
                const nextIndex = prevIndex + 1;

                if (nextIndex < waypoints.length) {
                    const nextCoord = waypoints[nextIndex];
                    setDriverCoords(nextCoord);

                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(
                            JSON.stringify({
                                type: 'locationUpdate',
                                lat: nextCoord[1],
                                lng: nextCoord[0],
                                driverName: driverName || "Driver"
                            })
                        );
                    }

                    return nextIndex;
                } else {
                    clearInterval(moveInterval);
                    setDriverCoords(userPickupCoords);
                    setTripStatus("Driver Arrived");
                    Alert.alert("Driver Arrived", `${driverName || 'Your driver'} has arrived.`);
                    return prevIndex;
                }
            });
        }, 2000); // Move every 2 seconds

        return () => clearInterval(moveInterval);
    }, [routeToPickupGeoJSON, userPickupCoords, currentLegIndex, socket]);

    const initialMapRegion = currentUserLocation?.coords ? {
        latitude: currentUserLocation.coords.latitude,
        longitude: currentUserLocation.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.01,
    } : {
        latitude: MOCK_DRIVER_START_LAT,
        longitude: MOCK_DRIVER_START_LNG,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    const markerBaseClasses = "w-[30px] h-[30px] rounded-full justify-center items-center border-2 border-white shadow-md";
    const pickupMarkerClasses = `${markerBaseClasses} bg-blue-500`;
    const driverMarkerClasses = `${markerBaseClasses} bg-red-500`;
    const markerTextClasses = "text-white font-bold text-xs";

    return (
        <SafeAreaView className="flex-1 bg-white">
            <Stack.Screen options={{ title: tripStatus }} />
            <View className="flex-[0.7]">
                <MapboxMap
                    mapRef={mapRef}
                    initialRegion={initialMapRegion}
                    origin={driverCoords ? { longitude: driverCoords[0], latitude: driverCoords[1]} : undefined}
                    destination={userPickupCoords ? { longitude: userPickupCoords[0], latitude: userPickupCoords[1]} : undefined}
                    routeGeoJSON={routeToPickupGeoJSON}
                    showUserLocation={true}
                >
                    {userPickupCoords && (
                        <Mapbox.PointAnnotation
                            id="pickupPoint"
                            coordinate={userPickupCoords}
                        >
                            <View className={pickupMarkerClasses}>
                                <Text className={markerTextClasses}>P</Text>
                            </View>
                        </Mapbox.PointAnnotation>
                    )}
                    {driverCoords && (
                        <Mapbox.PointAnnotation
                            id="driverLocation"
                            coordinate={driverCoords}
                        >
                            <View className={driverMarkerClasses}>
                                <Text className={markerTextClasses}>D</Text>
                            </View>
                        </Mapbox.PointAnnotation>
                    )}
                </MapboxMap>
            </View>

            <View className="flex-[0.3] p-4 bg-gray-50 border-t border-gray-200">
                <Text className="text-lg font-bold mb-2.5">{tripStatus}</Text>
                <Text className="text-base mb-2">Driver: {driverName || 'N/A'} ({driverVehicle || 'N/A'})</Text>
                <Text className="text-base mb-2">To: {pickupAddress || 'N/A'}</Text>
                <Text className="text-base mb-2">Est. Price: ${typeof price === 'string' ? parseFloat(price).toFixed(2) : 'N/A'}</Text>
                {isLoadingRoute && <Text className="text-base mb-2">Updating route...</Text>}
            </View>
        </SafeAreaView>
    );
};

export default TripScreen;