// components/NavigationMapboxMap.tsx - Enhanced with auto-center and route display
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, Text, ActivityIndicator, Dimensions, ViewStyle } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '@/constants/Tokens';
import { Ionicons } from '@expo/vector-icons';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Safe number validation
const isValidNumber = (value: any): value is number => {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

// Safe coordinate validation
const isValidCoordinate = (coord: any): coord is { latitude: number; longitude: number } => {
    return coord &&
        typeof coord === 'object' &&
        coord !== null &&
        isValidNumber(coord.latitude) &&
        isValidNumber(coord.longitude) &&
        coord.latitude >= -90 && coord.latitude <= 90 &&
        coord.longitude >= -180 && coord.longitude <= 180;
};

// Safe coordinate array validation
const isValidCoordinateArray = (coords: any): coords is [number, number] => {
    return Array.isArray(coords) &&
        coords.length === 2 &&
        isValidNumber(coords[0]) &&
        isValidNumber(coords[1]) &&
        coords[1] >= -90 && coords[1] <= 90 &&
        coords[0] >= -180 && coords[0] <= 180;
};

interface NavigationMapboxMapProps {
    // Navigation specific props
    driverLocation?: { latitude: number; longitude: number } | null;
    destination?: { latitude: number; longitude: number } | null;
    routeGeoJSON?: GeoJSON.Feature | null;

    // Camera control props
    bearing?: number;
    pitch?: number;
    zoomLevel?: number;
    followMode?: 'none' | 'follow' | 'course' | 'compass';

    // Event handlers
    onLocationUpdate?: (location: Mapbox.Location) => void;
    onCameraChange?: (state: any) => void;

    // UI props
    showUserLocation?: boolean;
    showCompass?: boolean;
    showScaleBar?: boolean;
    enableRotation?: boolean;
    enablePitching?: boolean;
    enableScrolling?: boolean;

    // Style props
    mapStyle?: string;
    children?: React.ReactNode;
}

export interface NavigationMapboxMapRef {
    centerOnDriver: () => void;
    recenterWithBearing: (bearing?: number) => void;
    flyTo: (coordinates: [number, number], zoom?: number, bearing?: number) => void;
    resetView: () => void;
}

const NavigationMapboxMap = forwardRef<NavigationMapboxMapRef, NavigationMapboxMapProps>(({
                                                                                              driverLocation,
                                                                                              destination,
                                                                                              routeGeoJSON,
                                                                                              bearing = 0,
                                                                                              pitch = 60,
                                                                                              zoomLevel = 18,
                                                                                              followMode = 'course',
                                                                                              onLocationUpdate,
                                                                                              onCameraChange,
                                                                                              showUserLocation = true,
                                                                                              showCompass = false,
                                                                                              showScaleBar = false,
                                                                                              enableRotation = false,
                                                                                              enablePitching = false,
                                                                                              enableScrolling = false,
                                                                                              mapStyle = 'mapbox://styles/mapbox/navigation-day-v1',
                                                                                              children
                                                                                          }, ref) => {
    const mapRef = useRef<Mapbox.MapView>(null);
    const cameraRef = useRef<Mapbox.Camera>(null);
    const [isMapReady, setIsMapReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [currentCameraState, setCurrentCameraState] = useState<any>(null);
    const [mapError, setMapError] = useState<string | null>(null);
    const [lastCameraUpdate, setLastCameraUpdate] = useState<number>(0);

    // Validate props
    const validDriverLocation = isValidCoordinate(driverLocation) ? driverLocation : null;
    const validDestination = isValidCoordinate(destination) ? destination : null;
    const validBearing = isValidNumber(bearing) ? bearing : 0;
    const validPitch = isValidNumber(pitch) ? Math.max(0, Math.min(60, pitch)) : 60;
    const validZoomLevel = isValidNumber(zoomLevel) ? Math.max(1, Math.min(22, zoomLevel)) : 18;

    console.log('🗺️ NavigationMapboxMap render:', {
        validDriverLocation,
        validDestination,
        hasRoute: !!routeGeoJSON,
        validBearing,
        validPitch,
        validZoomLevel,
        isMapReady,
        followMode
    });

    // Imperative methods exposed via ref
    useImperativeHandle(ref, () => ({
        centerOnDriver: () => {
            if (validDriverLocation && cameraRef.current && isMapReady) {
                try {
                    console.log('📍 Centering on driver location:', validDriverLocation);
                    cameraRef.current.setCamera({
                        centerCoordinate: [validDriverLocation.longitude, validDriverLocation.latitude],
                        zoomLevel: validZoomLevel,
                        pitch: validPitch,
                        heading: validBearing,
                        animationDuration: 1000,
                    });
                } catch (error) {
                    console.warn('Error centering on driver:', error);
                }
            }
        },
        recenterWithBearing: (newBearing = validBearing) => {
            if (validDriverLocation && cameraRef.current && isMapReady) {
                try {
                    const safeBearing = isValidNumber(newBearing) ? newBearing : validBearing;
                    console.log('🧭 Recentering with bearing:', safeBearing);
                    cameraRef.current.setCamera({
                        centerCoordinate: [validDriverLocation.longitude, validDriverLocation.latitude],
                        zoomLevel: validZoomLevel,
                        pitch: validPitch,
                        heading: safeBearing,
                        animationDuration: 800,
                    });
                } catch (error) {
                    console.warn('Error recentering with bearing:', error);
                }
            }
        },
        flyTo: (coordinates, zoom = validZoomLevel, newBearing = validBearing) => {
            if (isValidCoordinateArray(coordinates) && cameraRef.current && isMapReady) {
                try {
                    const safeZoom = isValidNumber(zoom) ? Math.max(1, Math.min(22, zoom)) : validZoomLevel;
                    const safeBearing = isValidNumber(newBearing) ? newBearing : validBearing;
                    console.log('✈️ Flying to coordinates:', coordinates, 'zoom:', safeZoom, 'bearing:', safeBearing);
                    cameraRef.current.setCamera({
                        centerCoordinate: coordinates,
                        zoomLevel: safeZoom,
                        pitch: validPitch,
                        heading: safeBearing,
                        animationDuration: 2000,
                    });
                } catch (error) {
                    console.warn('Error flying to coordinates:', error);
                }
            }
        },
        resetView: () => {
            if (validDriverLocation && cameraRef.current && isMapReady) {
                try {
                    console.log('🔄 Resetting view');
                    cameraRef.current.setCamera({
                        centerCoordinate: [validDriverLocation.longitude, validDriverLocation.latitude],
                        zoomLevel: 16,
                        pitch: 45,
                        heading: 0,
                        animationDuration: 1500,
                    });
                } catch (error) {
                    console.warn('Error resetting view:', error);
                }
            }
        }
    }), [validDriverLocation, validBearing, validPitch, validZoomLevel, isMapReady]);

    // Auto-follow driver location with throttling
    useEffect(() => {
        if (!isMapReady || !cameraRef.current || !validDriverLocation || followMode === 'none') {
            return;
        }

        // Throttle camera updates to prevent excessive animation
        const now = Date.now();
        if (now - lastCameraUpdate < 1000) { // Min 1 second between updates
            return;
        }

        const updateCamera = async () => {
            if (isLoading) return;

            setIsLoading(true);
            try {
                console.log('📱 Auto-updating camera to follow driver:', validDriverLocation);

                const cameraConfig: any = {
                    centerCoordinate: [validDriverLocation.longitude, validDriverLocation.latitude],
                    zoomLevel: validZoomLevel,
                    pitch: validPitch,
                    animationDuration: 1000,
                };

                // Add heading based on follow mode
                if (followMode === 'course' || followMode === 'compass') {
                    cameraConfig.heading = validBearing;
                }

                await cameraRef.current?.setCamera(cameraConfig);
                setLastCameraUpdate(now);
                setMapError(null);
            } catch (error) {
                console.warn('Auto camera update error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(updateCamera, 100);
        return () => clearTimeout(timeoutId);
    }, [isMapReady, validDriverLocation, validBearing, validPitch, validZoomLevel, followMode]);

    // Map event handlers
    const handleMapLoaded = useCallback(() => {
        console.log('🗺️ Navigation map loaded and ready');
        setIsMapReady(true);
        setMapError(null);

        // Auto-center on driver once map is ready
        if (validDriverLocation && cameraRef.current) {
            setTimeout(() => {
                cameraRef.current?.setCamera({
                    centerCoordinate: [validDriverLocation.longitude, validDriverLocation.latitude],
                    zoomLevel: validZoomLevel,
                    pitch: validPitch,
                    heading: validBearing,
                    animationDuration: 1000,
                });
            }, 500);
        }
    }, [validDriverLocation, validZoomLevel, validPitch, validBearing]);

    const handleMapError = useCallback((error: any) => {
        console.error('🗺️ Map error:', error);
        setMapError('Map failed to load');
    }, []);

    const handleCameraChanged = useCallback((state: any) => {
        try {
            setCurrentCameraState(state);
            onCameraChange?.(state);
        } catch (error) {
            console.warn('Camera change handler error:', error);
        }
    }, [onCameraChange]);

    const handleLocationUpdate = useCallback((location: Mapbox.Location) => {
        try {
            if (location && typeof location === 'object' && location.coords) {
                onLocationUpdate?.(location);
            }
        } catch (error) {
            console.warn('Location update handler error:', error);
        }
    }, [onLocationUpdate]);

    // Route styling
    const routeStyles = {
        routeCasing: {
            lineColor: 'white',
            lineWidth: 10,
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
            lineOpacity: 0.8
        },
        routeOutline: {
            lineColor: '#1a73e8',
            lineWidth: 8,
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
            lineOpacity: 0.7
        },
        routeLine: {
            lineColor: '#4285F4',
            lineWidth: 6,
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
            lineOpacity: 1.0
        }
    };

    // Component styles
    const containerStyle: ViewStyle = { flex: 1 };

    const errorStyle: ViewStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(245, 245, 245, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    };

    const loaderStyle: ViewStyle = {
        position: 'absolute',
        top: SCREEN_HEIGHT / 2 - 25,
        left: SCREEN_WIDTH / 2 - 25,
        zIndex: 1000,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 25,
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
    };

    const destinationMarkerStyle: ViewStyle = {
        width: 40,
        height: 40,
        backgroundColor: '#EA4335',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    };

    // Show error state
    if (mapError) {
        return (
            <View style={containerStyle}>
                <View style={errorStyle}>
                    <View style={{
                        backgroundColor: 'white',
                        borderRadius: 20,
                        padding: 32,
                        marginHorizontal: 32,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.1,
                        shadowRadius: 12,
                        elevation: 8
                    }}>
                        <Ionicons name="warning" size={48} color="#EA4335" />
                        <Text style={{
                            fontSize: 18,
                            fontWeight: '600',
                            color: '#1a1a1a',
                            marginTop: 16,
                            marginBottom: 8,
                            textAlign: 'center'
                        }}>
                            Map Error
                        </Text>
                        <Text style={{
                            fontSize: 14,
                            color: '#666',
                            textAlign: 'center',
                            lineHeight: 20
                        }}>
                            {mapError}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={containerStyle}>
            {isLoading && (
                <View style={loaderStyle}>
                    <ActivityIndicator size="small" color="#4285F4" />
                </View>
            )}

            <Mapbox.MapView
                ref={mapRef}
                style={{ flex: 1 }}
                styleURL={mapStyle}
                logoEnabled={false}
                attributionEnabled={false}
                compassEnabled={showCompass}
                scaleBarEnabled={showScaleBar}
                rotateEnabled={enableRotation}
                pitchEnabled={enablePitching}
                scrollEnabled={enableScrolling}
                onDidFinishLoadingMap={handleMapLoaded}
                onCameraChanged={handleCameraChanged}
                onError={handleMapError}
            >
                {/* Camera with proper follow settings */}
                <Mapbox.Camera
                    ref={cameraRef}
                    followUserLocation={followMode === 'follow'}
                    followUserMode={followMode === 'course' ? 'course' : 'normal'}
                    followZoomLevel={validZoomLevel}
                    followPitch={validPitch}
                />

                {/* User Location Display */}
                {showUserLocation && (
                    <Mapbox.UserLocation
                        visible={true}
                        showsUserHeadingIndicator={true}
                        minDisplacement={1} // Update every meter
                        onUpdate={handleLocationUpdate}
                    />
                )}

                {/* Route Display with Multiple Layers */}
                {routeGeoJSON && (
                    <Mapbox.ShapeSource
                        id="routeSource"
                        shape={routeGeoJSON}
                        onError={(error) => console.warn('Route source error:', error)}
                    >
                        {/* Route casing (white outline) */}
                        <Mapbox.LineLayer
                            id="routeCasing"
                            style={routeStyles.routeCasing}
                        />

                        {/* Route outline (darker blue) */}
                        <Mapbox.LineLayer
                            id="routeOutline"
                            style={routeStyles.routeOutline}
                        />

                        {/* Main route line */}
                        <Mapbox.LineLayer
                            id="routeLayer"
                            style={routeStyles.routeLine}
                        />
                    </Mapbox.ShapeSource>
                )}

                {/* Destination Marker */}
                {validDestination && (
                    <Mapbox.PointAnnotation
                        id="destination"
                        coordinate={[validDestination.longitude, validDestination.latitude]}
                    >
                        <View style={destinationMarkerStyle}>
                            <Ionicons name="location" size={20} color="white" />
                        </View>
                    </Mapbox.PointAnnotation>
                )}

                {/* Custom children */}
                {children}
            </Mapbox.MapView>

            {/* Debug info for route */}
            {__DEV__ && (
                <View style={{
                    position: 'absolute',
                    top: 60,
                    right: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    padding: 8,
                    borderRadius: 4,
                    maxWidth: 200
                }}>
                    <Text style={{ color: 'white', fontSize: 10 }}>
                        Map Ready: {isMapReady ? 'Yes' : 'No'}
                    </Text>
                    <Text style={{ color: 'white', fontSize: 10 }}>
                        Driver: {validDriverLocation ? 'Located' : 'None'}
                    </Text>
                    <Text style={{ color: 'white', fontSize: 10 }}>
                        Route: {routeGeoJSON ? 'Loaded' : 'None'}
                    </Text>
                    <Text style={{ color: 'white', fontSize: 10 }}>
                        Follow: {followMode}
                    </Text>
                    <Text style={{ color: 'white', fontSize: 10 }}>
                        Bearing: {Math.round(validBearing)}°
                    </Text>
                </View>
            )}
        </View>
    );
});

NavigationMapboxMap.displayName = 'NavigationMapboxMap';

export default NavigationMapboxMap;