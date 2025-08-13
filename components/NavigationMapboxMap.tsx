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

interface GeofenceArea {
    id: string; // unique identifier for the geofence
    center: [number, number]; // [longitude, latitude]
    radius: number; // radius in meters
    color?: string;
    opacity?: number;
    type?: 'pickup' | 'destination'; // type for phase-based filtering
    visible?: boolean; // explicit visibility control
}

interface NavigationMapboxMapProps {
    driverLocation?: { latitude: number; longitude: number } | null;
    pickup?: { latitude: number; longitude: number } | null;
    destination?: { latitude: number; longitude: number } | null;
    routeGeoJSON?: Feature | null;
    maneuverPoints?: Array<{
        coordinate: [number, number];
        type: string;
        modifier?: string;
        instruction: string;
        distance?: number;
    }>;
    geofenceAreas?: GeofenceArea[];
    navigationPhase?: 'to-pickup' | 'at-pickup' | 'picking-up' | 'to-destination' | 'at-destination' | 'completed'; // for phase-based filtering
    bearing?: number;
    pitch?: number;
    zoomLevel?: number;
    followMode?: 'none' | 'follow' | 'course' | 'compass';
    onLocationUpdate?: (location: Mapbox.Location) => void;
    onCameraChange?: (state: any) => void;
    onGeofenceTransition?: (geofenceId: string, visible: boolean) => void; // callback for transition events
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
    clearMapElements: (elementTypes?: ('geofences' | 'route' | 'markers')[]) => void; // cleanup functionality
    updateGeofenceVisibility: (geofenceId: string, visible: boolean) => void; // dynamic visibility control
    // Camera transition methods
    transitionToRouteOverview: (pickupCoordinate: [number, number], destinationCoordinate: [number, number], duration?: number) => Promise<void>;
    transitionToFollowMode: (driverLocation: [number, number], bearing?: number, duration?: number) => Promise<void>;
    transitionWithBounds: (coordinates: [number, number][], padding?: { top?: number; bottom?: number; left?: number; right?: number }, duration?: number) => Promise<void>;
}

const NavigationMapboxMap = forwardRef<NavigationMapboxMapRef, NavigationMapboxMapProps>(({
                                                                                              driverLocation,
                                                                                              pickup,
                                                                                              destination,
                                                                                              routeGeoJSON,
                                                                                              maneuverPoints = [],
                                                                                              geofenceAreas = [],
                                                                                              navigationPhase,
                                                                                              bearing = 0,
                                                                                              pitch = 60,
                                                                                              zoomLevel = 18,
                                                                                              onLocationUpdate,
                                                                                              onCameraChange,
                                                                                              onGeofenceTransition,
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
    const [mapError, setMapError] = useState<string | null>(null);
    const [lastCameraUpdate, setLastCameraUpdate] = useState<number>(0);
    const [followMode, setFollowMode] = useState<'none' | 'follow' | 'course' | 'compass'>('follow');
    
    // Geofence state management
    const [visibleGeofences, setVisibleGeofences] = useState<Set<string>>(new Set());
    const [transitioningGeofences, setTransitioningGeofences] = useState<Set<string>>(new Set());
    const geofenceTransitionTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    // Validate props
    const validDriverLocation = isValidCoordinate(driverLocation) ? driverLocation : null;
    const validPickup = isValidCoordinate(pickup) ? pickup : null;
    const validDestination = isValidCoordinate(destination) ? destination : null;
    const validBearing = isValidNumber(bearing) ? bearing : 0;
    const validPitch = isValidNumber(pitch) ? Math.max(0, Math.min(60, pitch)) : 60;
    const validZoomLevel = isValidNumber(zoomLevel) ? Math.max(1, Math.min(22, zoomLevel)) : 18;

    // Filter geofences based on navigation phase and visibility
    const getVisibleGeofenceAreas = useCallback((): GeofenceArea[] => {
        if (!navigationPhase) {
            // If no phase provided, show all geofences that are explicitly visible
            return geofenceAreas.filter(geofence => geofence.visible !== false);
        }

        return geofenceAreas.filter(geofence => {
            // Check explicit visibility first
            if (geofence.visible === false) return false;
            if (geofence.visible === true) return true;

            // Phase-based filtering
            switch (navigationPhase) {
                case 'to-pickup':
                case 'at-pickup':
                    return geofence.type === 'pickup' || !geofence.type;
                case 'picking-up':
                    // During transition, hide all geofences temporarily
                    return false;
                case 'to-destination':
                case 'at-destination':
                    return geofence.type === 'destination' || !geofence.type;
                case 'completed':
                    // Hide all geofences when trip is completed
                    return false;
                default:
                    return geofence.visible !== false;
            }
        });
    }, [geofenceAreas, navigationPhase]);

    const visibleGeofenceAreas = getVisibleGeofenceAreas();

    // Geofence transition management
    const handleGeofenceTransition = useCallback((geofenceId: string, shouldBeVisible: boolean) => {
        const currentlyVisible = visibleGeofences.has(geofenceId);
        
        if (currentlyVisible === shouldBeVisible) return;

        console.log(`🔄 Geofence transition: ${geofenceId} -> ${shouldBeVisible ? 'visible' : 'hidden'}`);
        
        // Clear any existing timeout for this geofence
        const existingTimeout = geofenceTransitionTimeouts.current.get(geofenceId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Mark as transitioning
        setTransitioningGeofences(prev => new Set([...prev, geofenceId]));

        // Smooth transition with delay
        const timeout = setTimeout(() => {
            setVisibleGeofences(prev => {
                const newSet = new Set(prev);
                if (shouldBeVisible) {
                    newSet.add(geofenceId);
                } else {
                    newSet.delete(geofenceId);
                }
                return newSet;
            });

            setTransitioningGeofences(prev => {
                const newSet = new Set(prev);
                newSet.delete(geofenceId);
                return newSet;
            });

            geofenceTransitionTimeouts.current.delete(geofenceId);
            onGeofenceTransition?.(geofenceId, shouldBeVisible);
        }, 300); // 300ms transition delay

        geofenceTransitionTimeouts.current.set(geofenceId, timeout);
    }, [visibleGeofences, onGeofenceTransition]);

    // Update geofence visibility when phase or areas change
    useEffect(() => {
        visibleGeofenceAreas.forEach(geofence => {
            handleGeofenceTransition(geofence.id, true);
        });

        // Hide geofences that are no longer in the visible list
        const visibleIds = new Set(visibleGeofenceAreas.map(g => g.id));
        visibleGeofences.forEach(geofenceId => {
            if (!visibleIds.has(geofenceId)) {
                handleGeofenceTransition(geofenceId, false);
            }
        });
    }, [visibleGeofenceAreas, handleGeofenceTransition]);

    // Cleanup function for map elements
    const clearMapElements = useCallback((elementTypes: ('geofences' | 'route' | 'markers')[] = ['geofences', 'route', 'markers']) => {
        console.log('🧹 Clearing map elements:', elementTypes);

        if (elementTypes.includes('geofences')) {
            // Clear all geofence timeouts
            geofenceTransitionTimeouts.current.forEach(timeout => clearTimeout(timeout));
            geofenceTransitionTimeouts.current.clear();
            
            // Clear geofence state
            setVisibleGeofences(new Set());
            setTransitioningGeofences(new Set());
        }

        // Note: Route and markers are handled by parent component state changes
        // This function provides a centralized cleanup interface
    }, []);

    // Update individual geofence visibility
    const updateGeofenceVisibility = useCallback((geofenceId: string, visible: boolean) => {
        console.log(`🎯 Updating geofence visibility: ${geofenceId} -> ${visible}`);
        handleGeofenceTransition(geofenceId, visible);
    }, [handleGeofenceTransition]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            geofenceTransitionTimeouts.current.forEach(timeout => clearTimeout(timeout));
            geofenceTransitionTimeouts.current.clear();
        };
    }, []);

    // Camera transition utilities
    const calculateRouteBounds = useCallback((
        pickupCoordinate: [number, number],
        destinationCoordinate: [number, number],
        padding: { top?: number; bottom?: number; left?: number; right?: number } = {}
    ) => {
        const [pickupLng, pickupLat] = pickupCoordinate;
        const [destLng, destLat] = destinationCoordinate;

        // Calculate bounds
        const minLng = Math.min(pickupLng, destLng);
        const maxLng = Math.max(pickupLng, destLng);
        const minLat = Math.min(pickupLat, destLat);
        const maxLat = Math.max(pickupLat, destLat);

        // Add padding (convert to degrees approximately)
        const paddingLng = Math.max((maxLng - minLng) * 0.2, 0.01); // 20% padding, minimum 0.01 degrees
        const paddingLat = Math.max((maxLat - minLat) * 0.2, 0.01); // 20% padding, minimum 0.01 degrees

        const bounds = {
            ne: [maxLng + paddingLng, maxLat + paddingLat] as [number, number],
            sw: [minLng - paddingLng, minLat - paddingLat] as [number, number]
        };

        // Calculate center
        const centerCoordinate: [number, number] = [
            (minLng + maxLng) / 2,
            (minLat + maxLat) / 2
        ];

        // Calculate appropriate zoom level based on distance
        const distance = calculateDistance(pickupCoordinate, destinationCoordinate);
        let zoom = 14; // Default zoom

        if (distance < 1000) { // Less than 1km
            zoom = 16;
        } else if (distance < 5000) { // Less than 5km
            zoom = 14;
        } else if (distance < 20000) { // Less than 20km
            zoom = 12;
        } else {
            zoom = 10;
        }

        return { centerCoordinate, zoom, bounds };
    }, []);

    const calculateDistance = useCallback((
        coord1: [number, number],
        coord2: [number, number]
    ): number => {
        const [lng1, lat1] = coord1;
        const [lng2, lat2] = coord2;

        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }, []);

    // Camera transition methods
    const transitionToRouteOverview = useCallback(async (
        pickupCoordinate: [number, number],
        destinationCoordinate: [number, number],
        duration: number = 2000
    ): Promise<void> => {
        if (!cameraRef.current || !isMapReady) {
            throw new Error('Camera not ready for route overview transition');
        }

        try {
            console.log('🗺️ Transitioning to route overview:', { pickupCoordinate, destinationCoordinate });
            
            const routeBounds = calculateRouteBounds(pickupCoordinate, destinationCoordinate);
            
            await cameraRef.current.setCamera({
                centerCoordinate: routeBounds.centerCoordinate,
                zoomLevel: routeBounds.zoom,
                pitch: 0, // Top-down view for route overview
                heading: 0, // North up
                animationDuration: duration,
            });

            // Wait for animation to complete
            await new Promise(resolve => setTimeout(resolve, duration));
            
            console.log('✅ Route overview transition completed');
        } catch (error) {
            console.error('❌ Route overview transition failed:', error);
            throw error;
        }
    }, [isMapReady, calculateRouteBounds]);

    const transitionToFollowMode = useCallback(async (
        driverLocation: [number, number],
        bearing: number = 0,
        duration: number = 1000
    ): Promise<void> => {
        if (!cameraRef.current || !isMapReady) {
            throw new Error('Camera not ready for follow mode transition');
        }

        try {
            console.log('🎯 Transitioning to follow mode:', { driverLocation, bearing });
            
            await cameraRef.current.setCamera({
                centerCoordinate: driverLocation,
                zoomLevel: 18,
                pitch: 60, // Navigation view
                heading: bearing,
                animationDuration: duration,
            });

            // Wait for animation to complete
            await new Promise(resolve => setTimeout(resolve, duration));
            
            // Re-enable follow mode
            setFollowMode('course');
            
            console.log('✅ Follow mode transition completed');
        } catch (error) {
            console.error('❌ Follow mode transition failed:', error);
            throw error;
        }
    }, [isMapReady]);

    const transitionWithBounds = useCallback(async (
        coordinates: [number, number][],
        padding: { top?: number; bottom?: number; left?: number; right?: number } = {},
        duration: number = 1500
    ): Promise<void> => {
        if (!cameraRef.current || !isMapReady || coordinates.length < 2) {
            throw new Error('Camera not ready or insufficient coordinates for bounds transition');
        }

        try {
            console.log('📐 Transitioning with bounds:', { coordinates, padding });
            
            // Calculate bounds for all coordinates
            const lngs = coordinates.map(coord => coord[0]);
            const lats = coordinates.map(coord => coord[1]);
            
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            
            // Add padding
            const paddingLng = Math.max((maxLng - minLng) * 0.1, 0.01);
            const paddingLat = Math.max((maxLat - minLat) * 0.1, 0.01);
            
            const centerCoordinate: [number, number] = [
                (minLng + maxLng) / 2,
                (minLat + maxLat) / 2
            ];
            
            // Calculate zoom based on bounds
            const distance = calculateDistance([minLng, minLat], [maxLng, maxLat]);
            let zoom = 14;
            
            if (distance < 1000) zoom = 16;
            else if (distance < 5000) zoom = 14;
            else if (distance < 20000) zoom = 12;
            else zoom = 10;
            
            await cameraRef.current.setCamera({
                centerCoordinate,
                zoomLevel: zoom,
                pitch: 30,
                heading: 0,
                animationDuration: duration,
            });

            // Wait for animation to complete
            await new Promise(resolve => setTimeout(resolve, duration));
            
            console.log('✅ Bounds transition completed');
        } catch (error) {
            console.error('❌ Bounds transition failed:', error);
            throw error;
        }
    }, [isMapReady, calculateDistance]);

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
        },
        clearMapElements,
        updateGeofenceVisibility,
        // Camera transition methods
        transitionToRouteOverview,
        transitionToFollowMode,
        transitionWithBounds
    }), [validDriverLocation, validBearing, validPitch, validZoomLevel, isMapReady, clearMapElements, updateGeofenceVisibility, transitionToRouteOverview, transitionToFollowMode, transitionWithBounds]);

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

                {/* Geofence Areas with smooth transitions */}
                {visibleGeofenceAreas.map((geofence, index) => {
                    const isVisible = visibleGeofences.has(geofence.id);
                    const isTransitioning = transitioningGeofences.has(geofence.id);
                    
                    // Skip rendering if not visible and not transitioning
                    if (!isVisible && !isTransitioning) return null;

                    // Create a circle using GeoJSON
                    const createCircle = (center: [number, number], radiusInMeters: number, points: number = 64): GeoJSON.Polygon => {
                        const coords = [];
                        const distanceX = radiusInMeters / (111320 * Math.cos(center[1] * Math.PI / 180));
                        const distanceY = radiusInMeters / 110540;

                        for (let i = 0; i < points; i++) {
                            const theta = (i / points) * (2 * Math.PI);
                            const x = distanceX * Math.cos(theta);
                            const y = distanceY * Math.sin(theta);
                            coords.push([center[0] + x, center[1] + y]);
                        }
                        coords.push(coords[0]); // Close the polygon

                        return {
                            type: 'Polygon',
                            coordinates: [coords]
                        };
                    };

                    const circleGeoJSON = createCircle(geofence.center, geofence.radius);
                    
                    // Calculate opacity for smooth transitions
                    const baseOpacity = geofence.opacity || 0.2;
                    const transitionOpacity = isTransitioning ? baseOpacity * 0.5 : baseOpacity;
                    const finalOpacity = isVisible ? transitionOpacity : 0;

                    return (
                        <Mapbox.ShapeSource
                            key={`geofence-${geofence.id}`}
                            id={`geofenceSource-${geofence.id}`}
                            shape={{
                                type: 'Feature',
                                properties: {
                                    id: geofence.id,
                                    type: geofence.type || 'unknown',
                                    visible: isVisible,
                                    transitioning: isTransitioning
                                },
                                geometry: circleGeoJSON
                            }}
                        >
                            <Mapbox.FillLayer
                                id={`geofenceFill-${geofence.id}`}
                                style={{
                                    fillColor: geofence.color || '#4285F4',
                                    fillOpacity: finalOpacity
                                }}
                            />
                            <Mapbox.LineLayer
                                id={`geofenceBorder-${geofence.id}`}
                                style={{
                                    lineColor: geofence.color || '#4285F4',
                                    lineWidth: 2,
                                    lineOpacity: isVisible ? 0.5 : 0
                                }}
                            />
                        </Mapbox.ShapeSource>
                    );
                })}

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