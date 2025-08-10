import { useState, useEffect, useRef } from 'react';
import { getDistance } from 'geolib';
import {GEOFENCE_CHECK_INTERVAL, GEOFENCE_RADIUS_METERS, NavigationPhase} from "@/hooks/navigation/types";

interface UseGeofencingProps {
    driverLocation: { latitude: number; longitude: number } | null;
    pickupLocation: { latitude: number; longitude: number };
    destinationLocation: { latitude: number; longitude: number };
    navigationPhase: NavigationPhase;
    onEnterPickupGeofence: () => void;
    onEnterDestinationGeofence: () => void;
}

export const useGeofencing = ({
                                  driverLocation,
                                  pickupLocation,
                                  destinationLocation,
                                  navigationPhase,
                                  onEnterPickupGeofence,
                                  onEnterDestinationGeofence
                              }: UseGeofencingProps) => {
    const [isInPickupGeofence, setIsInPickupGeofence] = useState(false);
    const [isInDestinationGeofence, setIsInDestinationGeofence] = useState(false);
    const geofenceCheckInterval = useRef<number | null>(null);

    useEffect(() => {
        if (!driverLocation) return;

        const checkGeofences = () => {
            // Check pickup geofence
            if (navigationPhase === 'to-pickup') {
                const distanceToPickup = getDistance(driverLocation, pickupLocation);
                const wasInPickupGeofence = isInPickupGeofence;
                const nowInPickupGeofence = distanceToPickup <= GEOFENCE_RADIUS_METERS;

                setIsInPickupGeofence(nowInPickupGeofence);

                if (!wasInPickupGeofence && nowInPickupGeofence) {
                    console.log('📍 Entered pickup geofence - Distance:', distanceToPickup, 'meters');
                    onEnterPickupGeofence();
                }
            }

            // Check destination geofence
            if (navigationPhase === 'to-destination') {
                const distanceToDestination = getDistance(driverLocation, destinationLocation);
                const wasInDestinationGeofence = isInDestinationGeofence;
                const nowInDestinationGeofence = distanceToDestination <= GEOFENCE_RADIUS_METERS;

                setIsInDestinationGeofence(nowInDestinationGeofence);

                if (!wasInDestinationGeofence && nowInDestinationGeofence) {
                    console.log('📍 Entered destination geofence - Distance:', distanceToDestination, 'meters');
                    onEnterDestinationGeofence();
                }
            }
        };

        geofenceCheckInterval.current = setInterval(checkGeofences, GEOFENCE_CHECK_INTERVAL) as unknown as number;
        checkGeofences();

        return () => {
            if (geofenceCheckInterval.current) {
                clearInterval(geofenceCheckInterval.current);
            }
        };
    }, [driverLocation, navigationPhase, isInPickupGeofence, isInDestinationGeofence]);

    return { isInPickupGeofence, isInDestinationGeofence };
};