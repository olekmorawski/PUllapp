import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text } from 'react-native';
import MapboxGL from "@rnmapbox/maps";
import * as Location from 'expo-location';
import { MAPBOX_ACCESS_TOKEN } from "../constants/Tokens";

MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

// Helper to convert latitude/longitude delta to zoom level (approximate)
const deltaToZoom = (latitudeDelta: number) => {
    return Math.round(Math.log2(360 / latitudeDelta));
};

interface Props {
    mapRef: React.RefObject<MapboxGL.MapView | null>;
    initialRegion?: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    className?: string;
    origin?: { latitude: number; longitude: number } | null;
    destination?: { latitude: number; longitude: number } | null;
    routeCoordinates?: Array<{ latitude: number; longitude: number }>;
    onLocationUpdate?: (location: Location.LocationObject) => void;
    showUserLocation?: boolean;
}

export const Map = ({
                        mapRef,
                        initialRegion,
                        className,
                        origin,
                        destination,
                        routeCoordinates = [],
                        onLocationUpdate,
                        showUserLocation = true
                    }: Props) => {
    const cameraRef = useRef<MapboxGL.Camera | null>(null);
    const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

    // Request location permissions
    useEffect(() => {
        let subscription: Location.LocationSubscription | undefined;

        const startLocationTracking = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.log('Location permission denied');
                    return;
                }

                // Get initial location
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                onLocationUpdate?.(location);

                // Continuous updates if needed
                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 4000,
                        distanceInterval: 10,
                    },
                    (newLocation) => {
                        onLocationUpdate?.(newLocation);
                    }
                );
                setLocationSubscription(subscription);
            } catch (error) {
                console.error('Error setting up location tracking:', error);
            }
        };

        if (showUserLocation && onLocationUpdate) {
            startLocationTracking();
        }

        return () => {
            if (subscription) {
                subscription.remove();
            }
        };
    }, [showUserLocation, onLocationUpdate]);

    // Auto-fit map to show route
    useEffect(() => {
        if (mapRef.current && cameraRef.current && routeCoordinates.length > 0) {
            const points: [number, number][] = [];
            if (origin) points.push([origin.longitude, origin.latitude]);
            routeCoordinates.forEach(coord => points.push([coord.longitude, coord.latitude]));
            if (destination) points.push([destination.longitude, destination.latitude]);

            if (points.length > 1) {
                // Calculate proper bounding box
                let minLng = points[0][0], maxLng = points[0][0];
                let minLat = points[0][1], maxLat = points[0][1];

                points.forEach(p => {
                    minLng = Math.min(minLng, p[0]);
                    maxLng = Math.max(maxLng, p[0]);
                    minLat = Math.min(minLat, p[1]);
                    maxLat = Math.max(maxLat, p[1]);
                });

                cameraRef.current.fitBounds(
                    [maxLng, maxLat], // northeast
                    [minLng, minLat], // southwest
                    [50, 50, 50, 50], // padding
                    1000 // animation duration
                );
            } else if (points.length === 1) {
                cameraRef.current.setCamera({
                    centerCoordinate: points[0],
                    zoomLevel: 14,
                    animationDuration: 1000,
                });
            }
        }
    }, [routeCoordinates, origin, destination, mapRef, cameraRef]);

    const handleMarkerPress = useCallback((markerId: string, feature: any) => {
        console.log(`${markerId} marker pressed. Title: ${feature.properties?.title}`);
    }, []);

    // Prepare route GeoJSON
    const routeGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> | null = routeCoordinates.length > 0 ? {
        type: 'FeatureCollection',
        features: [
            {
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: routeCoordinates.map(c => [c.longitude, c.latitude]),
                },
                properties: {}
            },
        ],
    } : null;

    const initialCameraSettings = initialRegion ? {
        centerCoordinate: [initialRegion.longitude, initialRegion.latitude] as [number, number],
        zoomLevel: deltaToZoom(initialRegion.latitudeDelta),
    } : {
        zoomLevel: 2,
        centerCoordinate: [0, 0] as [number, number]
    };

    return (
        <MapboxGL.MapView
            ref={mapRef}
            styleURL={MapboxGL.StyleURL.Street}
            style={className ? { flex: 1, width: '100%', height: '100%' } : { flex: 1 }}
            logoEnabled={true}
            attributionEnabled={true}
        >
            <MapboxGL.Camera
                ref={cameraRef}
                defaultSettings={initialCameraSettings}
                animationMode={'flyTo'}
                animationDuration={1200}
            />

            {showUserLocation && (
                <MapboxGL.UserLocation
                    visible={true}
                    onUpdate={onLocationUpdate}
                    showsUserHeadingIndicator={true}
                />
            )}

            {/* Origin Marker - FIXED: Added children */}
            {origin && (
                <MapboxGL.PointAnnotation
                    id="origin-annotation"
                    coordinate={[origin.longitude, origin.latitude]}
                    title="Pickup Location"
                    onSelected={(feature) => handleMarkerPress("origin-annotation", feature)}
                >
                    <View style={{
                        width: 30,
                        height: 30,
                        backgroundColor: '#22C55E',
                        borderRadius: 15,
                        borderWidth: 3,
                        borderColor: 'white',
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 3,
                        elevation: 5,
                    }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>A</Text>
                    </View>
                </MapboxGL.PointAnnotation>
            )}

            {/* Destination Marker - FIXED: Added children */}
            {destination && (
                <MapboxGL.PointAnnotation
                    id="destination-annotation"
                    coordinate={[destination.longitude, destination.latitude]}
                    title="Destination"
                    onSelected={(feature) => handleMarkerPress("destination-annotation", feature)}
                >
                    <View style={{
                        width: 30,
                        height: 30,
                        backgroundColor: '#EF4444',
                        borderRadius: 15,
                        borderWidth: 3,
                        borderColor: 'white',
                        justifyContent: 'center',
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.3,
                        shadowRadius: 3,
                        elevation: 5,
                    }}>
                        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>B</Text>
                    </View>
                </MapboxGL.PointAnnotation>
            )}

            {/* Route Polyline */}
            {routeGeoJSON && (
                <MapboxGL.ShapeSource id="routeSource" shape={routeGeoJSON}>
                    <MapboxGL.LineLayer
                        id="routeLine"
                        style={{
                            lineColor: "#007AFF",
                            lineWidth: 4,
                        }}
                    />
                </MapboxGL.ShapeSource>
            )}
        </MapboxGL.MapView>
    );
};