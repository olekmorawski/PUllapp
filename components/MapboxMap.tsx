import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import Mapbox from '@rnmapbox/maps'; // Changed import
import { MAPBOX_ACCESS_TOKEN } from '@/constants/Tokens';
// import * as Location from 'expo-location'; // This import is not used in this file

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

// Convert latitude delta to zoom level
const deltaToZoom = (latitudeDelta: number) => {
    return Math.round(Math.log2(360 / latitudeDelta));
};

interface Props {
    mapRef: React.Ref<Mapbox.MapView>; // Changed to React.Ref for more flexibility
    initialRegion?: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    origin?: { latitude: number; longitude: number } | null;
    destination?: { latitude: number; longitude: number } | null;
    routeGeoJSON?: GeoJSON.Feature | null; // For passenger or single route
    driverToClientRouteGeoJSON?: GeoJSON.Feature | null; // Driver to client
    clientToDestRouteGeoJSON?: GeoJSON.Feature | null; // Client to destination
    driverPickupCoordinates?: { latitude: number; longitude: number } | null;
    driverDestinationCoordinates?: { latitude: number; longitude: number } | null;
    onLocationUpdate?: (location: Mapbox.Location) => void; // Assuming Mapbox.Location is correct
    showUserLocation?: boolean;
}

export const MapboxMap: React.FC<Props> = ({
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
                                               showUserLocation = true
                                           }) => {
    const cameraRef = useRef<Mapbox.Camera>(null); // Changed type
    const [isMapReady, setIsMapReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Handle camera positioning
    useEffect(() => {
        if (!isMapReady || !cameraRef.current) return;

        const fitToCoordinates = async () => {
            setIsLoading(true);

            try {
                if (driverToClientRouteGeoJSON && driverPickupCoordinates && driverDestinationCoordinates && origin) {
                    // Driver view: fit driver, pickup, and destination
                    // Assuming 'origin' prop is the driver's current location in this context
                     cameraRef.current?.fitBounds(
                        [
                            Math.min(origin.longitude, driverPickupCoordinates.longitude, driverDestinationCoordinates.longitude),
                            Math.min(origin.latitude, driverPickupCoordinates.latitude, driverDestinationCoordinates.latitude)
                        ],
                        [
                            Math.max(origin.longitude, driverPickupCoordinates.longitude, driverDestinationCoordinates.longitude),
                            Math.max(origin.latitude, driverPickupCoordinates.latitude, driverDestinationCoordinates.latitude)
                        ],
                        [60, 50, 100, 50], // Padding: top, right, bottom, left
                        1000
                    );
                } else if (origin && destination) {
                    // Passenger view: Fit to origin and destination
                    cameraRef.current?.fitBounds(
                        [origin.longitude, origin.latitude],
                        [destination.longitude, destination.latitude],
                        [50, 50, 50, 50],
                        1000
                    );
                } else if (origin) {
                    // Center on origin (generic)
                    cameraRef.current?.setCamera({
                        centerCoordinate: [origin.longitude, origin.latitude],
                        zoomLevel: 14,
                        animationDuration: 1000
                    });
                } else if (initialRegion) {
                    // Use initial region
                    cameraRef.current?.setCamera({
                        centerCoordinate: [initialRegion.longitude, initialRegion.latitude],
                        zoomLevel: deltaToZoom(initialRegion.latitudeDelta),
                        animationDuration: 1000
                    });
                }
            } catch (error) {
                console.error('Camera positioning error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fitToCoordinates();
    }, [isMapReady, origin, destination, initialRegion]);

    const handleMapLoaded = () => {
        setIsMapReady(true);
    };

    // Create styles
    const containerStyle = StyleSheet.create({
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

    const routeLineStyle = { // Default/Passenger route
        lineColor: '#007AFF', // Blue
        lineWidth: 4,
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
        lineOpacity: 0.8
    };

    const driverToClientRouteStyle = {
        lineColor: '#007BFF', // A distinct blue
        lineWidth: 5,
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
        lineOpacity: 0.9
    };

    const clientToDestRouteStyle = {
        lineColor: '#28A745', // Green
        lineWidth: 5,
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
        lineOpacity: 0.9
    };

    return (
        <View style={containerStyle.container}>
            {isLoading && (
                <ActivityIndicator
                    style={containerStyle.loader}
                    size="large"
                    color="#0066cc"
                />
            )}

            <Mapbox.MapView  // Changed component
                ref={mapRef}
                style={containerStyle.map}
                logoEnabled={true}
                attributionEnabled={true}
                onDidFinishLoadingMap={handleMapLoaded}
            >
                {/* Add key to Camera */}
                <Mapbox.Camera key="camera" ref={cameraRef} />

                {/* Add key to UserLocation */}
                {showUserLocation && (
                    <Mapbox.UserLocation
                        key="user-location"
                        visible={true}
                        showsUserHeadingIndicator={true}
                        onUpdate={onLocationUpdate} // Assuming Mapbox.Location is correct
                    />
                )}

                {/* Add key to PointAnnotation */}
                {origin && (
                    <Mapbox.PointAnnotation  // Changed component
                        key={`origin-${origin.latitude}-${origin.longitude}`}
                        id="origin"
                        coordinate={[origin.longitude, origin.latitude]}
                    >
                        <View style={[containerStyle.marker, containerStyle.originMarker]} />
                    </Mapbox.PointAnnotation>
                )}

                {/* Add key to PointAnnotation */}
                {destination && (
                    <Mapbox.PointAnnotation  // Changed component
                        key={`destination-${destination.latitude}-${destination.longitude}`}
                        id="destination"
                        coordinate={[destination.longitude, destination.latitude]}
                    >
                        <View style={[containerStyle.marker, containerStyle.destinationMarker]} />
                    </Mapbox.PointAnnotation>
                )}

                {/* Add key to ShapeSource */}
                {routeGeoJSON && (
                    <Mapbox.ShapeSource  // Changed component
                        key="route-source"
                        id="routeSource"
                        shape={routeGeoJSON}
                    >
                        <Mapbox.LineLayer
                            id="routeLayer"
                            style={routeLineStyle}
                        />
                    </Mapbox.ShapeSource>
                )}

                {/* Driver to Client Route */}
                {driverToClientRouteGeoJSON && (
                    <Mapbox.ShapeSource
                        key="driverToClientRouteSource"
                        id="driverToClientRouteSource"
                        shape={driverToClientRouteGeoJSON}
                    >
                        <Mapbox.LineLayer
                            id="driverToClientRouteLayer"
                            style={driverToClientRouteStyle}
                        />
                    </Mapbox.ShapeSource>
                )}

                {/* Client to Destination Route */}
                {clientToDestRouteGeoJSON && (
                    <Mapbox.ShapeSource
                        key="clientToDestRouteSource"
                        id="clientToDestRouteSource"
                        shape={clientToDestRouteGeoJSON}
                    >
                        <Mapbox.LineLayer
                            id="clientToDestRouteLayer"
                            style={clientToDestRouteStyle}
                        />
                    </Mapbox.ShapeSource>
                )}
            </Mapbox.MapView>
        </View>
    );
};