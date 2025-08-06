// components/NavigationMapboxMap.tsx - Updated with pickup prop support
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, Text, ActivityIndicator, Dimensions, ViewStyle } from 'react-native';
import {Feature} from "geojson";
import Mapbox, {UserTrackingMode} from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from '@/constants/Tokens';
import { Ionicons } from '@expo/vector-icons';
import RoadFittedArrow from "@/components/NavigationArrow";

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Validation helpers
const isValidNumber = (value: any): value is number => {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

const isValidCoordinate = (coord: any): coord is { latitude: number; longitude: number } => {
    return coord &&
        typeof coord === 'object' &&
        coord !== null &&
        isValidNumber(coord.latitude) &&
        isValidNumber(coord.longitude) &&
        coord.latitude >= -90 && coord.latitude <= 90 &&
        coord.longitude >= -180 && coord.longitude <= 180;
};

const isValidCoordinateArray = (coords: any): coords is [number, number] => {
    return Array.isArray(coords) &&
        coords.length === 2 &&
        isValidNumber(coords[0]) &&
        isValidNumber(coords[1]) &&
        coords[1] >= -90 && coords[1] <= 90 &&
        coords[0] >= -180 && coords[0] <= 180;
};

interface NavigationMapboxMapProps {
    driverLocation?: { latitude: number; longitude: number } | null;
    pickup?: { latitude: number; longitude: number } | null;  // ADD THIS LINE
    destination?: { latitude: number; longitude: number } | null;
    routeGeoJSON?: Feature | null;
    maneuverPoints?: Array<{
        coordinate: [number, number];
        type: string;
        modifier?: string;
        instruction: string;
        distance?: number;
    }>;
    bearing?: number;
    pitch?: number;
    zoomLevel?: number;
    followMode?: 'none' | 'follow' | 'course' | 'compass';
    onLocationUpdate?: (location: Mapbox.Location) => void;
    onCameraChange?: (state: any) => void;
    showUserLocation?: boolean;
    showCompass?: boolean;
    showScaleBar?: boolean;
    enableRotation?: boolean;
    enablePitching?: boolean;
    enableScrolling?: boolean;
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
                                                                                              pickup,  // ADD THIS PARAMETER
                                                                                              destination,
                                                                                              routeGeoJSON,
                                                                                              maneuverPoints = [],
                                                                                              bearing = 0,
                                                                                              pitch = 60,
                                                                                              zoomLevel = 18,
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
    const [followMode, setFollowMode] = useState<'none' | 'follow' | 'course' | 'compass'>('follow');

    // Validate props
    const validDriverLocation = isValidCoordinate(driverLocation) ? driverLocation : null;
    const validPickup = isValidCoordinate(pickup) ? pickup : null;  // ADD THIS VALIDATION
    const validDestination = isValidCoordinate(destination) ? destination : null;
    const validBearing = isValidNumber(bearing) ? bearing : 0;
    const validPitch = isValidNumber(pitch) ? Math.max(0, Math.min(60, pitch)) : 60;
    const validZoomLevel = isValidNumber(zoomLevel) ? Math.max(1, Math.min(22, zoomLevel)) : 18;

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

    // Auto-follow driver location with smooth transitions
    useEffect(() => {
        if (!isMapReady || !cameraRef.current || !validDriverLocation || followMode === 'none') {
            return;
        }

        // Throttle camera updates
        const now = Date.now();
        if (now - lastCameraUpdate < 1000) {
            return;
        }

        const updateCamera = async () => {
            if (isLoading) return;

            setIsLoading(true);
            try {
                console.log('📱 Auto-updating camera to follow driver');

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
    }, [isMapReady, validDriverLocation, validBearing, validPitch, validZoomLevel, followMode, lastCameraUpdate]);

    // Map event handlers
    const handleMapLoaded = useCallback(() => {
        console.log('🗺️ Navigation map loaded and ready');
        setIsMapReady(true);
        setMapError(null);

        // Initial camera setup
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

    // Enhanced route styling with better visibility
    const routeStyles = {
        routeCasing: {
            lineColor: '#000000',
            lineWidth: 14,
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
            lineOpacity: 0.4
        },
        routeOutline: {
            lineColor: '#FFFFFF',
            lineWidth: 12,
            lineCap: 'round' as const,
            lineJoin: 'round' as const,
            lineOpacity: 0.8
        },
        routeLine: {
            lineColor: '#4285F4',
            lineWidth: 8,
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

    const pickupMarkerStyle: ViewStyle = {
        width: 40,
        height: 40,
        backgroundColor: '#4285F4',
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
                onTouchStart={() => {
                    // Disable camera following when user touches map
                    if (followMode !== 'none') {
                        setFollowMode('none');
                    }
                }}
                compassEnabled={showCompass}
                scaleBarEnabled={showScaleBar}
                rotateEnabled={enableRotation}
                pitchEnabled={enablePitching}
                scrollEnabled={enableScrolling}
                onDidFinishLoadingMap={handleMapLoaded}
                onCameraChanged={handleCameraChanged}
                onError={handleMapError}
            >
                {/* Camera with navigation-specific settings */}
                <Mapbox.Camera
                    ref={cameraRef}
                    followUserLocation={followMode !== 'none'}
                    followUserMode={
                        (followMode === 'course'
                            ? 'course'
                            : followMode === 'compass'
                                ? 'compass'
                                : 'normal') as UserTrackingMode
                    }
                    followZoomLevel={zoomLevel}
                    followPitch={pitch}
                />

                {/* User Location with custom puck */}
                {showUserLocation && (
                    <Mapbox.UserLocation
                        visible={true}
                        showsUserHeadingIndicator={true}
                        minDisplacement={1}
                        onUpdate={handleLocationUpdate}
                    />
                )}

                {/* Route layers */}
                {routeGeoJSON && routeGeoJSON.geometry && (
                    <Mapbox.ShapeSource
                        id="routeSource"
                        shape={routeGeoJSON}
                        onError={(error) => console.warn('Route source error:', error)}
                    >
                        <Mapbox.LineLayer
                            id="routeCasing"
                            style={routeStyles.routeCasing}
                        />

                        <Mapbox.LineLayer
                            id="routeOutline"
                            style={routeStyles.routeOutline}
                        />

                        <Mapbox.LineLayer
                            id="routeLayer"
                            style={routeStyles.routeLine}
                        />
                    </Mapbox.ShapeSource>
                )}

                {/* Road-fitted navigation arrows */}
                {routeGeoJSON && maneuverPoints.length > 0 && (
                    <FixedRoadFittedArrows
                        routeGeoJSON={routeGeoJSON}
                        maneuverPoints={maneuverPoints}
                        currentPosition={validDriverLocation}
                    />
                )}

                {/* Pickup Marker (if provided and different from destination) */}
                {validPickup && (
                    <Mapbox.PointAnnotation
                        id="pickup"
                        coordinate={[validPickup.longitude, validPickup.latitude]}
                    >
                        <View style={pickupMarkerStyle}>
                            <Ionicons name="person" size={20} color="white" />
                        </View>
                    </Mapbox.PointAnnotation>
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

                {children}
            </Mapbox.MapView>
        </View>
    );
});

// Fixed Road-Fitted Arrows component
interface FixedRoadFittedArrowsProps {
    routeGeoJSON: Feature | null;
    maneuverPoints: Array<{
        coordinate: [number, number];
        type: string;
        modifier?: string;
        instruction: string;
        distance?: number;
    }>;
    currentPosition?: { latitude: number; longitude: number } | null;
}

const FixedRoadFittedArrows: React.FC<FixedRoadFittedArrowsProps> = ({
                                                                         routeGeoJSON,
                                                                         maneuverPoints,
                                                                         currentPosition
                                                                     }) => {
    // Calculate distance to current position for color/animation logic
    const calculateDistance = (point: [number, number]): number => {
        if (!currentPosition) return 1000; // Default distance if no position

        const dx = point[0] - currentPosition.longitude;
        const dy = point[1] - currentPosition.latitude;
        // Simple distance calculation (not perfect but good enough for coloring)
        return Math.sqrt(dx * dx + dy * dy) * 111320; // Rough meters conversion
    };

    // Color logic matching the SVG version
    const getManeuverColor = (distance: number): string => {
        return '#EA4335'; // Always red
    };

    if (!routeGeoJSON || maneuverPoints.length === 0) {
        return null;
    }

    // Show ALL maneuver points (same as SVG version), not filtered by distance
    return (
        <>
            {maneuverPoints.map((point, index) => {
                const distance = calculateDistance(point.coordinate);
                const isNextManeuver = index === 0;
                const color = getManeuverColor(distance);
                const shouldAnimate = isNextManeuver && distance < 100;

                // Opacity based on distance for visual hierarchy
                let opacity = 1.0;
                if (distance > 1000) opacity = 0.4;
                else if (distance > 500) opacity = 0.6;
                else if (distance > 200) opacity = 0.8;

                return (
                    <RoadFittedArrow
                        key={`road-arrow-${index}-${point.coordinate[0].toFixed(6)}-${point.coordinate[1].toFixed(6)}`}
                        routeGeoJSON={routeGeoJSON}
                        maneuverPoint={{
                            ...point,
                            uniqueIndex: index
                        }}
                        uniqueKey={`${index}-${point.coordinate[0].toFixed(6)}-${point.coordinate[1].toFixed(6)}`}
                        color={color}
                        opacity={opacity}
                        arrowLength={shouldAnimate ? 60 : 50} // Longer for next maneuver
                        arrowWidth={shouldAnimate ? 14 : 12}  // Wider for next maneuver
                    />
                );
            })}
        </>
    );
};

NavigationMapboxMap.displayName = 'NavigationMapboxMap';

export default NavigationMapboxMap;