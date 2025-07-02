import React, { useEffect, useState, useCallback, useRef } from "react";
import MapboxGL from "@rnmapbox/maps";
import * as Location from 'expo-location';
import { MAPBOX_ACCESS_TOKEN } from "../constants/Tokens"; // Assuming you'll store token here

MapboxGL.setAccessToken(MAPBOX_ACCESS_TOKEN);

// Helper to convert latitude/longitude delta to zoom level (approximate)
const deltaToZoom = (latitudeDelta: number) => {
    return Math.round(Math.log2(360 / latitudeDelta));
};

interface Props {
    mapRef: React.RefObject<MapboxGL.MapView | null>; // Updated type
    initialRegion?: { // This will be converted to centerCoordinate and zoomLevel
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    className?: string; // Style prop might be more idiomatic for MapboxGL.MapView
    origin?: { latitude: number; longitude: number } | null;
    destination?: { latitude: number; longitude: number } | null;
    routeCoordinates?: Array<{ latitude: number; longitude: number }>;
    onLocationUpdate?: (location: Location.LocationObject) => void; // More specific type
    showUserLocation?: boolean;
}

export const Map = ({
                        mapRef,
                        initialRegion,
                        className, // Consider using `style` prop directly for MapboxGL.MapView
                        origin,
                        destination,
                        routeCoordinates = [],
                        onLocationUpdate,
                        showUserLocation = true
                    }: Props) => {
    const cameraRef = useRef<MapboxGL.Camera | null>(null);
    // No need for userLocation state within Map component if MapboxGL.UserLocation handles it
    // const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
    const [locationSubscription, setLocationSubscription] = useState<Location.LocationSubscription | null>(null);

    // Request location permissions (can be kept as is, or managed by UserLocation component)
    useEffect(() => {
        let subscription: Location.LocationSubscription | undefined;

        const startLocationTracking = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    console.log('Location permission denied');
                    return;
                }

                // Get initial location to potentially center map or for external use
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                });
                // setUserLocation(location); // Handled by MapboxGL.UserLocation or onUserLocationUpdate
                onLocationUpdate?.(location);

                // If continuous updates are needed outside the map's own user location feature
                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 4000,
                        distanceInterval: 10,
                    },
                    (newLocation) => {
                        // setUserLocation(newLocation); // Handled by MapboxGL.UserLocation
                        onLocationUpdate?.(newLocation);
                    }
                );
                setLocationSubscription(subscription);
            } catch (error) {
                console.error('Error setting up location tracking:', error);
            }
        };

        if (showUserLocation && onLocationUpdate) { // Only start if explicitly needed by parent
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
            const points: GeoJSON.Position[] = [];
            if (origin) points.push([origin.longitude, origin.latitude]);
            routeCoordinates.forEach(coord => points.push([coord.longitude, coord.latitude]));
            if (destination) points.push([destination.longitude, destination.latitude]);

            if (points.length > 1) {
                cameraRef.current.fitBounds(
                    points[0], // southwest
                    points[points.length -1], // northeast (this is simplified, proper bounds calculation needed)
                    [50, 50, 50, 50], // padding
                    1000 // animation duration
                );
                // For more accurate bounds:
                // Calculate bounding box of all points
                // let minLng = points[0][0], maxLng = points[0][0];
                // let minLat = points[0][1], maxLat = points[0][1];
                // points.forEach(p => {
                //   minLng = Math.min(minLng, p[0]);
                //   maxLng = Math.max(maxLng, p[0]);
                //   minLat = Math.min(minLat, p[1]);
                //   maxLat = Math.max(maxLat, p[1]);
                // });
                // cameraRef.current.fitBounds([maxLng, maxLat], [minLng, minLat], [50,50,50,50], 1000);
            } else if (points.length === 1) {
                 cameraRef.current.setCamera({
                     centerCoordinate: points[0],
                     zoomLevel: 14, // Default zoom for a single point
                     animationDuration: 1000,
                 });
            }
        }
    }, [routeCoordinates, origin, destination, mapRef, cameraRef]);


    const handleMarkerPress = useCallback((markerId: string, feature: GeoJSON.Feature) => {
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
        centerCoordinate: [initialRegion.longitude, initialRegion.latitude],
        zoomLevel: deltaToZoom(initialRegion.latitudeDelta),
    } : {
        zoomLevel: 2, // Default zoom if no initial region
        centerCoordinate: [0,0] // Default center
    };


    return (
        <MapboxGL.MapView
            ref={mapRef}
            styleURL={MapboxGL.StyleURL.Street} // Or your custom style
            style={className ? { flex: 1, width: '100%', height: '100%' } : { flex: 1 }} // Apply className as style
            // Removed unsupported props like showsTraffic, loadingEnabled directly
            // Compass is usually part of the map style or can be added with Ornament
            // MyLocationButton needs to be custom or handled by UserLocation component
            // Pitch/Rotate/Zoom/Scroll are generally enabled by default
            logoEnabled={true} // Ensure Mapbox logo is shown
            attributionEnabled={true} // Ensure Mapbox attribution is shown
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
                    onUpdate={onLocationUpdate} // This gives Location.LocationObject
                    showsUserHeadingIndicator={true}
                />
            )}

            {/* Origin Marker */}
            {origin && (
                <MapboxGL.PointAnnotation
                    id="origin-annotation" // Unique ID
                    coordinate={[origin.longitude, origin.latitude]}
                    title="Pickup Location"
                    onSelected={(feature) => handleMarkerPress("origin-annotation", feature)}
                >
                    {/* Optional: Custom view for annotation */}
                    {/* <View style={{width: 20, height: 20, backgroundColor: 'green', borderRadius: 10}} /> */}
                </MapboxGL.PointAnnotation>
            )}

            {/* Destination Marker */}
            {destination && (
                <MapboxGL.PointAnnotation
                    id="destination-annotation" // Unique ID
                    coordinate={[destination.longitude, destination.latitude]}
                    title="Destination"
                    onSelected={(feature) => handleMarkerPress("destination-annotation", feature)}
                >
                    {/* Optional: Custom view for annotation */}
                    {/* <View style={{width: 20, height: 20, backgroundColor: 'red', borderRadius: 10}} /> */}
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
                            // lineDasharray: [0] // For solid line, or specify pattern
                        }}
                    />
                </MapboxGL.ShapeSource>
            )}
        </MapboxGL.MapView>
    );
};