// components/DirectionsService.tsx

import {Geometry, Feature} from "geojson";

interface RouteOptions {
    mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
    alternatives?: boolean;
    avoid?: ('tolls' | 'highways' | 'ferries')[];
    departureTime?: Date;
}

interface RouteResult {
    coordinates: {latitude: number; longitude: number}[];
    distance: number;
    duration: number;
    distanceText: string;
    durationText: string;
    geoJSON: Feature<Geometry>;
    steps?: any[];
}

export class DirectionsService {
    private googleApiKey: string;

    constructor() {
        // Get API key from app.json or environment
        this.googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY';
    }

    async getDirections(
        origin: { latitude: number; longitude: number },
        destination: { latitude: number; longitude: number },
        options: RouteOptions = {}
    ): Promise<RouteResult> {
        try {
            const mode = options.mode || 'driving';
            const originStr = `${origin.latitude},${origin.longitude}`;
            const destStr = `${destination.latitude},${destination.longitude}`;

            const params = new URLSearchParams({
                origin: originStr,
                destination: destStr,
                mode: mode,
                key: this.googleApiKey,
                alternatives: options.alternatives ? 'true' : 'false',
            });

            if (options.avoid) {
                params.append('avoid', options.avoid.join('|'));
            }

            const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
                throw new Error(data.error_message || 'No route found');
            }

            const route = data.routes[0];
            const leg = route.legs[0];

            // Decode polyline to coordinates
            const coordinates = this.decodePolyline(route.overview_polyline.points);

            // Convert to GeoJSON
            const geoJSON: Feature<Geometry> = {
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: coordinates.map(coord => [coord.longitude, coord.latitude])
                }
            };

            return {
                coordinates,
                distance: leg.distance.value,
                duration: leg.duration.value,
                distanceText: leg.distance.text,
                durationText: leg.duration.text,
                geoJSON,
                steps: leg.steps,
            };
        } catch (error: any) {
            console.error('Google Directions API Error:', error);
            throw new Error('Route calculation failed. Please try again.');
        }
    }

    // Google uses encoded polylines, need to decode them
    private decodePolyline(encoded: string): {latitude: number; longitude: number}[] {
        const points: {latitude: number; longitude: number}[] = [];
        let index = 0;
        let lat = 0;
        let lng = 0;

        while (index < encoded.length) {
            let b;
            let shift = 0;
            let result = 0;

            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
            lat += dlat;

            shift = 0;
            result = 0;

            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
            lng += dlng;

            points.push({
                latitude: lat / 1e5,
                longitude: lng / 1e5,
            });
        }

        return points;
    }
}