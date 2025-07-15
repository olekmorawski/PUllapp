import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Alert } from 'react-native'; // StyleSheet removed
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Mapbox from '@rnmapbox/maps';
import { MapboxMap } from '@/components/MapboxMap';
import { DirectionsService } from '@/components/DirectionsService';
import { useLocation } from "@/hooks/Location/useLocation";
import { useSocket } from '@/hooks/useSocket';

const MOCK_DRIVER_START_LAT = 37.79000;
const MOCK_DRIVER_START_LNG = -122.4324;

const TripScreen = () => {
    const params = useLocalSearchParams();
    const router = useRouter();
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

    const [userPickupCoords, setUserPickupCoords] = useState<Mapbox.Coordinates | null>(null);
    const [driverCoords, setDriverCoords] = useState<Mapbox.Coordinates>([MOCK_DRIVER_START_LNG, MOCK_DRIVER_START_LAT]);
    const [routeToPickupGeoJSON, setRouteToPickupGeoJSON] = useState<GeoJSON.Feature | null>(null);
    const [isLoadingRoute, setIsLoadingRoute] = useState(false);
    const [currentLegIndex, setCurrentLegIndex] = useState(0);
    const [tripStatus, setTripStatus] = useState("Approaching Pickup");

    const { location: currentUserLocation } = useLocation({ autoStart: true });

    useEffect(() => {
        const geocodePickup = async () => {
            if (pickupAddress === 'Current Location' && currentUserLocation) {
                setUserPickupCoords([currentUserLocation.coords.longitude, currentUserLocation.coords.latitude]);
            } else if (typeof pickupAddress === 'string') {
                try {
                    if (pickupAddress.includes(',')) {
                        const parts = pickupAddress.split(',');
                        const lat = parseFloat(parts[0]);
                        const lon = parseFloat(parts[1]);
                        if (!isNaN(lat) && !isNaN(lon)) {
                            setUserPickupCoords([lon, lat]);
                            return;
                        }
                    }
                    console.warn("Cannot determine pickup coordinates for address:", pickupAddress);
                    if (currentUserLocation) {
                         setUserPickupCoords([currentUserLocation.coords.longitude, currentUserLocation.coords.latitude]);
                    } else {
                        setUserPickupCoords([-122.4324, 37.78825]);
                        Alert.alert("Location Issue", "Could not determine exact pickup coordinates. Using a default location.");
                    }
                } catch (e) {
                    console.error("Error processing pickupAddress:", e);
                    if (currentUserLocation) {
                         setUserPickupCoords([currentUserLocation.coords.longitude, currentUserLocation.coords.latitude]);
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
                        setDriverCoords(routeData.geoJSON.geometry.coordinates[0] as Mapbox.Coordinates);
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

        let waypoints: Mapbox.Coordinates[] = [];
        const geometry = routeToPickupGeoJSON.geometry;

        if (geometry.type === 'LineString') {
            waypoints = geometry.coordinates as Mapbox.Coordinates[];
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

    // Marker styles are tricky with Tailwind directly on Mapbox child components.
    // Often, you pass a styled <View> to the annotation.
    // Here, we define class strings and apply them.
    const markerBaseClasses = "w-[30px] h-[30px] rounded-full justify-center items-center border-2 border-white shadow-md";
    const pickupMarkerClasses = `${markerBaseClasses} bg-blue-500`; // bg-opacity-90 might not work directly, check NativeWind docs if needed
    const driverMarkerClasses = `${markerBaseClasses} bg-red-500`;
    const markerTextClasses = "text-white font-bold text-xs";

    return (
        // styles.container -> className
        <SafeAreaView className="flex-1 bg-white">
            <Stack.Screen options={{ title: tripStatus }} />
            {/* styles.mapContainer -> className */}
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

            {/* styles.infoPanel -> className */}
            <View className="flex-[0.3] p-4 bg-gray-50 border-t border-gray-200">
                {/* styles.infoTitle -> className */}
                <Text className="text-lg font-bold mb-2.5">{tripStatus}</Text>
                {/* styles.infoText -> className */}
                <Text className="text-base mb-2">Driver: {driverName || 'N/A'} ({driverVehicle || 'N/A'})</Text>
                <Text className="text-base mb-2">To: {pickupAddress || 'N/A'}</Text>
                <Text className="text-base mb-2">Est. Price: ${typeof price === 'string' ? parseFloat(price).toFixed(2) : 'N/A'}</Text>
                {isLoadingRoute && <Text className="text-base mb-2">Updating route...</Text>}
            </View>
        </SafeAreaView>
    );
};

// StyleSheet.create({...}) block removed

export default TripScreen;
