import React from 'react';
import { ExpoMapComponent } from '@/components/ExpoMapComponent';
import {Geometry, Feature} from "geojson";

interface TripMapProps {
    mapRef: React.RefObject<any>; // Changed from Mapbox.MapView
    initialRegion: {
        latitude: number;
        longitude: number;
        latitudeDelta: number;
        longitudeDelta: number;
    };
    driverCoords: [number, number] | null;
    userPickupCoords: [number, number] | null;
    routeToPickupGeoJSON: Feature<Geometry> | null;
}

export const TripMap: React.FC<TripMapProps> = ({
                                                    mapRef,
                                                    initialRegion,
                                                    driverCoords,
                                                    userPickupCoords,
                                                    routeToPickupGeoJSON,
                                                }) => {
    // Convert array coordinates to object format
    const driverLocation = driverCoords ? {
        latitude: driverCoords[1],
        longitude: driverCoords[0]
    } : null;

    const pickupLocation = userPickupCoords ? {
        latitude: userPickupCoords[1],
        longitude: userPickupCoords[0]
    } : null;

    return (
        <ExpoMapComponent
            mapRef={mapRef}
            initialRegion={initialRegion}
            origin={driverLocation}
            destination={pickupLocation}
            routeGeoJSON={routeToPickupGeoJSON}
            showUserLocation={true}
        />
    );
};