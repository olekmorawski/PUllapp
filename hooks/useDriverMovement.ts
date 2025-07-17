// hooks/useDriverMovement.ts
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useSocket } from '@/hooks/useSocket';
import {TripStatus} from "@/hooks/trip";

interface UseDriverMovementProps {
    routeToPickupGeoJSON: GeoJSON.Feature | null;
    userPickupCoords: [number, number] | null;
    currentLegIndex: number;
    driverName: string;
    setCurrentLegIndex: (index: (prevIndex: number) => (number)) => void;
    setDriverCoords: (coords: [number, number]) => void;
    updateTripStatus: (status: TripStatus) => void; // Not string!
    movementIntervalMs?: number;

}

export const useDriverMovement = ({
                                      routeToPickupGeoJSON,
                                      userPickupCoords,
                                      currentLegIndex,
                                      driverName,
                                      setCurrentLegIndex,
                                      setDriverCoords,
                                      updateTripStatus,
                                      movementIntervalMs = 2000,
                                  }: UseDriverMovementProps) => {
    const socket = useSocket();

    useEffect(() => {
        if (!routeToPickupGeoJSON || !userPickupCoords || !socket) return;

        let waypoints: [number, number][] = [];
        const geometry = routeToPickupGeoJSON.geometry;

        if (geometry.type === 'LineString') {
            waypoints = geometry.coordinates as [number, number][];
        }

        if (waypoints.length === 0 || currentLegIndex >= waypoints.length - 1) {
            return;
        }

        const moveInterval = setInterval(() => {
            setCurrentLegIndex((prevIndex: number) => {
                const nextIndex = prevIndex + 1;

                if (nextIndex < waypoints.length) {
                    const nextCoord = waypoints[nextIndex];
                    setDriverCoords(nextCoord);

                    // Send location update via socket
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(
                            JSON.stringify({
                                type: 'locationUpdate',
                                lat: nextCoord[1],
                                lng: nextCoord[0],
                                driverName: driverName || "Driver"
                            })
                        );
                    }

                    return nextIndex;
                } else {
                    // Driver arrived at pickup
                    clearInterval(moveInterval);
                    setDriverCoords(userPickupCoords);
                    updateTripStatus("Driver Arrived");
                    Alert.alert("Driver Arrived", `${driverName || 'Your driver'} has arrived.`);
                    return prevIndex;
                }
            });
        }, movementIntervalMs);

        return () => clearInterval(moveInterval);
    }, [
        routeToPickupGeoJSON,
        userPickupCoords,
        currentLegIndex,
        socket,
        driverName,
        setCurrentLegIndex,
        setDriverCoords,
        updateTripStatus,
        movementIntervalMs
    ]);

    return {
        socket,
    };
};