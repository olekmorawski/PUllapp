import React, { useEffect, useState, useCallback } from "react";
import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from "react-native-maps";
import * as Location from 'expo-location';

interface Props {
    mapRef: React.RefObject<MapView | null>;
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
    onLocationUpdate?: (location: any) => void;
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
    const [userLocation, setUserLocation] = useState<any>(null);
    const [locationSubscription, setLocationSubscription] = useState<any>(null);

    // Request location permissions and start tracking
    useEffect(() => {
        let subscription: any;

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

                setUserLocation(location);
                onLocationUpdate?.(location);

                // Start watching location with optimized settings
                subscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 4000, // 4 seconds (Uber standard)
                        distanceInterval: 10, // 10 meters
                    },
                    (newLocation) => {
                        setUserLocation(newLocation);
                        onLocationUpdate?.(newLocation);
                    }
                );

                setLocationSubscription(subscription);
            } catch (error) {
                console.error('Error setting up location tracking:', error);
            }
        };

        if (showUserLocation) {
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
        if (mapRef.current && routeCoordinates.length > 0) {
            const coordinates = [
                ...(origin ? [origin] : []),
                ...routeCoordinates,
                ...(destination ? [destination] : [])
            ];

            if (coordinates.length > 1) {
                mapRef.current.fitToCoordinates(coordinates, {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true,
                });
            }
        }
    }, [routeCoordinates, origin, destination]);

    const handleMarkerPress = useCallback((marker: string) => {
        console.log(`${marker} marker pressed`);
    }, []);

    return (
        <MapView
            ref={mapRef}
            className={className || "w-full h-full"}
            showsUserLocation={showUserLocation}
            showsMyLocationButton={true}
            showsCompass={true}
            loadingEnabled={true}
            initialRegion={initialRegion}
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            showsTraffic={true}
            pitchEnabled={true}
            rotateEnabled={true}
            zoomEnabled={true}
            scrollEnabled={true}
        >
            {/* Origin Marker */}
            {origin && (
                <Marker
                    coordinate={origin}
                    title="Pickup Location"
                    pinColor="green"
                    onPress={() => handleMarkerPress('origin')}
                />
            )}

            {/* Destination Marker */}
            {destination && (
                <Marker
                    coordinate={destination}
                    title="Destination"
                    pinColor="red"
                    onPress={() => handleMarkerPress('destination')}
                />
            )}

            {/* Route Polyline */}
            {routeCoordinates.length > 0 && (
                <Polyline
                    coordinates={routeCoordinates}
                    strokeColor="#007AFF"
                    strokeWidth={4}
                    lineDashPattern={[0]}
                />
            )}
        </MapView>
    );
};