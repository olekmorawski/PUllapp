import React from "react";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";

interface Props {
    mapRef: React.RefObject<MapView>;
    initialRegion?: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    className?: string;
}

export const Map = ({ mapRef, initialRegion, className }: Props) => {
    return (
        <MapView
            ref={mapRef}
            className={className || "w-full h-full"}
            showsUserLocation={true}
            showsMyLocationButton={true}
            showsCompass={true}
            loadingEnabled={true}
            initialRegion={initialRegion}
            provider={PROVIDER_GOOGLE}
        />
    );
};