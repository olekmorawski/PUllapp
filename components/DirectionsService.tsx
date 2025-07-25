// components/DirectionsService.tsx - Optimized version
import { MAPBOX_ACCESS_TOKEN } from '@/constants/Tokens';
import {Feature} from "geojson";

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
    geoJSON: Feature;
    steps?: any[];
}

interface CacheEntry {
    result: RouteResult;
    timestamp: number;
}

export class DirectionsService {
    private cache = new Map<string, CacheEntry>();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    private pendingRequests = new Map<string, Promise<RouteResult>>();

    private createCacheKey(
        origin: { latitude: number; longitude: number },
        destination: { latitude: number; longitude: number },
        options: RouteOptions = {}
    ): string {
        const profile = options.profile || 'driving-traffic';
        return `${origin.latitude.toFixed(6)},${origin.longitude.toFixed(6)}-${destination.latitude.toFixed(6)},${destination.longitude.toFixed(6)}-${profile}`;
    }

    private isValidCache(entry: CacheEntry): boolean {
        return Date.now() - entry.timestamp < this.CACHE_DURATION;
    }

    private async fetchDirections(
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

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            try {
                const response = await fetch(`${url}?${params.toString()}`, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                    }
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    let errorMessage = `HTTP ${response.status}`;

                    try {
                        const errorData = JSON.parse(errorText);
                        errorMessage = errorData.message || errorMessage;
                    } catch {
                        // If can't parse JSON, use the raw text
                        errorMessage = errorText || errorMessage;
                    }

                    throw new Error(`API request failed: ${errorMessage}`);
                }

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
                clearTimeout(timeoutId);

                if (error.name === 'AbortError') {
                    throw new Error('Request timeout. Please try again.');
                }

                throw error;
            }
        } catch (error: any) {
            console.error('Directions API Error:', error);

            let message = 'Route calculation failed';

            if (error.message) {
                if (error.message.includes('No route found')) {
                    message = 'No route could be found between these points';
                } else if (error.message.includes('Profile not found')) {
                    message = 'Invalid transportation mode';
                } else if (error.message.includes('timeout') || error.message.includes('network')) {
                    message = 'Network error. Please check your connection and try again';
                } else {
                    message = error.message;
                }
            }

            throw new Error(message);
        }
    }

    async getDirections(
        origin: { latitude: number; longitude: number },
        destination: { latitude: number; longitude: number },
        options: RouteOptions = {}
    ): Promise<RouteResult> {
        // Validate coordinates
        if (!this.isValidCoordinate(origin) || !this.isValidCoordinate(destination)) {
            throw new Error('Invalid coordinates provided');
        }

        // Check if origin and destination are too close
        const distance = this.calculateDistance(origin, destination);
        if (distance < 0.01) { // Less than 10 meters
            throw new Error('Origin and destination are too close');
        }

        const cacheKey = this.createCacheKey(origin, destination, options);

        // Check cache first
        const cachedEntry = this.cache.get(cacheKey);
        if (cachedEntry && this.isValidCache(cachedEntry)) {
            return cachedEntry.result;
        }

        // Check if there's already a pending request for this route
        const pendingRequest = this.pendingRequests.get(cacheKey);
        if (pendingRequest) {
            return pendingRequest;
        }

        // Create new request
        const requestPromise = this.fetchDirections(origin, destination, options);
        this.pendingRequests.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;

            // Cache the result
            this.cache.set(cacheKey, {
                result,
                timestamp: Date.now()
            });

            return result;
        } finally {
            // Remove from pending requests
            this.pendingRequests.delete(cacheKey);
        }
    }

    private isValidCoordinate(coord: { latitude: number; longitude: number }): boolean {
        return (
            typeof coord.latitude === 'number' &&
            typeof coord.longitude === 'number' &&
            !isNaN(coord.latitude) &&
            !isNaN(coord.longitude) &&
            coord.latitude >= -90 &&
            coord.latitude <= 90 &&
            coord.longitude >= -180 &&
            coord.longitude <= 180
        );
    }

    private calculateDistance(
        coord1: { latitude: number; longitude: number },
        coord2: { latitude: number; longitude: number }
    ): number {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
        const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
        const a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Clear cache manually if needed
    clearCache(): void {
        this.cache.clear();
        this.pendingRequests.clear();
    }

    // Clear expired cache entries
    clearExpiredCache(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp >= this.CACHE_DURATION) {
                this.cache.delete(key);
            }
        }
    }
}