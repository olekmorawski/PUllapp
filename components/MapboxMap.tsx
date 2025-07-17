import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '@/constants/Tokens';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

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

// Convert latitude delta to zoom level
const deltaToZoom = (latitudeDelta: number) => {
    if (!isValidNumber(latitudeDelta) || latitudeDelta <= 0) return 12;
    return Math.round(Math.log2(360 / latitudeDelta));
};

interface Props {
    mapRef: React.Ref<Mapbox.MapView>;
    initialRegion?: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    origin?: { latitude: number; longitude: number } | null;
    destination?: { latitude: number; longitude: number } | null;
    routeGeoJSON?: GeoJSON.Feature | null;
    driverToClientRouteGeoJSON?: GeoJSON.Feature | null;
    clientToDestRouteGeoJSON?: GeoJSON.Feature | null;
    driverPickupCoordinates?: { latitude: number; longitude: number } | null;
    driverDestinationCoordinates?: { latitude: number; longitude: number } | null;
    onLocationUpdate?: (location: Mapbox.Location) => void;
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
    const cameraRef = useRef<Mapbox.Camera>(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Safe fallback coordinates
    const defaultRegion = {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    // Handle camera positioning with safe coordinate validation
    useEffect(() => {
        if (!isMapReady || !cameraRef.current) return;

        const fitToCoordinates = async () => {
            setIsLoading(true);

            try {
                // Validate all coordinates before using them
                const validOrigin = isValidCoordinate(origin) ? origin : null;
                const validDestination = isValidCoordinate(destination) ? destination : null;
                const validDriverPickup = isValidCoordinate(driverPickupCoordinates) ? driverPickupCoordinates : null;
                const validDriverDest = isValidCoordinate(driverDestinationCoordinates) ? driverDestinationCoordinates : null;

                if (driverToClientRouteGeoJSON && validOrigin && validDriverPickup && validDriverDest) {
                    // Driver view: fit driver, pickup, and destination
                    const coords = [validOrigin, validDriverPickup, validDriverDest];
                    const lngs = coords.map(c => c.longitude);
                    const lats = coords.map(c => c.latitude);

                    cameraRef.current?.fitBounds(
                        [Math.min(...lngs), Math.min(...lats)],
                        [Math.max(...lngs), Math.max(...lats)],
                        [60, 50, 100, 50], // Padding: top, right, bottom, left
                        1000
                    );
                } else if (validOrigin && validDestination) {
                    // Passenger view: Fit to origin and destination
                    cameraRef.current?.fitBounds(
                        [validOrigin.longitude, validOrigin.latitude],
                        [validDestination.longitude, validDestination.latitude],
                        [50, 50, 50, 50],
                        1000
                    );
                } else if (validOrigin) {
                    // Center on origin only
                    cameraRef.current?.setCamera({
                        centerCoordinate: [validOrigin.longitude, validOrigin.latitude],
                        zoomLevel: 14,
                        animationDuration: 1000
                    });
                } else if (initialRegion && isValidCoordinate(initialRegion)) {
                    // Use initial region with validation
                    const zoomLevel = deltaToZoom(initialRegion.latitudeDelta);
                    cameraRef.current?.setCamera({
                        centerCoordinate: [initialRegion.longitude, initialRegion.latitude],
                        zoomLevel: zoomLevel,
                        animationDuration: 1000
                    });
                } else {
                    // Fallback to default region
                    cameraRef.current?.setCamera({
                        centerCoordinate: [defaultRegion.longitude, defaultRegion.latitude],
                        zoomLevel: deltaToZoom(defaultRegion.latitudeDelta),
                        animationDuration: 1000
                    });
                }
            } catch (error) {
                console.error('Camera positioning error:', error);
                // Fallback to default position
                try {
                    cameraRef.current?.setCamera({
                        centerCoordinate: [defaultRegion.longitude, defaultRegion.latitude],
                        zoomLevel: 12,
                        animationDuration: 1000
                    });
                } catch (fallbackError) {
                    console.error('Fallback camera positioning failed:', fallbackError);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fitToCoordinates();
    }, [isMapReady, origin, destination, initialRegion, driverToClientRouteGeoJSON, driverPickupCoordinates, driverDestinationCoordinates]);

    const handleMapLoaded = () => {
        setIsMapReady(true);
    };

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

    const routeLineStyle = {
        lineColor: '#007AFF',
        lineWidth: 4,
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
        lineOpacity: 0.8
    };

    const driverToClientRouteStyle = {
        lineColor: '#007BFF',
        lineWidth: 5,
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
        lineOpacity: 0.9
    };

    const clientToDestRouteStyle = {
        lineColor: '#28A745',
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

            <Mapbox.MapView
                ref={mapRef}
                style={containerStyle.map}
                logoEnabled={true}
                attributionEnabled={true}
                onDidFinishLoadingMap={handleMapLoaded}
            >
                <Mapbox.Camera key="camera" ref={cameraRef} />

                {showUserLocation && (
                    <Mapbox.UserLocation
                        key="user-location"
                        visible={true}
                        showsUserHeadingIndicator={true}
                        onUpdate={onLocationUpdate}
                    />
                )}

                {/* Only render markers with valid coordinates */}
                {isValidCoordinate(origin) && (
                    <Mapbox.PointAnnotation
                        key={`origin-${origin.latitude}-${origin.longitude}`}
                        id="origin"
                        coordinate={[origin.longitude, origin.latitude]}
                    >
                        <View style={[containerStyle.marker, containerStyle.originMarker]} />
                    </Mapbox.PointAnnotation>
                )}

                {isValidCoordinate(destination) && (
                    <Mapbox.PointAnnotation
                        key={`destination-${destination.latitude}-${destination.longitude}`}
                        id="destination"
                        coordinate={[destination.longitude, destination.latitude]}
                    >
                        <View style={[containerStyle.marker, containerStyle.destinationMarker]} />
                    </Mapbox.PointAnnotation>
                )}

                {/* Route layers with validation */}
                {routeGeoJSON && (
                    <Mapbox.ShapeSource
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