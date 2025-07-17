import React from 'react';
import { View, Text } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { MapboxMap } from '@/components/MapboxMap';

interface TripMapProps {
    mapRef: React.RefObject<Mapbox.MapView | null>;
    initialRegion: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    driverCoords: [number, number] | null;
    userPickupCoords: [number, number] | null;
    routeToPickupGeoJSON: GeoJSON.Feature | null;
}

export const TripMap: React.FC<TripMapProps> = ({
                                                    mapRef,
                                                    initialRegion,
                                                    driverCoords,
                                                    userPickupCoords,
                                                    routeToPickupGeoJSON,
                                                }) => {
    const markerBaseClasses = "w-[30px] h-[30px] rounded-full justify-center items-center border-2 border-white shadow-md";
    const pickupMarkerClasses = `${markerBaseClasses} bg-blue-500`;
    const driverMarkerClasses = `${markerBaseClasses} bg-red-500`;
    const markerTextClasses = "text-white font-bold text-xs";

    return (
        <MapboxMap
            mapRef={mapRef}
            initialRegion={initialRegion}
            origin={driverCoords ? { longitude: driverCoords[0], latitude: driverCoords[1]} : undefined}
            destination={userPickupCoords ? { longitude: userPickupCoords[0], latitude: userPickupCoords[1]} : undefined}
            routeGeoJSON={routeToPickupGeoJSON}
            showUserLocation={true}
        >
            {userPickupCoords && (
                <Mapbox.PointAnnotation
                    id="pickupPoint"
                    coordinate={userPickupCoords}
                >
                    <View className={pickupMarkerClasses}>
                        <Text className={markerTextClasses}>P</Text>
                    </View>
                </Mapbox.PointAnnotation>
            )}
            {driverCoords && (
                <Mapbox.PointAnnotation
                    id="driverLocation"
                    coordinate={driverCoords}
                >
                    <View className={driverMarkerClasses}>
                        <Text className={markerTextClasses}>D</Text>
                    </View>
                </Mapbox.PointAnnotation>
            )}
        </MapboxMap>
    );
};