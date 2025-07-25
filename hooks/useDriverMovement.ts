// hooks/useDriverMovement.ts - Fixed version
import { useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import { useSocket } from '@/hooks/useSocket';
import {TripStatus} from "@/hooks/trip";
import {Feature} from "geojson";

interface UseDriverMovementProps {
    routeToPickupGeoJSON: Feature | null;
    userPickupCoords: [number, number] | null;
    currentLegIndex: number;
    driverName: string;
    setCurrentLegIndex: (index: (prevIndex: number) => (number)) => void;
    setDriverCoords: (coords: [number, number]) => void;
    updateTripStatus: (status: TripStatus) => void;
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
    const intervalRef = useRef<number | null>(null);
    const isMovingRef = useRef(false);
    const lastRouteIdRef = useRef<string>('');

    // Create a stable route identifier to prevent unnecessary re-initialization
    const createRouteId = useCallback((routeGeoJSON: GeoJSON.Feature | null, pickupCoords: [number, number] | null): string => {
        if (!routeGeoJSON || !pickupCoords) return '';

        const geometry = routeGeoJSON.geometry;
        if (geometry.type !== 'LineString') return '';

        const coords = geometry.coordinates as [number, number][];
        if (coords.length === 0) return '';

        return `${coords[0][0]},${coords[0][1]}-${pickupCoords[0]},${pickupCoords[1]}-${coords.length}`;
    }, []);

    const stopMovement = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        isMovingRef.current = false;
    }, []);

    const startMovement = useCallback((waypoints: [number, number][], routeId: string) => {
        // Stop any existing movement
        stopMovement();

        if (waypoints.length === 0 || currentLegIndex >= waypoints.length - 1) {
            return;
        }

        isMovingRef.current = true;
        lastRouteIdRef.current = routeId;

        intervalRef.current = setInterval(() => {
            // Check if we're still working with the same route
            if (lastRouteIdRef.current !== routeId || !isMovingRef.current) {
                stopMovement();
                return;
            }

            setCurrentLegIndex((prevIndex: number) => {
                const nextIndex = prevIndex + 1;

                if (nextIndex < waypoints.length && isMovingRef.current) {
                    const nextCoord = waypoints[nextIndex];
                    setDriverCoords(nextCoord);

                    // Send location update via socket
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        try {
                            socket.send(
                                JSON.stringify({
                                    type: 'locationUpdate',
                                    lat: nextCoord[1],
                                    lng: nextCoord[0],
                                    driverName: driverName || "Driver"
                                })
                            );
                        } catch (error) {
                            console.error('Error sending location update:', error);
                        }
                    }

                    return nextIndex;
                } else {
                    // Driver arrived at pickup
                    stopMovement();

                    if (userPickupCoords && isMovingRef.current) {
                        setDriverCoords(userPickupCoords);
                        updateTripStatus("Driver Arrived");
                        Alert.alert("Driver Arrived", `${driverName || 'Your driver'} has arrived.`);
                    }

                    return prevIndex;
                }
            });
        }, movementIntervalMs);
    }, [
        socket,
        driverName,
        setCurrentLegIndex,
        setDriverCoords,
        updateTripStatus,
        userPickupCoords,
        movementIntervalMs,
        stopMovement
    ]);

    useEffect(() => {
        const routeId = createRouteId(routeToPickupGeoJSON, userPickupCoords);

        if (!routeToPickupGeoJSON || !userPickupCoords || !routeId) {
            stopMovement();
            lastRouteIdRef.current = '';
            return;
        }

        // Only start movement if this is a new route
        if (routeId !== lastRouteIdRef.current) {
            let waypoints: [number, number][] = [];
            const geometry = routeToPickupGeoJSON.geometry;

            if (geometry.type === 'LineString') {
                waypoints = geometry.coordinates as [number, number][];
            }

            if (waypoints.length > 0) {
                startMovement(waypoints, routeId);
            }
        }

        // Cleanup function
        return () => {
            stopMovement();
        };
    }, [
        routeToPickupGeoJSON,
        userPickupCoords,
        createRouteId,
        startMovement,
        stopMovement
    ]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopMovement();
        };
    }, [stopMovement]);

    return {
        socket,
        isMoving: isMovingRef.current,
        stopMovement,
    };
};