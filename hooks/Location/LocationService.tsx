// hooks/Location/LocationService.tsx
// Option 2: Switch to Google Places API (if you want to unify your mapping stack)

import { PlaceResult, SearchOptions } from '@/components/BottomSheet/types';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY';

class PlacesService {
    private placesUrl = 'https://maps.googleapis.com/maps/api/place';
    private geocodeUrl = 'https://maps.googleapis.com/maps/api/geocode';

    async searchPlaces(query: string, options: SearchOptions = {}): Promise<PlaceResult[]> {
        if (!query || query.trim().length < 2) {
            return [];
        }

        try {
            // Use Places API Text Search
            const params = new URLSearchParams({
                query: query,
                key: GOOGLE_MAPS_API_KEY,
                language: options.language || 'en',
            });

            // Add location bias if provided
            if (options.location) {
                params.append('location', `${options.location.latitude},${options.location.longitude}`);
                params.append('radius', '50000'); // 50km radius
            }

            const url = `${this.placesUrl}/textsearch/json?${params.toString()}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
                throw new Error(data.error_message || 'Places search failed');
            }

            if (!data.results || data.results.length === 0) {
                return [];
            }

            return data.results.slice(0, options.limit || 5).map((place: any) => ({
                id: place.place_id,
                title: place.name,
                subtitle: this.extractSubtitle(place.formatted_address),
                fullAddress: place.formatted_address,
                coordinates: {
                    latitude: place.geometry.location.lat,
                    longitude: place.geometry.location.lng,
                },
                placeId: place.place_id,
            }));
        } catch (error) {
            console.error('Google Places search error:', error);
            throw new Error(`Places API Error: ${error instanceof Error ? error.message : 'Search failed'}`);
        }
    }

    async getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
        try {
            const params = new URLSearchParams({
                place_id: placeId,
                key: GOOGLE_MAPS_API_KEY,
                fields: 'name,formatted_address,geometry',
            });

            const url = `${this.placesUrl}/details/json?${params.toString()}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.status !== 'OK' || !data.result) {
                return null;
            }

            const place = data.result;
            return {
                id: placeId,
                title: place.name,
                subtitle: this.extractSubtitle(place.formatted_address),
                fullAddress: place.formatted_address,
                coordinates: {
                    latitude: place.geometry.location.lat,
                    longitude: place.geometry.location.lng,
                },
                placeId: placeId,
            };
        } catch (error) {
            console.error('Place details error:', error);
            return null;
        }
    }

    async reverseGeocode(coordinates: { latitude: number; longitude: number }): Promise<string> {
        try {
            const params = new URLSearchParams({
                latlng: `${coordinates.latitude},${coordinates.longitude}`,
                key: GOOGLE_MAPS_API_KEY,
            });

            const url = `${this.geocodeUrl}/json?${params.toString()}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.status !== 'OK' || !data.results || data.results.length === 0) {
                return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
            }

            return data.results[0].formatted_address;
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
        }
    }

    private extractSubtitle(formattedAddress: string): string {
        // Extract city/region from formatted address
        const parts = formattedAddress.split(',');
        if (parts.length > 1) {
            return parts.slice(1, 3).join(',').trim();
        }
        return formattedAddress;
    }
}

// Export singleton instance for use in hooks
export const placesService = new PlacesService();