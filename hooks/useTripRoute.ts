// hooks/useTripRoute.ts
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { DirectionsService } from '@/components/DirectionsService';

interface UseTripRouteProps {
    userPickupCoords: [number, number] | null;
    driverStartLat: number;
    driverStartLng: number;
    setRouteToPickupGeoJSON: (route: GeoJSON.Feature | null) => void;
    setDriverCoords: (coords: [number, number]) => void;
    setCurrentLegIndex: (index: number) => void;
    setIsLoadingRoute: (loading: boolean) => void;
}

export const useTripRoute = ({
                                 userPickupCoords,
                                 driverStartLat,
                                 driverStartLng,
                                 setRouteToPickupGeoJSON,
                                 setDriverCoords,
                                 setCurrentLegIndex,
                                 setIsLoadingRoute,
                             }: UseTripRouteProps) => {
    const directionsService = new DirectionsService();

    useEffect(() => {
        const initialDriverLocationForRoute = {
            longitude: driverStartLng,
            latitude: driverStartLat
        };

        if (initialDriverLocationForRoute && userPickupCoords) {
            const calculateRoute = async () => {
                setIsLoadingRoute(true);
                setRouteToPickupGeoJSON(null);

                try {
                    const routeData = await directionsService.getDirections(
                        initialDriverLocationForRoute,
                        { longitude: userPickupCoords[0], latitude: userPickupCoords[1] }
                    );

                    setRouteToPickupGeoJSON(routeData.geoJSON);

                    if (routeData.geoJSON?.geometry?.type === 'LineString' && routeData.geoJSON.geometry.coordinates.length > 0) {
                        setDriverCoords(routeData.geoJSON.geometry.coordinates[0] as [number, number]);
                        setCurrentLegIndex(0);
                    } else {
                        setDriverCoords([driverStartLng, driverStartLat]);
                    }
                } catch (error: any) {
                    Alert.alert('Route Error', error.message || 'Failed to calculate route for driver to pickup.');
                } finally {
                    setIsLoadingRoute(false);
                }
            };

            calculateRoute();
        }
    }, [userPickupCoords, driverStartLat, driverStartLng, setRouteToPickupGeoJSON, setDriverCoords, setCurrentLegIndex, setIsLoadingRoute]);

    return {
        directionsService,
    };
};