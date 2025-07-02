import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration - Replace with your actual API keys
const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';
const MAPBOX_ACCESS_TOKEN = 'YOUR_MAPBOX_ACCESS_TOKEN';

// Location Service for precise geolocation
export class LocationService {
    static locationSubscription = null;
    static lastKnownLocation = null;

    static async requestPermissions() {
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
                background: 'denied'
            };
        } catch (error) {
            console.error('Permission request error:', error);
            return { foreground: 'denied', background: 'denied' };
        }
    }

    static async getCurrentLocationWithFallback() {
        try {
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeout: 10000
            });

            this.lastKnownLocation = location;
            await this.cacheLocation(location);
            return location;
        } catch (error) {
            console.warn('High accuracy failed, trying balanced:', error);

            try {
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                    timeout: 15000
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

    static async startLocationTracking(callback, options = {}) {
        const defaultOptions = {
            accuracy: Location.Accuracy.High,
            timeInterval: 4000, // 4 seconds
            distanceInterval: 10, // 10 meters
            ...options
        };

        try {
            this.locationSubscription = await Location.watchPositionAsync(
                defaultOptions,
                (location) => {
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

    static stopLocationTracking() {
        if (this.locationSubscription) {
            this.locationSubscription.remove();
            this.locationSubscription = null;
        }
    }

    static async cacheLocation(location) {
        try {
            await AsyncStorage.setItem('lastKnownLocation', JSON.stringify(location));
        } catch (error) {
            console.error('Failed to cache location:', error);
        }
    }

    static async getCachedLocation() {
        try {
            const cached = await AsyncStorage.getItem('lastKnownLocation');
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.error('Failed to get cached location:', error);
            return null;
        }
    }

    static formatLocationForAPI(location) {
        if (typeof location === 'string') return location;
        if (location?.coords) {
            return `${location.coords.latitude},${location.coords.longitude}`;
        }
        if (location?.latitude && location?.longitude) {
            return `${location.latitude},${location.longitude}`;
        }
        return location;
    }
}

// Directions Service for route calculation
export class DirectionsService {
    constructor(apiKey = GOOGLE_MAPS_API_KEY) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';
    }

    async getDirections(origin, destination, options = {}) {
        try {
            const params = new URLSearchParams({
                origin: LocationService.formatLocationForAPI(origin),
                destination: LocationService.formatLocationForAPI(destination),
                key: this.apiKey,
                mode: options.mode || 'DRIVING',
                language: options.language || 'en',
                alternatives: options.alternatives || 'false',
                avoid: options.avoid || '',
                departure_time: options.departure_time || 'now',
                ...options.additionalParams
            });

            if (options.waypoints && options.waypoints.length > 0) {
                const waypointsStr = options.waypoints
                    .map(point => LocationService.formatLocationForAPI(point))
                    .join('|');

                params.append('waypoints',
                    options.optimizeWaypoints ? `optimize:true|${waypointsStr}` : waypointsStr
                );
            }

            const response = await fetch(`${this.baseUrl}?${params}`);
            const data = await response.json();

            return this.parseDirectionsResponse(data);
        } catch (error) {
            console.error('Directions API Error:', error);
            throw new Error(`Failed to get directions: ${error.message}`);
        }
    }

    parseDirectionsResponse(data) {
        if (data.status !== 'OK') {
            throw new Error(`Directions API Error: ${data.status} - ${data.error_message || 'Unknown error'}`);
        }

        const route = data.routes[0];
        if (!route) {
            throw new Error('No route found');
        }

        const coordinates = this.decodePolyline(route.overview_polyline.points);

        return {
            coordinates,
            distance: route.legs.reduce((total, leg) => total + leg.distance.value, 0),
            duration: route.legs.reduce((total, leg) => total + leg.duration.value, 0),
            distanceText: route.legs.map(leg => leg.distance.text).join(', '),
            durationText: route.legs.map(leg => leg.duration.text).join(', '),
            instructions: route.legs.flatMap(leg =>
                leg.steps.map(step => ({
                    instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
                    distance: step.distance.text,
                    duration: step.duration.text,
                    coordinates: this.decodePolyline(step.polyline.points)
                }))
            ),
            bounds: route.bounds,
            rawResponse: data
        };
    }

    decodePolyline(encoded) {
        if (!encoded) return [];

        const poly = [];
        let index = 0;
        const len = encoded.length;
        let lat = 0;
        let lng = 0;

        while (index < len) {
            let b;
            let shift = 0;
            let result = 0;

            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;

            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);

            const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            poly.push({
                latitude: lat / 1e5,
                longitude: lng / 1e5
            });
        }

        return poly;
    }
}

// Places Search Service for destination finding
export class PlacesService {
    constructor(apiKey = GOOGLE_MAPS_API_KEY, useMapbox = false) {
        this.apiKey = apiKey;
        this.useMapbox = useMapbox;
        this.sessionTokens = new Map();

        if (useMapbox) {
            this.mapboxToken = MAPBOX_ACCESS_TOKEN;
            this.baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
        } else {
            this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
        }
    }

    async searchPlaces(query, options = {}) {
        if (this.useMapbox) {
            return this.searchWithMapbox(query, options);
        } else {
            return this.searchWithGoogle(query, options);
        }
    }

    async searchWithGoogle(query, options = {}) {
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

            return data.predictions.map(prediction => ({
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

    async searchWithMapbox(query, options = {}) {
        try {
            const params = new URLSearchParams({
                access_token: this.mapboxToken,
                limit: options.limit || 5,
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

            return data.features.map(feature => ({
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

    async getPlaceDetails(placeId, sessionId = 'default', fields = ['geometry', 'name', 'formatted_address']) {
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

    generateSessionToken() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
}

// Real-time tracking service
export class RealTimeTrackingService {
    constructor(options = {}) {
        this.baseInterval = options.baseInterval || 4000; // 4 seconds
        this.speedThreshold = options.speedThreshold || 5; // 5 m/s (approx 18 km/h)
        this.isTracking = false;
        this.subscribers = new Set();
        this.lastLocation = null;
        this.currentTrackingOptions = {};
        this.locationSubscription = null; // Stores the subscription from LocationService
    }

    subscribe(callback) {
        this.subscribers.add(callback);
        return () => {
            this.subscribers.delete(callback);
        };
    }

    calculateOptimalInterval(location) {
        const speed = location.coords?.speed || 0; // m/s

        if (speed > this.speedThreshold) { // Faster movement
            return Math.max(1000, this.baseInterval * 0.5); // e.g., 2000ms if base is 4000ms
        } else if (speed < 1) { // Nearly stationary
            return Math.min(30000, this.baseInterval * 4); // e.g., 16000ms if base is 4000ms
        }
        return this.baseInterval; // Standard interval
    }

    async startTracking(options = {}) {
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
                accuracy: Location.Accuracy.High,
                timeInterval: this.baseInterval,
                distanceInterval: 10, // Default distance interval, can be overridden by options
                ...options,
            };

            await this._startInternalTracking();
            console.log('RealTimeTrackingService: Tracking started with interval:', this.currentTrackingOptions.timeInterval);

        } catch (error) {
            this.isTracking = false;
            console.error('RealTimeTrackingService: Failed to start tracking:', error);
            throw error;
        }
    }

    async _startInternalTracking() {
        if (this.locationSubscription) { // Should be cleared by stopLocationTracking
            this.locationSubscription.remove();
            this.locationSubscription = null;
        }

        this.locationSubscription = await LocationService.startLocationTracking(
            (location) => { // Callback on location update
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
                    }, 0); // Schedule restart
                }
            },
            this.currentTrackingOptions
        );
    }

    async _restartTracking() {
        if (!this.isTracking) { // Check if tracking was stopped in the meantime
            console.log('RealTimeTrackingService: Tracking was stopped, aborting restart.');
            return;
        }
        console.log('RealTimeTrackingService: Restarting tracking with new interval:', this.currentTrackingOptions.timeInterval);

        // LocationService.stopLocationTracking() handles removing the old subscription.
        // It's called here to ensure the subscription held by LocationService is cleared.
        LocationService.stopLocationTracking();
        this.locationSubscription = null; // Nullify our reference too.

        // Brief pause before restarting, can sometimes help with stability
        await new Promise(resolve => setTimeout(resolve, 100));

        if (this.isTracking) { // Double check if we should still be tracking
            try {
                await this._startInternalTracking();
            } catch (error) {
                console.error('RealTimeTrackingService: Failed to restart tracking:', error);
                this.isTracking = false; // Consider stopping tracking on restart failure
            }
        }
    }

    stopTracking() {
        if (!this.isTracking) {
            return;
        }
        console.log('RealTimeTrackingService: Stopping tracking.');
        // LocationService.stopLocationTracking() will remove the subscription.
        LocationService.stopLocationTracking();
        this.locationSubscription = null;
        this.isTracking = false;
        // Subscribers are not cleared, allowing them to resubscribe if tracking starts again.
    }

    getLastLocation() {
        return this.lastLocation;
    }

    isCurrentlyTracking() {
        return this.isTracking;
    }
}

// ... LocationService class itself needs a slight modification for startLocationTracking to return the subscription
export class LocationService {
    static locationSubscription = null; // This is the actual subscription object from expo-location
    static lastKnownLocation = null;

    // ... (requestPermissions, getCurrentLocationWithFallback) ...

    static async startLocationTracking(callback, options = {}) { // Modified to return subscription
        const defaultOptions = {
            accuracy: Location.Accuracy.High,
            timeInterval: 4000,
            distanceInterval: 10,
            ...options
        };

        try {
            // Ensure any old subscription is cleared before starting a new one
            // This is crucial if startLocationTracking could be called from multiple places,
            // though primarily RealTimeTrackingService will manage its lifecycle.
            if (this.locationSubscription) {
                this.locationSubscription.remove();
                this.locationSubscription = null;
                console.log("LocationService: Cleared existing watchPositionAsync subscription before starting new one.");
            }

            this.locationSubscription = await Location.watchPositionAsync(
                defaultOptions,
                (location) => {
                    this.lastKnownLocation = location;
                    // Caching location can be done here or by the caller if needed
                    // this.cacheLocation(location);
                    callback(location);
                }
            );
            console.log("LocationService: watchPositionAsync subscription started with interval:", defaultOptions.timeInterval);
            return this.locationSubscription; // Return the subscription object
        } catch (error) {
            console.error('LocationService: Location tracking setup failed:', error);
            throw error;
        }
    }

    static stopLocationTracking() {
        if (this.locationSubscription) {
            this.locationSubscription.remove();
            this.locationSubscription = null;
            console.log("LocationService: watchPositionAsync subscription removed.");
        } else {
            // console.log("LocationService: No active watchPositionAsync subscription to remove.");
        }
    }
    // ... (cacheLocation, getCachedLocation, formatLocationForAPI) ...
}


// Export singleton instances for easy use
export const locationService = new LocationService(); // LocationService itself is not a singleton constructor
export const directionsService = new DirectionsService();
export const placesService = new PlacesService();
// Initialize with a default base interval, e.g., 5 seconds. This can be configured.
export const trackingService = new RealTimeTrackingService({ baseInterval: 5000 });