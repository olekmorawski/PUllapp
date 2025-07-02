import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration - Replace with your actual API keys
const GOOGLE_MAPS_API_KEY = 'AIzaSyD7Z9TTNdp6ko6N2w5EqMLoqdCsB_mlBRk';
const MAPBOX_ACCESS_TOKEN = 'pk.eyJ1Ijoib2xla21vcmF3c2tpIiwiYSI6ImNtY21jaXZnYTBnaTAybHMzMWp4cnB2MmYifQ.gmAgP14PfVyDhelFkHeFsg';

// ===== TYPE DEFINITIONS =====

// Use expo-location types for full location data
export type LocationData = Location.LocationObject;
export type FullLocationCoords = Location.LocationObjectCoords;

// Flexible coordinate types for our APIs
export interface SimpleCoords {
    latitude: number;
    longitude: number;
}

// Union type that accepts both simple and full coordinates
export type LocationCoords = SimpleCoords | FullLocationCoords;

// Utility type for input parameters - accepts simple coords, full coords, or location objects
export type LocationInput = LocationCoords | LocationData | string;

// Custom types for our services
export interface PlaceResult {
    id: string;
    title: string;
    subtitle: string;
    fullAddress: string;
    coordinates?: SimpleCoords; // Use simple coords for place results
    placeId?: string;
    types?: string[];
}

export interface DirectionsResult {
    coordinates: SimpleCoords[]; // Use simple coords for route display
    distance: number;
    duration: number;
    distanceText: string;
    durationText: string;
    instructions: DirectionInstruction[];
    bounds: any;
    rawResponse: any;
}

export interface DirectionInstruction {
    instruction: string;
    distance: string;
    duration: string;
    coordinates: SimpleCoords[];
}

export interface DirectionsOptions {
    mode?: string;
    language?: string;
    alternatives?: string;
    avoid?: string;
    departure_time?: string;
    waypoints?: LocationInput[];
    optimizeWaypoints?: boolean;
    additionalParams?: Record<string, string>;
}

export interface PlacesSearchOptions {
    sessionId?: string;
    types?: string;
    language?: string;
    components?: string;
    location?: LocationCoords;
    radius?: string;
    limit?: number;
    country?: string;
    additionalParams?: Record<string, string>;
}

export interface PermissionStatus {
    foreground: Location.PermissionStatus;
    background: Location.PermissionStatus;
}

// Fixed tracking options interface
export interface RealTimeTrackingOptions {
    baseInterval?: number;
    speedThreshold?: number;
    accuracy?: Location.Accuracy;
    timeInterval?: number;
    distanceInterval?: number;
    mayShowUserSettingsDialog?: boolean;
}

// ===== UTILITY FUNCTIONS =====

// Helper function to convert any location input to a simple coordinate
function toSimpleCoords(location: LocationInput): SimpleCoords {
    if (typeof location === 'string') {
        // Parse string coordinates like "37.7749,-122.4194"
        const [lat, lng] = location.split(',').map(Number);
        return { latitude: lat, longitude: lng };
    }

    if ('coords' in location) {
        // It's a LocationData object
        return {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
        };
    }

    // It's already coordinates (simple or full)
    return {
        latitude: location.latitude,
        longitude: location.longitude
    };
}

// Helper function to create full location coords when needed
function toFullLocationCoords(coords: SimpleCoords): FullLocationCoords {
    return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitude: null,
        accuracy: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
    };
}

// ===== LOCATION SERVICE =====

export class LocationService {
    private static locationSubscription: Location.LocationSubscription | null = null;
    private static lastKnownLocation: LocationData | null = null;

    static async requestPermissions(): Promise<PermissionStatus> {
        try {
            const foregroundStatus = await Location.requestForegroundPermissionsAsync();

            if (foregroundStatus.status === 'granted') {
                const backgroundStatus = await Location.requestBackgroundPermissionsAsync();
                return {
                    foreground: foregroundStatus.status,
                    background: backgroundStatus.status
                };
            }

            return {
                foreground: foregroundStatus.status,
                background: 'denied' as Location.PermissionStatus
            };
        } catch (error) {
            console.error('Permission request error:', error);
            return {
                foreground: 'denied' as Location.PermissionStatus,
                background: 'denied' as Location.PermissionStatus
            };
        }
    }

    static async getCurrentLocationWithFallback(): Promise<LocationData> {
        try {
            // Use correct LocationOptions with proper timeout handling
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeInterval: 10000, // Use timeInterval instead of timeout
                distanceInterval: 1
            });

            this.lastKnownLocation = location;
            await this.cacheLocation(location);
            return location;
        } catch (error) {
            console.warn('High accuracy failed, trying balanced:', error);

            try {
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 15000
                });

                this.lastKnownLocation = location;
                return location;
            } catch (fallbackError) {
                console.error('All location attempts failed:', fallbackError);

                // Return cached location if available
                const cachedLocation = await this.getCachedLocation();
                if (cachedLocation) {
                    return cachedLocation;
                }

                throw new Error('Unable to get location');
            }
        }
    }

    static async startLocationTracking(
        callback: (location: LocationData) => void,
        options: RealTimeTrackingOptions = {}
    ): Promise<Location.LocationSubscription> {
        // Convert our options to expo-location format
        const locationOptions: Location.LocationOptions = {
            accuracy: options.accuracy || Location.Accuracy.High,
            timeInterval: options.timeInterval || 4000,
            distanceInterval: options.distanceInterval || 10,
            mayShowUserSettingsDialog: options.mayShowUserSettingsDialog
        };

        try {
            this.locationSubscription = await Location.watchPositionAsync(
                locationOptions,
                (location: LocationData) => {
                    this.lastKnownLocation = location;
                    this.cacheLocation(location);
                    callback(location);
                }
            );

            return this.locationSubscription;
        } catch (error) {
            console.error('Location tracking setup failed:', error);
            throw error;
        }
    }

    static stopLocationTracking(): void {
        if (this.locationSubscription) {
            this.locationSubscription.remove();
            this.locationSubscription = null;
        }
    }

    static async cacheLocation(location: LocationData): Promise<void> {
        try {
            await AsyncStorage.setItem('lastKnownLocation', JSON.stringify(location));
        } catch (error) {
            console.error('Failed to cache location:', error);
        }
    }

    static async getCachedLocation(): Promise<LocationData | null> {
        try {
            const cached = await AsyncStorage.getItem('lastKnownLocation');
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Failed to get cached location:', error);
            return null;
        }
    }

    // Updated to handle flexible location inputs
    static formatLocationForAPI(location: LocationInput): string {
        if (typeof location === 'string') return location;

        const coords = toSimpleCoords(location);
        return `${coords.latitude},${coords.longitude}`;
    }
}

// ===== DIRECTIONS SERVICE =====

export class DirectionsService {
    private mapboxAccessToken: string;
    private baseUrl: string;

    constructor(mapboxAccessToken: string = MAPBOX_ACCESS_TOKEN) {
        this.mapboxAccessToken = mapboxAccessToken;
        this.baseUrl = 'https://api.mapbox.com/directions/v5/mapbox';
    }

    async getDirections(
        origin: LocationInput,
        destination: LocationInput,
        options: DirectionsOptions = {}
    ): Promise<DirectionsResult> {
        try {
            const originCoords = toSimpleCoords(origin);
            const destinationCoords = toSimpleCoords(destination);

            let coordinatesParam = `${originCoords.longitude},${originCoords.latitude};${destinationCoords.longitude},${destinationCoords.latitude}`;

            if (options.waypoints && options.waypoints.length > 0) {
                const waypointsStr = options.waypoints
                    .map(point => {
                        const wpCoords = toSimpleCoords(point);
                        return `${wpCoords.longitude},${wpCoords.latitude}`;
                    })
                    .join(';');
                coordinatesParam = `${originCoords.longitude},${originCoords.latitude};${waypointsStr};${destinationCoords.longitude},${destinationCoords.latitude}`;
            }

            const profile = options.mode ? options.mode.toLowerCase() : 'driving'; // Mapbox uses driving, walking, cycling

            const params = new URLSearchParams({
                access_token: this.mapboxAccessToken,
                // profile_type: profile, // Profile is in the URL path, not a query param
                geometries: 'geojson', // Get coordinates in geojson format
                overview: 'full', // Get full overview geometry
                steps: 'true', // Get step-by-step instructions
                alternatives: options.alternatives || 'false',
                language: options.language || 'en',
                ...(options.additionalParams || {})
            });

            // Mapbox specific options if needed (e.g., avoid toll, avoid highway)
            if (options.avoid) {
                // Mapbox uses exclude: 'toll' or exclude: 'motorway' etc.
                // This needs more specific mapping if Google's 'avoid' values were used extensively
                if (options.avoid.includes('tolls')) params.append('exclude', 'toll');
                if (options.avoid.includes('highways')) params.append('exclude', 'motorway');
                // Add more mappings as needed
            }


            const response = await fetch(`${this.baseUrl}/${profile}/${coordinatesParam}?${params}`);
            const data = await response.json();

            return this.parseMapboxDirectionsResponse(data);
        } catch (error) {
            console.error('Mapbox Directions API Error:', error);
            throw new Error(`Failed to get directions: ${(error as Error).message}`);
        }
    }

    private parseMapboxDirectionsResponse(data: any): DirectionsResult {
        if (data.code !== 'Ok') {
            throw new Error(`Mapbox Directions API Error: ${data.code} - ${data.message || 'Unknown error'}`);
        }

        const route = data.routes[0];
        if (!route) {
            throw new Error('No route found');
        }

        // Mapbox returns coordinates as [longitude, latitude]
        const routeCoordinates = route.geometry.coordinates.map((coord: number[]) => ({
            latitude: coord[1],
            longitude: coord[0]
        }));

        const instructions: DirectionInstruction[] = [];
        route.legs.forEach((leg: any) => {
            leg.steps.forEach((step: any) => {
                instructions.push({
                    instruction: step.maneuver.instruction,
                    distance: this.formatDistance(step.distance),
                    duration: this.formatDuration(step.duration),
                    // Step geometry might not always be present or as detailed as polyline
                    // For simplicity, we're using the main route geometry.
                    // If per-step geometry is needed, it would require step.geometry.coordinates
                    coordinates: step.geometry?.coordinates?.map((coord: number[]) => ({
                        latitude: coord[1],
                        longitude: coord[0],
                    })) || []
                });
            });
        });

        const totalDistance = route.distance; // in meters
        const totalDuration = route.duration; // in seconds

        return {
            coordinates: routeCoordinates,
            distance: totalDistance,
            duration: totalDuration,
            distanceText: this.formatDistance(totalDistance),
            durationText: this.formatDuration(totalDuration),
            instructions: instructions,
            bounds: { // Mapbox provides bbox [minLng, minLat, maxLng, maxLat]
                      // This might need adjustment if the previous 'bounds' format was different
                southwest: { latitude: route.bbox[1], longitude: route.bbox[0] },
                northeast: { latitude: route.bbox[3], longitude: route.bbox[2] }
            },
            rawResponse: data
        };
    }

    private formatDistance(distanceInMeters: number): string {
        if (distanceInMeters < 1000) {
            return `${Math.round(distanceInMeters)} m`;
        }
        return `${(distanceInMeters / 1000).toFixed(1)} km`;
    }

    private formatDuration(durationInSeconds: number): string {
        const minutes = Math.round(durationInSeconds / 60);
        if (minutes < 60) {
            return `${minutes} min`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
            return `${hours} hr`;
        }
        return `${hours} hr ${remainingMinutes} min`;
    }

    // decodePolyline is not needed for Mapbox if using geometries=geojson
}

// ===== PLACES SERVICE =====

export class PlacesService {
    private apiKey: string; // Still keeping for Google if it were a fallback, but we're defaulting to Mapbox
    private useMapbox: boolean;
    private sessionTokens: Map<string, string>; // Google specific, might not be needed for Mapbox
    private mapboxToken?: string;
    private baseUrl: string;
    public developmentMode: boolean = true; // Enable mock data by default

    constructor(apiKey: string = GOOGLE_MAPS_API_KEY, useMapbox: boolean = true) { // Default useMapbox to true
        this.apiKey = apiKey; // Google API Key
        this.useMapbox = useMapbox;
        this.sessionTokens = new Map(); // Primarily for Google Places

        if (this.useMapbox) {
            this.mapboxToken = MAPBOX_ACCESS_TOKEN;
            this.baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
        } else {
            // Fallback to Google if explicitly set, though we intend to use Mapbox
            this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
        }
    }

    async searchPlaces(query: string, options: PlacesSearchOptions = {}): Promise<PlaceResult[]> {
        // Return mock data during development
        if (this.developmentMode) {
            return this.getMockSearchResults(query);
        }

        if (this.useMapbox) {
            return this.searchWithMapbox(query, options);
        } else {
            return this.searchWithGoogle(query, options);
        }
    }

    // Mock search results for development - returns simple coordinates
    private getMockSearchResults(query: string): Promise<PlaceResult[]> {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    {
                        id: 'mock-1',
                        title: `${query} - Coffee Shop`,
                        subtitle: 'San Francisco, CA, USA',
                        fullAddress: `${query}, San Francisco, CA, USA`,
                        coordinates: {
                            latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
                            longitude: -122.4194 + (Math.random() - 0.5) * 0.01
                        }
                    },
                    {
                        id: 'mock-2',
                        title: `${query} - Restaurant`,
                        subtitle: 'Oakland, CA, USA',
                        fullAddress: `${query}, Oakland, CA, USA`,
                        coordinates: {
                            latitude: 37.8044 + (Math.random() - 0.5) * 0.01,
                            longitude: -122.2711 + (Math.random() - 0.5) * 0.01
                        }
                    },
                    {
                        id: 'mock-3',
                        title: `${query} - Mall`,
                        subtitle: 'San Jose, CA, USA',
                        fullAddress: `${query}, San Jose, CA, USA`,
                        coordinates: {
                            latitude: 37.3382 + (Math.random() - 0.5) * 0.01,
                            longitude: -121.8863 + (Math.random() - 0.5) * 0.01
                        }
                    }
                ]);
            }, 300);
        });
    }

    private async searchWithGoogle(query: string, options: PlacesSearchOptions = {}): Promise<PlaceResult[]> {
        try {
            const sessionId = options.sessionId || 'default';
            let sessionToken = this.sessionTokens.get(sessionId);

            if (!sessionToken) {
                sessionToken = this.generateSessionToken();
                this.sessionTokens.set(sessionId, sessionToken);
            }

            const params = new URLSearchParams({
                input: query,
                key: this.apiKey,
                sessiontoken: sessionToken,
                types: options.types || 'establishment',
                language: options.language || 'en',
                components: options.components || '',
                ...options.additionalParams
            });

            if (options.location) {
                params.append('location', LocationService.formatLocationForAPI(options.location));
                params.append('radius', options.radius || '50000');
            }

            const response = await fetch(`${this.baseUrl}/autocomplete/json?${params}`);
            const data = await response.json();

            if (data.status !== 'OK') {
                throw new Error(`Places API Error: ${data.status}`);
            }

            return data.predictions.map((prediction: any) => ({
                id: prediction.place_id,
                title: prediction.structured_formatting.main_text,
                subtitle: prediction.structured_formatting.secondary_text || '',
                fullAddress: prediction.description,
                placeId: prediction.place_id,
                types: prediction.types
            }));
        } catch (error) {
            console.error('Google Places search error:', error);
            throw error;
        }
    }

    private async searchWithMapbox(query: string, options: PlacesSearchOptions = {}): Promise<PlaceResult[]> {
        try {
            const params = new URLSearchParams({
                access_token: this.mapboxToken!,
                limit: String(options.limit || 5),
                types: options.types || 'poi,address',
                language: options.language || 'en',
                ...options.additionalParams
            });

            if (options.location) {
                const location = LocationService.formatLocationForAPI(options.location);
                params.append('proximity', location);
            }

            if (options.country) {
                params.append('country', options.country);
            }

            const response = await fetch(
                `${this.baseUrl}/${encodeURIComponent(query)}.json?${params}`
            );
            const data = await response.json();

            return data.features.map((feature: any) => ({
                id: feature.id,
                title: feature.text,
                subtitle: feature.place_name.replace(feature.text + ', ', ''),
                fullAddress: feature.place_name,
                coordinates: {
                    latitude: feature.center[1],
                    longitude: feature.center[0]
                },
                types: feature.place_type
            }));
        } catch (error) {
            console.error('Mapbox search error:', error);
            throw error;
        }
    }

    async getPlaceDetails(
        placeId: string,
        sessionId: string = 'default',
        fields: string[] = ['geometry', 'name', 'formatted_address']
    ): Promise<any> {
        if (this.useMapbox) {
            // Mapbox doesn't need separate place details call
            return null;
        }

        try {
            const sessionToken = this.sessionTokens.get(sessionId);
            const fieldsString = fields.join(',');

            const params = new URLSearchParams({
                place_id: placeId,
                fields: fieldsString,
                key: this.apiKey
            });

            if (sessionToken) {
                params.append('sessiontoken', sessionToken);
            }

            const response = await fetch(`${this.baseUrl}/details/json?${params}`);
            const data = await response.json();

            // Clear session token after place details request
            this.sessionTokens.delete(sessionId);

            if (data.status !== 'OK') {
                throw new Error(`Place Details API Error: ${data.status}`);
            }

            const result = data.result;
            return {
                placeId: result.place_id,
                name: result.name,
                address: result.formatted_address,
                coordinates: {
                    latitude: result.geometry.location.lat,
                    longitude: result.geometry.location.lng
                },
                types: result.types
            };
        } catch (error) {
            console.error('Place details error:', error);
            throw error;
        }
    }

    private generateSessionToken(): string {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
}

// ===== REAL-TIME TRACKING SERVICE =====

export class RealTimeTrackingService {
    private baseInterval: number;
    private speedThreshold: number; // m/s
    public isTracking: boolean;
    private subscribers: Set<(location: LocationData) => void>;
    public lastLocation: LocationData | null;
    private currentTrackingOptions: RealTimeTrackingOptions;
    private locationSubscription: Location.LocationSubscription | null;

    constructor(options: RealTimeTrackingOptions = {}) {
        this.baseInterval = options.baseInterval || 5000; // Default 5 seconds
        this.speedThreshold = options.speedThreshold || 2; // Default 2 m/s (7.2 km/h)
        this.isTracking = false;
        this.subscribers = new Set();
        this.lastLocation = null;
        this.currentTrackingOptions = {
            accuracy: Location.Accuracy.High,
            timeInterval: this.baseInterval,
            distanceInterval: 10, // meters
            mayShowUserSettingsDialog: true,
            baseInterval: this.baseInterval,
            speedThreshold: this.speedThreshold
        };
        this.locationSubscription = null;
    }

    subscribe(callback: (location: LocationData) => void): () => void {
        this.subscribers.add(callback);
        return () => {
            this.subscribers.delete(callback);
        };
    }

    private calculateOptimalInterval(location: LocationData): number {
        const speed = location.coords?.speed || 0;
        const validSpeed = (speed !== null && speed !== undefined && speed >= 0) ? speed : 0;

        if (validSpeed > this.speedThreshold) {
            return Math.max(1000, (this.currentTrackingOptions.timeInterval || this.baseInterval) * 0.5);
        } else if (validSpeed < 0.5) { // Very slow or stationary
            return Math.min(20000, (this.currentTrackingOptions.timeInterval || this.baseInterval) * 3);
        }
        return this.currentTrackingOptions.timeInterval || this.baseInterval;
    }

    async startTracking(options: RealTimeTrackingOptions = {}): Promise<void> {
        if (this.isTracking) {
            console.warn('RealTimeTrackingService: Tracking already started.');
            return;
        }

        try {
            const permissions = await LocationService.requestPermissions();
            if (permissions.foreground !== 'granted') {
                throw new Error('Location permission not granted for real-time tracking.');
            }

            this.isTracking = true;
            this.currentTrackingOptions = {
                ...this.currentTrackingOptions,
                timeInterval: this.baseInterval,
                ...options,
            };

            if (options.timeInterval === undefined) {
                this.currentTrackingOptions.timeInterval = this.baseInterval;
            }

            await this._startInternalTracking();
            console.log('RealTimeTrackingService: Tracking started with options:', JSON.stringify(this.currentTrackingOptions));
        } catch (error) {
            this.isTracking = false;
            console.error('RealTimeTrackingService: Failed to start tracking:', error);
            throw error;
        }
    }

    private async _startInternalTracking(): Promise<void> {
        if (this.locationSubscription) {
            this.locationSubscription.remove();
            this.locationSubscription = null;
        }

        this.locationSubscription = await LocationService.startLocationTracking(
            (location: LocationData) => {
                this.lastLocation = location;
                this.subscribers.forEach(callback => {
                    try {
                        callback(location);
                    } catch (error) {
                        console.error('RealTimeTrackingService: Subscriber callback error:', error);
                    }
                });

                const newInterval = this.calculateOptimalInterval(location);
                if (newInterval !== this.currentTrackingOptions.timeInterval && this.isTracking) {
                    console.log(`RealTimeTrackingService: Adapting interval from ${this.currentTrackingOptions.timeInterval}ms to ${newInterval}ms. Speed: ${location.coords?.speed?.toFixed(2)} m/s`);
                    this.currentTrackingOptions.timeInterval = newInterval;

                    setTimeout(async () => {
                        if (this.isTracking) {
                            await this._restartTracking();
                        }
                    }, 0);
                }
            },
            this.currentTrackingOptions
        );
    }

    private async _restartTracking(): Promise<void> {
        if (!this.isTracking) {
            console.log('RealTimeTrackingService: Tracking was stopped, aborting restart.');
            return;
        }

        console.log('RealTimeTrackingService: Restarting tracking with new interval:', this.currentTrackingOptions.timeInterval);

        LocationService.stopLocationTracking();
        this.locationSubscription = null;

        await new Promise(resolve => setTimeout(resolve, 100));

        if (this.isTracking) {
            try {
                await this._startInternalTracking();
            } catch (error) {
                console.error('RealTimeTrackingService: Failed to restart tracking:', error);
                this.isTracking = false;
            }
        }
    }

    stopTracking(): void {
        if (!this.isTracking) {
            return;
        }

        console.log('RealTimeTrackingService: Stopping tracking.');
        LocationService.stopLocationTracking();
        this.locationSubscription = null;
        this.isTracking = false;
    }

    getLastLocation(): LocationData | null {
        return this.lastLocation;
    }

    isCurrentlyTracking(): boolean {
        return this.isTracking;
    }
}

// ===== EXPORT SINGLETON INSTANCES =====

export const directionsService = new DirectionsService(MAPBOX_ACCESS_TOKEN); // Ensure it gets the token
export const placesService = new PlacesService(GOOGLE_MAPS_API_KEY, true); // Explicitly use Mapbox
export const trackingService = new RealTimeTrackingService({ baseInterval: 5000 });

// ===== EXPORT UTILITY FUNCTIONS =====

export { toSimpleCoords, toFullLocationCoords };