import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import ExpoMap, { Marker, Polyline, Region } from 'expo-maps';
import * as Location from 'expo-location';

// Safe number validation
const isValidNumber = (value: any): value is number => {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

// Safe coordinate validation
const isValidCoordinate = (coord: any): coord is { latitude: number; longitude: number } => {
    return coord &&
        isValidNumber(coord.latitude) &&
        isValidNumber(coord.longitude) &&
        coord.latitude >= -90 && coord.latitude <= 90 &&
        coord.longitude >= -180 && coord.longitude <= 180;
};

// Convert GeoJSON to coordinates array
const extractCoordinatesFromGeoJSON = (geoJSON: GeoJSON.Feature): { latitude: number; longitude: number }[] => {
    if (geoJSON.geometry.type === 'LineString') {
        return geoJSON.geometry.coordinates.map(([lng, lat]) => ({
            latitude: lat,
            longitude: lng,
        }));
    }
    return [];
};

// Calculate region from coordinates
const calculateRegion = (coordinates: { latitude: number; longitude: number }[]): Region => {
    if (coordinates.length === 0) {
        return {
            latitude: 37.78825,
            longitude: -122.4324,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
    }

    let minLat = coordinates[0].latitude;
    let maxLat = coordinates[0].latitude;
    let minLng = coordinates[0].longitude;
    let maxLng = coordinates[0].longitude;

    coordinates.forEach(coord => {
        minLat = Math.min(minLat, coord.latitude);
        maxLat = Math.max(maxLat, coord.latitude);
        minLng = Math.min(minLng, coord.longitude);
        maxLng = Math.max(maxLng, coord.longitude);
    });

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDelta = Math.max((maxLat - minLat) * 1.2, 0.01);
    const lngDelta = Math.max((maxLng - minLng) * 1.2, 0.01);

    return {
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
    };
};

interface Props {
    mapRef?: React.Ref<ExpoMap>;
    initialRegion?: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    } | null;
    origin?: { latitude: number; longitude: number } | null;
    destination?: { latitude: number; longitude: number } | null;
    routeGeoJSON?: GeoJSON.Feature | null;
    driverToClientRouteGeoJSON?: GeoJSON.Feature | null;
    clientToDestRouteGeoJSON?: GeoJSON.Feature | null;
    driverPickupCoordinates?: { latitude: number; longitude: number } | null;
    driverDestinationCoordinates?: { latitude: number; longitude: number } | null;
    onLocationUpdate?: (location: Location.LocationObject) => void;
    showUserLocation?: boolean;
    children?: React.ReactNode;
}

export const ExpoMapComponent: React.FC<Props> = ({
                                                      mapRef,
                                                      initialRegion,
                                                      origin,
                                                      destination,
                                                      routeGeoJSON,
                                                      driverToClientRouteGeoJSON,
                                                      clientToDestRouteGeoJSON,
                                                      driverPickupCoordinates,
                                                      driverDestinationCoordinates,
                                                      onLocationUpdate,
                                                      showUserLocation = true,
                                                      children
                                                  }) => {
    const [isMapReady, setIsMapReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
    const [region, setRegion] = useState<Region>(() => {
        if (initialRegion && isValidCoordinate(initialRegion)) {
            return initialRegion;
        }
        return {
            latitude: 37.78825,
            longitude: -122.4324,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        };
    });

    // Get user location
    useEffect(() => {
        if (showUserLocation) {
            const getCurrentLocation = async () => {
                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        const location = await Location.getCurrentPositionAsync({});
                        setCurrentLocation(location);
                        onLocationUpdate?.(location);
                    }
                } catch (error) {
                    console.error('Error getting location:', error);
                }
            };

            getCurrentLocation();
        }
    }, [showUserLocation, onLocationUpdate]);

    // Handle camera positioning
    useEffect(() => {
        if (!isMapReady) return;

        setIsLoading(true);

        try {
            const validOrigin = isValidCoordinate(origin) ? origin : null;
            const validDestination = isValidCoordinate(destination) ? destination : null;
            const validDriverPickup = isValidCoordinate(driverPickupCoordinates) ? driverPickupCoordinates : null;
            const validDriverDest = isValidCoordinate(driverDestinationCoordinates) ? driverDestinationCoordinates : null;

            if (driverToClientRouteGeoJSON && validOrigin && validDriverPickup && validDriverDest) {
                // Driver view: fit driver, pickup, and destination
                const coords = [validOrigin, validDriverPickup, validDriverDest];
                const newRegion = calculateRegion(coords);
                setRegion(newRegion);
            } else if (validOrigin && validDestination) {
                // Passenger view: Fit to origin and destination
                const coords = [validOrigin, validDestination];
                const newRegion = calculateRegion(coords);
                setRegion(newRegion);
            } else if (validOrigin) {
                // Center on origin only
                setRegion({
                    latitude: validOrigin.latitude,
                    longitude: validOrigin.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
            } else if (currentLocation) {
                // Use current location
                setRegion({
                    latitude: currentLocation.coords.latitude,
                    longitude: currentLocation.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
            }
        } catch (error) {
            console.error('Camera positioning error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isMapReady, origin, destination, initialRegion, driverToClientRouteGeoJSON, driverPickupCoordinates, driverDestinationCoordinates, currentLocation]);

    const handleMapReady = () => {
        setIsMapReady(true);
    };

    // Extract route coordinates
    const routeCoordinates = routeGeoJSON ? extractCoordinatesFromGeoJSON(routeGeoJSON) : [];
    const driverToClientCoordinates = driverToClientRouteGeoJSON ? extractCoordinatesFromGeoJSON(driverToClientRouteGeoJSON) : [];
    const clientToDestCoordinates = clientToDestRouteGeoJSON ? extractCoordinatesFromGeoJSON(clientToDestRouteGeoJSON) : [];

    return (
        <View style={styles.container}>
            {isLoading && (
                <ActivityIndicator
                    style={styles.loader}
                    size="large"
                    color="#0066cc"
                />
            )}

            <ExpoMap
                ref={mapRef}
                style={styles.map}
                initialRegion={region}
                region={region}
                showsUserLocation={showUserLocation}
                followsUserLocation={false}
                showsMyLocationButton={false}
                onMapReady={handleMapReady}
                mapType="standard"
            >
                {/* Origin Marker */}
                {isValidCoordinate(origin) && (
                    <Marker
                        coordinate={origin}
                        title="Origin"
                        identifier="origin"
                    >
                        <View style={[styles.marker, styles.originMarker]} />
                    </Marker>
                )}

                {/* Destination Marker */}
                {isValidCoordinate(destination) && (
                    <Marker
                        coordinate={destination}
                        title="Destination"
                        identifier="destination"
                    >
                        <View style={[styles.marker, styles.destinationMarker]} />
                    </Marker>
                )}

                {/* Route Polylines */}
                {routeCoordinates.length > 0 && (
                    <Polyline
                        coordinates={routeCoordinates}
                        strokeColor="#007AFF"
                        strokeWidth={4}
                    />
                )}

                {driverToClientCoordinates.length > 0 && (
                    <Polyline
                        coordinates={driverToClientCoordinates}
                        strokeColor="#007BFF"
                        strokeWidth={5}
                    />
                )}

                {clientToDestCoordinates.length > 0 && (
                    <Polyline
                        coordinates={clientToDestCoordinates}
                        strokeColor="#28A745"
                        strokeWidth={5}
                    />
                )}

                {children}
            </ExpoMap>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        flex: 1,
    },
    marker: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: 'white',
    },
    originMarker: {
        backgroundColor: '#00C851',
    },
    destinationMarker: {
        backgroundColor: '#FF4444',
    },
    loader: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -25,
        marginLeft: -25,
        zIndex: 1000,
    },
});