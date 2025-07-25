// components/DriverNavigation.tsx - Fixed Mapbox warnings
import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { NavigationCoordinates } from '@/services/OSRMNavigationService';
import * as Location from 'expo-location';

interface MapboxNavigationProps {
    mapRef?: React.Ref<Mapbox.MapView>;
    cameraRef?: React.Ref<Mapbox.Camera>;
    initialRegion?: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    routeGeoJSON?: GeoJSON.Feature | null;
    currentPosition?: Location.LocationObjectCoords | null;
    currentHeading?: number;
    destination?: NavigationCoordinates;
    cameraConfig?: {
        centerCoordinate: [number, number];
        zoomLevel: number;
        pitch: number;
        heading: number;
        animationDuration?: number;
    } | null;
    onLocationUpdate?: (location: Mapbox.Location) => void;
    showUserLocation?: boolean;
    style?: any;
    children?: React.ReactNode;
}

export const MapboxNavigationMap: React.FC<MapboxNavigationProps> = ({
                                                                         mapRef,
                                                                         cameraRef,
                                                                         initialRegion,
                                                                         routeGeoJSON,
                                                                         currentPosition,
                                                                         currentHeading = 0,
                                                                         destination,
                                                                         cameraConfig,
                                                                         onLocationUpdate,
                                                                         showUserLocation = true,
                                                                         style,
                                                                         children
                                                                     }) => {
    const [isMapReady, setIsMapReady] = useState(false);

    // Update camera when config changes
    useEffect(() => {
        if (isMapReady && cameraConfig && cameraRef.current) {
            cameraRef.current.setCamera({
                centerCoordinate: cameraConfig.centerCoordinate,
                zoomLevel: cameraConfig.zoomLevel,
                pitch: cameraConfig.pitch,
                heading: cameraConfig.heading,
                animationDuration: cameraConfig.animationDuration || 1000,
            });
        }
    }, [isMapReady, cameraConfig]);

    // Set initial camera position
    useEffect(() => {
        if (isMapReady && initialRegion && cameraRef.current && !cameraConfig) {
            cameraRef.current.setCamera({
                centerCoordinate: [initialRegion.longitude, initialRegion.latitude],
                zoomLevel: 15,
                animationDuration: 1000,
            });
        }
    }, [isMapReady, initialRegion, cameraConfig]);

    const handleMapLoaded = () => {
        console.log('🗺️ Map loaded successfully');
        setIsMapReady(true);
    };

    return (
        <View style={[styles.container, style]}>
            <Mapbox.MapView
                ref={mapRef}
                style={styles.map}
                onDidFinishLoadingMap={handleMapLoaded}
                logoEnabled={false}
                attributionEnabled={false}
                compassEnabled={false}
                scaleBarEnabled={false}
                rotateEnabled={true}
                pitchEnabled={true}
                scrollEnabled={true}
                zoomEnabled={true}
            >
                <Mapbox.Camera
                    ref={cameraRef as React.Ref<Mapbox.Camera>}
                    followUserLocation
                    followUserMode="course"
                />

                {/* User location */}
                {showUserLocation && (
                    <Mapbox.UserLocation
                        visible={true}
                        showsUserHeadingIndicator={true}
                        onUpdate={onLocationUpdate}
                        androidRenderMode="gps"
                    />
                )}

                {/* Route line - Fixed ShapeSource props */}
                {routeGeoJSON && (
                    <Mapbox.ShapeSource
                        id="navigationRouteSource"
                        shape={routeGeoJSON}
                    >
                        {/* Route outline for better visibility */}
                        <Mapbox.LineLayer
                            id="navigationRouteOutlineLayer"
                            style={{
                                lineColor: '#FFFFFF',
                                lineWidth: 8,
                                lineCap: 'round',
                                lineJoin: 'round',
                                lineOpacity: 0.7,
                            }}
                        />
                        {/* Main route line */}
                        <Mapbox.LineLayer
                            id="navigationRouteLayer"
                            style={{
                                lineColor: '#007AFF',
                                lineWidth: 6,
                                lineCap: 'round',
                                lineJoin: 'round',
                                lineOpacity: 0.9,
                            }}
                        />
                    </Mapbox.ShapeSource>
                )}

                {/* Destination marker */}
                {destination && (
                    <Mapbox.PointAnnotation
                        id="destinationMarker"
                        coordinate={[destination.longitude, destination.latitude]}
                    >
                        <View style={styles.destinationMarker}>
                            <View style={styles.destinationPin} />
                            <View style={styles.destinationShadow} />
                        </View>
                    </Mapbox.PointAnnotation>
                )}

                {children}
            </Mapbox.MapView>
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
    destinationMarker: {
        width: 30,
        height: 40,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    destinationPin: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FF3B30',
        borderWidth: 3,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    destinationShadow: {
        position: 'absolute',
        bottom: -5,
        width: 12,
        height: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 6,
    },
});