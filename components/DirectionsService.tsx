import { GOOGLE_MAPS_API_KEY } from '@/constants/Tokens';

interface RouteOptions {
    mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
    alternatives?: boolean;
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    avoidFerries?: boolean;
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

// Decode Google's polyline encoding
const decodePolyline = (encoded: string): {latitude: number; longitude: number}[] => {
    const coordinates: {latitude: number; longitude: number}[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
        let shift = 0;
        let result = 0;
        let byte: number;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1F) << shift;
            shift += 5;
        } while (byte >= 0x20);

        const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lat += dlat;

        shift = 0;
        result = 0;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1F) << shift;
            shift += 5;
        } while (byte >= 0x20);

        const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
        lng += dlng;

        coordinates.push({
            latitude: lat / 1e5,
            longitude: lng / 1e5
        });
    }

    return coordinates;
};

export class DirectionsService {
    async getDirections(
        origin: { latitude: number; longitude: number },
        destination: { latitude: number; longitude: number },
        options: RouteOptions = {}
    ): Promise<RouteResult> {
        try {
            const mode = options.mode || 'driving';
            const originStr = `${origin.latitude},${origin.longitude}`;
            const destinationStr = `${destination.latitude},${destination.longitude}`;

            const params = new URLSearchParams({
                origin: originStr,
                destination: destinationStr,
                mode: mode,
                key: GOOGLE_MAPS_API_KEY,
                alternatives: options.alternatives ? 'true' : 'false',
            });

            // Add avoid parameters if specified
            const avoidParams = [];
            if (options.avoidTolls) avoidParams.push('tolls');
            if (options.avoidHighways) avoidParams.push('highways');
            if (options.avoidFerries) avoidParams.push('ferries');

            if (avoidParams.length > 0) {
                params.append('avoid', avoidParams.join('|'));
            }

            const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;

            const response = await fetch(url);
            const data = await response.json();

            if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
                throw new Error(data.error_message || 'No route found');
            }

            const route = data.routes[0];
            const leg = route.legs[0];

            // Decode the polyline to get coordinates
            const coordinates = decodePolyline(route.overview_polyline.points);

            // Create GeoJSON
            const geoJSON: GeoJSON.Feature = {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates.map(coord => [coord.longitude, coord.latitude])
                }
            };

            return {
                coordinates,
                distance: leg.distance.value, // in meters
                duration: leg.duration.value, // in seconds
                distanceText: leg.distance.text,
                durationText: leg.duration.text,
                geoJSON,
                steps: leg.steps,
            };
        } catch (error: any) {
            console.error('Directions API Error:', error);
            let message = 'Route calculation failed';

            if (error.message) {
                if (error.message.includes('ZERO_RESULTS')) {
                    message = 'No route could be found between these points';
                } else if (error.message.includes('OVER_QUERY_LIMIT')) {
                    message = 'API quota exceeded. Please try again later.';
                } else if (error.message.includes('REQUEST_DENIED')) {
                    message = 'Invalid API key or request denied';
                } else if (error.message.includes('INVALID_REQUEST')) {
                    message = 'Invalid request parameters';
                }
            }

            throw new Error(`${message}. Please try again.`);
        }
    }
}