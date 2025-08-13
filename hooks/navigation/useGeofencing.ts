import { useState, useEffect, useRef } from 'react';
import { getDistance } from 'geolib';
import { GEOFENCE_CHECK_INTERVAL, GEOFENCE_RADIUS_METERS, NavigationPhase } from "@/hooks/navigation/types";

interface UseGeofencingProps {
    driverLocation: { latitude: number; longitude: number } | null;
    pickupLocation: { latitude: number; longitude: number };
    destinationLocation: { latitude: number; longitude: number };
    navigationPhase: NavigationPhase;
    onEnterPickupGeofence: () => void;
    onEnterDestinationGeofence: () => void;
}

interface GeofenceVisibility {
    showPickupGeofence: boolean;
    showDestinationGeofence: boolean;
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
    const [geofenceVisibility, setGeofenceVisibility] = useState<GeofenceVisibility>({
        showPickupGeofence: false,
        showDestinationGeofence: false
    });
    const geofenceCheckInterval = useRef<number | null>(null);

    // Update geofence visibility based on navigation phase
    useEffect(() => {
        const updateGeofenceVisibility = () => {
            switch (navigationPhase) {
                case 'to-pickup':
                case 'at-pickup':
                    setGeofenceVisibility({
                        showPickupGeofence: true,
                        showDestinationGeofence: false
                    });
                    break;
                case 'picking-up':
                    // During pickup transition, hide pickup geofence but don't show destination yet
                    setGeofenceVisibility({
                        showPickupGeofence: false,
                        showDestinationGeofence: false
                    });
                    break;
                case 'to-destination':
                case 'at-destination':
                    setGeofenceVisibility({
                        showPickupGeofence: false,
                        showDestinationGeofence: true
                    });
                    break;
                case 'completed':
                    // Hide all geofences when trip is completed
                    setGeofenceVisibility({
                        showPickupGeofence: false,
                        showDestinationGeofence: false
                    });
                    // Reset geofence states
                    setIsInPickupGeofence(false);
                    setIsInDestinationGeofence(false);
                    break;
                default:
                    setGeofenceVisibility({
                        showPickupGeofence: false,
                        showDestinationGeofence: false
                    });
            }
        };

        updateGeofenceVisibility();
    }, [navigationPhase]);

    useEffect(() => {
        if (!driverLocation) return;

        const checkGeofences = () => {
            // Only check pickup geofence if it should be visible and we're in the right phase
            if (geofenceVisibility.showPickupGeofence && navigationPhase === 'to-pickup') {
                const distanceToPickup = getDistance(driverLocation, pickupLocation);
                const wasInPickupGeofence = isInPickupGeofence;
                const nowInPickupGeofence = distanceToPickup <= GEOFENCE_RADIUS_METERS;

                setIsInPickupGeofence(nowInPickupGeofence);

                if (!wasInPickupGeofence && nowInPickupGeofence) {
                    console.log('📍 Entered pickup geofence - Distance:', distanceToPickup, 'meters');
                    onEnterPickupGeofence();
                }
            } else if (!geofenceVisibility.showPickupGeofence && isInPickupGeofence) {
                // Clear pickup geofence state when it's no longer visible
                setIsInPickupGeofence(false);
            }

            // Only check destination geofence if it should be visible and we're in the right phase
            if (geofenceVisibility.showDestinationGeofence && navigationPhase === 'to-destination') {
                const distanceToDestination = getDistance(driverLocation, destinationLocation);
                const wasInDestinationGeofence = isInDestinationGeofence;
                const nowInDestinationGeofence = distanceToDestination <= GEOFENCE_RADIUS_METERS;

                setIsInDestinationGeofence(nowInDestinationGeofence);

                if (!wasInDestinationGeofence && nowInDestinationGeofence) {
                    console.log('📍 Entered destination geofence - Distance:', distanceToDestination, 'meters');
                    onEnterDestinationGeofence();
                }
            } else if (!geofenceVisibility.showDestinationGeofence && isInDestinationGeofence) {
                // Clear destination geofence state when it's no longer visible
                setIsInDestinationGeofence(false);
            }
        };

        geofenceCheckInterval.current = setInterval(checkGeofences, GEOFENCE_CHECK_INTERVAL) as unknown as number;
        checkGeofences();

        return () => {
            if (geofenceCheckInterval.current) {
                clearInterval(geofenceCheckInterval.current);
            }
        };
    }, [driverLocation, navigationPhase, isInPickupGeofence, isInDestinationGeofence, geofenceVisibility]);

    // Cleanup function for when trip is completed or component unmounts
    const cleanup = () => {
        if (geofenceCheckInterval.current) {
            clearInterval(geofenceCheckInterval.current);
            geofenceCheckInterval.current = null;
        }
        setIsInPickupGeofence(false);
        setIsInDestinationGeofence(false);
        setGeofenceVisibility({
            showPickupGeofence: false,
            showDestinationGeofence: false
        });
    };

    // Cleanup on unmount
    useEffect(() => {
        return cleanup;
    }, []);

    return {
        isInPickupGeofence,
        isInDestinationGeofence,
        geofenceVisibility,
        cleanup
    };
};