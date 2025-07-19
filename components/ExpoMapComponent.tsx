import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import * as Location from 'expo-location';

// Fix 1: Install GeoJSON types
// Run: npm install --save-dev @types/geojson
// Then import:
import type { Feature, LineString, Geometry } from 'geojson';

// Fix 2: Proper type definitions for map components
type MapProvider = typeof AppleMaps | typeof GoogleMaps;
// Use React.ComponentType to get the component type
type MapViewComponent = React.ComponentType<any>; // We'll use 'any' since expo-maps doesn't export proper types yet

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

// Convert latitude delta to zoom level (approximate)
const deltaToZoom = (latitudeDelta: number) => {
    if (!isValidNumber(latitudeDelta) || latitudeDelta <= 0) return 12;
    return Math.round(Math.log2(360 / latitudeDelta));
};

interface Props {
    mapRef: React.Ref<any>; // Since expo-maps doesn't export proper types
    initialRegion?: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    } | null;
    origin?: { latitude: number; longitude: number } | null;
    destination?: { latitude: number; longitude: number } | null;
    routeGeoJSON?: Feature<Geometry> | null;
    driverToClientRouteGeoJSON?: Feature<Geometry> | null;
    clientToDestRouteGeoJSON?: Feature<Geometry> | null;
    driverPickupCoordinates?: { latitude: number; longitude: number } | null;
    driverDestinationCoordinates?: { latitude: number; longitude: number } | null;
    onLocationUpdate?: (location: Location.LocationObject) => void;
    showUserLocation?: boolean;
    children?: React.ReactNode;
}

// Convert GeoJSON to coordinates array
const extractCoordinatesFromGeoJSON = (geoJSON: Feature<Geometry>): { latitude: number; longitude: number }[] => {
    // Runtime check for LineString geometry type
    if (geoJSON.geometry.type === 'LineString') {
        const lineString = geoJSON.geometry as LineString;
        return lineString.coordinates.map(([lng, lat]) => ({
            latitude: lat,
            longitude: lng,
        }));
    }
    return [];
};

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
    const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);

    // Choose the appropriate map provider based on platform
    const MapProvider: MapProvider = Platform.OS === 'ios' ? AppleMaps : GoogleMaps;
    const MapView = MapProvider.View as MapViewComponent;

    // Handle location permissions and updates
    useEffect(() => {
        if (showUserLocation) {
            const setupLocation = async () => {
                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status === 'granted') {
                        const location = await Location.getCurrentPositionAsync({});
                        setUserLocation(location);
                        onLocationUpdate?.(location);

                        // Set up location watching
                        const subscription = await Location.watchPositionAsync(
                            {
                                accuracy: Location.Accuracy.High,
                                timeInterval: 1000,
                                distanceInterval: 10,
                            },
                            (newLocation) => {
                                setUserLocation(newLocation);
                                onLocationUpdate?.(newLocation);
                            }
                        );

                        return () => {
                            subscription.remove();
                        };
                    }
                } catch (error) {
                    console.error('Location error:', error);
                }
            };

            setupLocation();
        }
    }, [showUserLocation, onLocationUpdate]);

    // Calculate initial camera position
    const getInitialCamera = () => {
        let centerLat = 37.78825;
        let centerLng = -122.4324;
        let zoom = 12;

        if (initialRegion && isValidCoordinate(initialRegion)) {
            centerLat = initialRegion.latitude;
            centerLng = initialRegion.longitude;
            zoom = deltaToZoom(initialRegion.latitudeDelta);
        } else if (origin && isValidCoordinate(origin)) {
            centerLat = origin.latitude;
            centerLng = origin.longitude;
            zoom = 14;
        } else if (userLocation) {
            centerLat = userLocation.coords.latitude;
            centerLng = userLocation.coords.longitude;
            zoom = 14;
        }

        return {
            coordinates: {
                latitude: centerLat,
                longitude: centerLng,
            },
            zoom: zoom,
            bearing: 0,
            tilt: 0,
        };
    };

    // Prepare markers
    const markers: any[] = [];

    if (isValidCoordinate(origin)) {
        markers.push({
            coordinate: origin,
            title: 'Origin',
            identifier: 'origin',
            color: Platform.OS === 'ios' ? '#00C851' : undefined,
            // For Android, you might need to use a different approach for custom colors
        });
    }

    if (isValidCoordinate(destination)) {
        markers.push({
            coordinate: destination,
            title: 'Destination',
            identifier: 'destination',
            color: Platform.OS === 'ios' ? '#FF4444' : undefined,
        });
    }

    // Prepare polylines
    const polylines: any[] = [];

    if (routeGeoJSON) {
        const coords = extractCoordinatesFromGeoJSON(routeGeoJSON);
        if (coords.length > 0) {
            polylines.push({
                coordinates: coords,
                strokeColor: '#007AFF',
                strokeWidth: 4,
            });
        }
    }

    if (driverToClientRouteGeoJSON) {
        const coords = extractCoordinatesFromGeoJSON(driverToClientRouteGeoJSON);
        if (coords.length > 0) {
            polylines.push({
                coordinates: coords,
                strokeColor: '#007BFF',
                strokeWidth: 5,
            });
        }
    }

    if (clientToDestRouteGeoJSON) {
        const coords = extractCoordinatesFromGeoJSON(clientToDestRouteGeoJSON);
        if (coords.length > 0) {
            polylines.push({
                coordinates: coords,
                strokeColor: '#28A745',
                strokeWidth: 5,
            });
        }
    }

    const handleMapLoaded = () => {
        setIsMapReady(true);
        setIsLoading(false);
    };

    return (
        <View style={styles.container}>
            {isLoading && (
                <ActivityIndicator
                    style={styles.loader}
                    size="large"
                    color="#0066cc"
                />
            )}

            <MapView
                ref={mapRef}
                style={styles.map}
                initialCamera={getInitialCamera()}
                markers={markers}
                polylines={polylines}
                showUserLocation={showUserLocation}
                userLocation={userLocation ? {
                    coordinates: {
                        latitude: userLocation.coords.latitude,
                        longitude: userLocation.coords.longitude,
                    },
                    accuracy: userLocation.coords.accuracy || 0,
                    course: userLocation.coords.heading || 0,
                } : undefined}
                mapProperties={{
                    mapType: Platform.OS === 'ios' ? 'standard' : 'normal',
                }}
                mapUiSettings={{
                    compassEnabled: true,
                    myLocationButtonEnabled: showUserLocation,
                    rotateGesturesEnabled: true,
                    scrollGesturesEnabled: true,
                    tiltGesturesEnabled: true,
                    zoomControlsEnabled: Platform.OS === 'android',
                    zoomGesturesEnabled: true,
                }}
                onMapLoaded={handleMapLoaded}
                onCameraMove={(event: any) => {
                    // Handle camera movement if needed
                    console.log('Camera moved:', event);
                }}
                onClick={(event: any) => {
                    // Handle map clicks if needed
                    console.log('Map clicked:', event);
                }}
            >
                {children}
            </MapView>
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
    loader: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -25,
        marginLeft: -25,
        zIndex: 1000,
    },
});

// Re-export with the old name for backward compatibility during migration
export const MapboxMap = ExpoMapComponent;