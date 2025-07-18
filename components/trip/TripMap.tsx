import React from 'react';
import { View, Text } from 'react-native';
import { ExpoMapComponent } from '@/components/ExpoMap';
import { Marker } from 'expo-maps';
import ExpoMap from 'expo-maps';

interface TripMapProps {
    mapRef: React.RefObject<ExpoMap | null>;
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
        <ExpoMapComponent
            mapRef={mapRef}
            initialRegion={initialRegion}
            origin={driverCoords ? { longitude: driverCoords[0], latitude: driverCoords[1] } : undefined}
            destination={userPickupCoords ? { longitude: userPickupCoords[0], latitude: userPickupCoords[1] } : undefined}
            routeGeoJSON={routeToPickupGeoJSON}
            showUserLocation={true}
        >
            {userPickupCoords && (
                <Marker
                    coordinate={{
                        latitude: userPickupCoords[1],
                        longitude: userPickupCoords[0],
                    }}
                    title="Pickup Location"
                    identifier="pickupPoint"
                >
                    <View className={pickupMarkerClasses}>
                        <Text className={markerTextClasses}>P</Text>
                    </View>
                </Marker>
            )}
            {driverCoords && (
                <Marker
                    coordinate={{
                        latitude: driverCoords[1],
                        longitude: driverCoords[0],
                    }}
                    title="Driver Location"
                    identifier="driverLocation"
                >
                    <View className={driverMarkerClasses}>
                        <Text className={markerTextClasses}>D</Text>
                    </View>
                </Marker>
            )}
        </ExpoMapComponent>
    );
};