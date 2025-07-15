import { MAPBOX_ACCESS_TOKEN } from '@/constants/Tokens';

interface RouteOptions {
    profile?: 'driving' | 'walking' | 'cycling' | 'driving-traffic';
    alternatives?: boolean;
    steps?: boolean;
    overview?: 'full' | 'simplified' | 'false';
}

interface RouteResult {
    coordinates: {latitude: number; longitude: number}[];
    distance: number;
    duration: number;
    distanceText: string;
    durationText: string;
    geoJSON: GeoJSON.Feature;
    steps?: any[];
}

export class DirectionsService {
    async getDirections(
        origin: { latitude: number; longitude: number },
        destination: { latitude: number; longitude: number },
        options: RouteOptions = {}
    ): Promise<RouteResult> {
        try {
            const profile = options.profile || 'driving-traffic';
            const coords = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
            const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}`;

            const params = new URLSearchParams({
                access_token: MAPBOX_ACCESS_TOKEN,
                geometries: 'geojson',
                steps: options.steps ? 'true' : 'false',
                overview: options.overview || 'full',
                alternatives: options.alternatives ? 'true' : 'false'
            });

            const response = await fetch(`${url}?${params.toString()}`);
            const data = await response.json();

            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                throw new Error(data.message || 'No route found');
            }

            const route = data.routes[0];
            const coordinates = route.geometry.coordinates.map((coord: [number, number]) => ({
                latitude: coord[1],
                longitude: coord[0],
            }));

            return {
                coordinates,
                distance: route.distance,
                duration: route.duration,
                distanceText: `${(route.distance / 1000).toFixed(1)} km`,
                durationText: `${Math.floor(route.duration / 60)} min`,
                geoJSON: {
                    type: 'Feature',
                    properties: {},
                    geometry: route.geometry,
                },
                steps: route.legs?.[0]?.steps,
            };
        } catch (error: any) {
            console.error('Directions API Error:', error);
            let message = 'Route calculation failed';

            if (error.message) {
                if (error.message.includes('No route found')) {
                    message = 'No route could be found between these points';
                } else if (error.message.includes('Profile not found')) {
                    message = 'Invalid transportation mode';
                }
            }

            throw new Error(`${message}. Please try again.`);
        }
    }
}