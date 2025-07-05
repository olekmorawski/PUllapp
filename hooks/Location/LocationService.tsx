import { MAPBOX_ACCESS_TOKEN } from '@/constants/Tokens';
import { PlaceResult, SearchOptions } from '@/components/BottomSheet/types';

class PlacesService {
    private baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

    async searchPlaces(query: string, options: SearchOptions = {}): Promise<PlaceResult[]> {
        if (!query || query.trim().length < 2) {
            return [];
        }

        try {
            const params = new URLSearchParams({
                access_token: MAPBOX_ACCESS_TOKEN,
                autocomplete: 'true',
                limit: (options.limit || 5).toString(),
                language: options.language || 'en',
            });

            // Add proximity bias if user location is provided
            if (options.location) {
                params.append('proximity', `${options.location.longitude},${options.location.latitude}`);
            }

            // Add types filter if provided
            if (options.types) {
                const mapboxTypes = this.convertToMapboxTypes(options.types);
                if (mapboxTypes) {
                    params.append('types', mapboxTypes);
                }
            }

            const encodedQuery = encodeURIComponent(query);
            const url = `${this.baseUrl}/${encodedQuery}.json?${params.toString()}`;

            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Geocoding request failed');
            }

            if (!data.features || data.features.length === 0) {
                return [];
            }

            return data.features.map((feature: any) => this.formatPlaceResult(feature));
        } catch (error) {
            console.error('Places search error:', error);
            throw new Error(`Places API Error: ${error instanceof Error ? error.message : 'Search failed'}`);
        }
    }

    async getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
        try {
            const params = new URLSearchParams({
                access_token: MAPBOX_ACCESS_TOKEN,
                limit: '1',
            });

            const url = `${this.baseUrl}/${encodeURIComponent(placeId)}.json?${params.toString()}`;
            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok || !data.features || data.features.length === 0) {
                return null;
            }

            return this.formatPlaceResult(data.features[0]);
        } catch (error) {
            console.error('Place details error:', error);
            return null;
        }
    }

    async reverseGeocode(coordinates: { latitude: number; longitude: number }): Promise<string> {
        try {
            const params = new URLSearchParams({
                access_token: MAPBOX_ACCESS_TOKEN,
                limit: '1',
            });

            const url = `${this.baseUrl}/${coordinates.longitude},${coordinates.latitude}.json?${params.toString()}`;
            const response = await fetch(url);
            const data = await response.json();

            if (!response.ok || !data.features || data.features.length === 0) {
                return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
            }

            return data.features[0].place_name;
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
        }
    }

    private formatPlaceResult(feature: any): PlaceResult {
        const { properties, geometry, place_name, text, context = [] } = feature;

        // Extract components from context
        const components = this.parseContext(context);

        // Build title and subtitle
        const title = text || place_name.split(',')[0];
        const subtitle = components.locality || components.place || components.region || '';

        return {
            id: feature.id || `${geometry.coordinates[0]},${geometry.coordinates[1]}`,
            title: title,
            subtitle: subtitle,
            fullAddress: place_name,
            coordinates: {
                latitude: geometry.coordinates[1],
                longitude: geometry.coordinates[0],
            },
            placeId: place_name,
        };
    }

    private parseContext(context: any[]): Record<string, string> {
        const components: Record<string, string> = {};

        context.forEach((item: any) => {
            const [type] = item.id.split('.');
            components[type] = item.text;
        });

        return components;
    }

    private convertToMapboxTypes(googleTypes: string): string {
        const typeMapping: Record<string, string[]> = {
            'establishment': ['poi'],
            'address': ['address'],
            'establishment,address': ['poi', 'address'],
        };

        const types = typeMapping[googleTypes];
        return types ? types.join(',') : 'poi,address';
    }
}

// Export singleton instance for use in hooks
export const placesService = new PlacesService();