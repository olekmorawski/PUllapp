// services/OSRMNavigationService.ts - Fixed network issues and improved error handling
import * as Location from 'expo-location';

export interface NavigationCoordinates {
    latitude: number;
    longitude: number;
}

export interface NavigationManeuver {
    type: string;
    modifier?: string;
    bearing_after?: number;
    location: NavigationCoordinates;
}

export interface NavigationInstruction {
    id: string;
    text: string;
    distance: number;
    duration: number;
    coordinates: NavigationCoordinates[];
    maneuver: NavigationManeuver;
    voiceInstruction: string;
}

export interface NavigationRoute {
    coordinates: NavigationCoordinates[];
    instructions: NavigationInstruction[];
    distance: number;
    duration: number;
    geometry: GeoJSON.LineString;
}

export interface NavigationProgress {
    distanceRemaining: number;
    durationRemaining: number;
    distanceTraveled: number;
    fractionTraveled: number;
    currentStepIndex: number;
    currentInstruction?: NavigationInstruction;
    nextInstruction?: NavigationInstruction;
    totalSteps: number;
    location: Location.LocationObjectCoords;
    heading: number;
}

type NavigationEventType =
    | 'navigationStarted'
    | 'progressUpdate'
    | 'newInstruction'
    | 'destinationReached'
    | 'navigationError'
    | 'navigationStopped';

interface NavigationEvents {
    navigationStarted: { route: NavigationRoute; instructions: NavigationInstruction[] };
    progressUpdate: NavigationProgress;
    newInstruction: NavigationInstruction;
    destinationReached: { location: Location.LocationObject };
    navigationError: Error;
    navigationStopped: {};
}

export class OSRMNavigationService {
    private route: NavigationRoute | null = null;
    private instructions: NavigationInstruction[] = [];
    private currentStepIndex: number = 0;
    private currentPosition: Location.LocationObject | null = null;
    private isNavigating: boolean = false;
    private listeners: { [K in NavigationEventType]?: Array<(data: NavigationEvents[K]) => void> } = {};
    private locationSubscription: Location.LocationSubscription | null = null;
    private lastAnnouncedStep: number = -1;

    // Multiple OSRM endpoints for redundancy
    private osrmEndpoints: string[] = [
        'https://router.project-osrm.org',
        // Add more endpoints if needed
    ];

    // Event system with proper typing
    on<T extends NavigationEventType>(event: T, callback: (data: NavigationEvents[T]) => void): void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        (this.listeners[event] as Array<(data: NavigationEvents[T]) => void>).push(callback);
    }

    off<T extends NavigationEventType>(event: T, callback: (data: NavigationEvents[T]) => void): void {
        if (this.listeners[event]) {
            this.listeners[event] = (this.listeners[event] as Array<(data: NavigationEvents[T]) => void>)
                .filter(cb => cb !== callback);
        }
    }

    private emit<T extends NavigationEventType>(event: T, data: NavigationEvents[T]): void {
        if (this.listeners[event]) {
            (this.listeners[event] as Array<(data: NavigationEvents[T]) => void>)
                .forEach(callback => callback(data));
        }
    }

    // Enhanced route calculation with fallback endpoints
    async calculateRoute(start: NavigationCoordinates, destination: NavigationCoordinates): Promise<NavigationRoute> {
        console.log('🗺️ Calculating route from', start, 'to', destination);

        let lastError: Error | null = null;

        // Try each endpoint
        for (const endpoint of this.osrmEndpoints) {
            try {
                const url = `${endpoint}/route/v1/driving/${start.longitude},${start.latitude};${destination.longitude},${destination.latitude}?steps=true&geometries=geojson&overview=full`;

                console.log('🌐 Trying OSRM endpoint:', endpoint);

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Navigation-App/1.0',
                    },
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                if (!data.routes || data.routes.length === 0) {
                    throw new Error('No route found between the specified locations');
                }

                const route = data.routes[0];

                console.log('✅ Route calculated successfully:', {
                    distance: route.distance,
                    duration: route.duration,
                    steps: route.legs[0]?.steps?.length || 0
                });

                return {
                    coordinates: route.geometry.coordinates.map((coord: [number, number]) => ({
                        latitude: coord[1],
                        longitude: coord[0]
                    })),
                    instructions: this.parseInstructions(route.legs[0]?.steps || []),
                    distance: route.distance || 0,
                    duration: route.duration || 0,
                    geometry: route.geometry
                };
            } catch (error) {
                console.warn(`❌ Failed with endpoint ${endpoint}:`, error);
                lastError = error instanceof Error ? error : new Error('Unknown error occurred');

                // If it's an abort error (timeout), try next endpoint
                if (error instanceof Error && error.name === 'AbortError') {
                    console.log('⏱️ Request timed out, trying next endpoint...');
                    continue;
                }

                // For other errors, also try next endpoint
                continue;
            }
        }

        // If all endpoints failed
        console.error('💥 All OSRM endpoints failed');
        throw new Error(`Failed to calculate route: ${lastError?.message || 'All routing services unavailable'}`);
    }

    // Parse OSRM steps into navigation instructions with proper typing
    private parseInstructions(steps: any[]): NavigationInstruction[] {
        return steps.map((step, index) => {
            const maneuver = step.maneuver || {};
            const instruction = this.getInstructionText(maneuver);

            return {
                id: `step_${index}`,
                text: instruction,
                distance: step.distance || 0,
                duration: step.duration || 0,
                coordinates: (step.geometry?.coordinates || []).map((coord: [number, number]) => ({
                    latitude: coord[1],
                    longitude: coord[0]
                })),
                maneuver: {
                    type: maneuver.type || 'continue',
                    modifier: maneuver.modifier,
                    bearing_after: maneuver.bearing_after,
                    location: {
                        latitude: maneuver.location?.[1] || 0,
                        longitude: maneuver.location?.[0] || 0
                    }
                },
                voiceInstruction: this.generateVoiceInstruction(instruction, step.distance || 0)
            };
        });
    }

    private getInstructionText(maneuver: any): string {
        const { type, modifier } = maneuver;

        switch (type) {
            case 'depart':
                return `Head ${this.getDirectionFromModifier(modifier)}`;
            case 'turn':
                return `Turn ${modifier || 'right'}`;
            case 'new name':
                return modifier ? `Continue ${modifier}` : 'Continue straight';
            case 'merge':
                return `Merge ${modifier || 'right'}`;
            case 'ramp':
                return `Take the ramp ${modifier || 'right'}`;
            case 'roundabout':
                return 'Enter the roundabout';
            case 'exit roundabout':
                return 'Exit the roundabout';
            case 'arrive':
                return 'You have arrived at your destination';
            case 'continue':
                return 'Continue straight';
            default:
                return 'Continue straight';
        }
    }

    private getDirectionFromModifier(modifier?: string): string {
        if (!modifier) return 'straight';

        const directions: { [key: string]: string } = {
            'straight': 'straight',
            'slight right': 'slightly right',
            'right': 'right',
            'sharp right': 'sharp right',
            'uturn': 'around',
            'sharp left': 'sharp left',
            'left': 'left',
            'slight left': 'slightly left'
        };
        return directions[modifier] || 'straight';
    }

    private generateVoiceInstruction(instruction: string, distance: number): string {
        if (distance > 1000) {
            return `In ${Math.round(distance / 1000)} kilometers, ${instruction.toLowerCase()}`;
        } else if (distance > 100) {
            return `In ${Math.round(distance)} meters, ${instruction.toLowerCase()}`;
        } else {
            return instruction;
        }
    }

    // Start navigation with enhanced location tracking
    async startNavigation(start: NavigationCoordinates, destination: NavigationCoordinates): Promise<NavigationRoute> {
        try {
            console.log('🚀 Starting navigation...');

            // Calculate route
            const routeData = await this.calculateRoute(start, destination);

            this.route = routeData;
            this.instructions = routeData.instructions;
            this.currentStepIndex = 0;
            this.lastAnnouncedStep = -1;
            this.isNavigating = true;

            // Start precise location tracking
            await this.startLocationTracking();

            this.emit('navigationStarted', {
                route: this.route,
                instructions: this.instructions
            });

            console.log('✅ Navigation started successfully');
            return routeData;
        } catch (error) {
            console.error('❌ Failed to start navigation:', error);
            const navigationError = error instanceof Error ? error : new Error('Unknown navigation error');
            this.emit('navigationError', navigationError);
            throw navigationError;
        }
    }

    private async startLocationTracking(): Promise<void> {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Location permission denied. Please enable location access to use navigation.');
        }

        // High-accuracy location tracking for navigation
        this.locationSubscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 500, // Update every 500ms
                distanceInterval: 2, // Update every 2 meters
            },
            (location: Location.LocationObject) => {
                this.currentPosition = location;
                this.updateNavigationProgress(location);
            }
        );
    }

    private updateNavigationProgress(location: Location.LocationObject): void {
        if (!this.route || !this.instructions.length) return;

        const progress = this.calculateNavigationProgress(location);

        // Check if we should advance to next instruction
        if (this.shouldAdvanceToNextStep(location)) {
            this.currentStepIndex++;

            // Announce new instruction
            if (this.currentStepIndex < this.instructions.length &&
                this.currentStepIndex !== this.lastAnnouncedStep) {
                const instruction = this.instructions[this.currentStepIndex];
                this.emit('newInstruction', instruction);
                this.lastAnnouncedStep = this.currentStepIndex;
            }
        }

        // Check if arrived at destination
        if (this.hasArrivedAtDestination(location)) {
            this.stopNavigation();
            this.emit('destinationReached', { location });
            return;
        }

        // Emit progress update with location and heading
        this.emit('progressUpdate', progress);
    }

    private calculateNavigationProgress(location: Location.LocationObject): NavigationProgress {
        const currentInstruction = this.instructions[this.currentStepIndex];
        const nextInstruction = this.instructions[this.currentStepIndex + 1];

        // Calculate remaining distance to destination
        const remainingDistance = this.calculateRemainingDistance(location);
        const totalDistance = this.route?.distance || 0;
        const distanceTraveled = totalDistance - remainingDistance;

        return {
            distanceRemaining: remainingDistance,
            durationRemaining: this.calculateRemainingDuration(remainingDistance),
            distanceTraveled,
            fractionTraveled: totalDistance > 0 ? Math.min(distanceTraveled / totalDistance, 1) : 0,
            currentStepIndex: this.currentStepIndex,
            currentInstruction,
            nextInstruction,
            totalSteps: this.instructions.length,
            location: location.coords,
            heading: location.coords.heading || 0
        };
    }

    private shouldAdvanceToNextStep(location: Location.LocationObject): boolean {
        if (this.currentStepIndex >= this.instructions.length - 1) return false;

        const currentInstruction = this.instructions[this.currentStepIndex];
        const distanceToManeuver = this.getDistanceBetweenPoints(
            location.coords,
            currentInstruction.maneuver.location
        );

        // Advance if we're within 15 meters of the maneuver point
        return distanceToManeuver < 15;
    }

    private calculateRemainingDistance(location: Location.LocationObject): number {
        if (!this.route?.coordinates.length) return 0;

        // Find closest point on route and calculate distance from there to end
        const destination = this.route.coordinates[this.route.coordinates.length - 1];
        return this.getDistanceBetweenPoints(location.coords, destination);
    }

    private calculateRemainingDuration(remainingDistance: number): number {
        // Estimate based on average speed
        const averageSpeedMps = 11.1; // ~40 km/h
        return remainingDistance / averageSpeedMps;
    }

    private hasArrivedAtDestination(location: Location.LocationObject): boolean {
        if (!this.route?.coordinates.length) return false;

        const destination = this.route.coordinates[this.route.coordinates.length - 1];
        const distanceToDestination = this.getDistanceBetweenPoints(location.coords, destination);

        // Consider arrived if within 25 meters
        return distanceToDestination < 25;
    }

    private getDistanceBetweenPoints(
        point1: Location.LocationObjectCoords | NavigationCoordinates,
        point2: NavigationCoordinates
    ): number {
        const R = 6371000; // Earth's radius in meters
        const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
        const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
        const a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    stopNavigation(): void {
        console.log('🛑 Stopping navigation...');
        this.isNavigating = false;

        if (this.locationSubscription) {
            this.locationSubscription.remove();
            this.locationSubscription = null;
        }

        this.route = null;
        this.instructions = [];
        this.currentStepIndex = 0;
        this.currentPosition = null;
        this.lastAnnouncedStep = -1;

        this.emit('navigationStopped', {});
    }

    // Public getters
    getCurrentPosition(): Location.LocationObject | null {
        return this.currentPosition;
    }

    getCurrentInstruction(): NavigationInstruction | null {
        return this.instructions[this.currentStepIndex] || null;
    }

    getNextInstruction(): NavigationInstruction | null {
        return this.instructions[this.currentStepIndex + 1] || null;
    }

    getRoute(): NavigationRoute | null {
        return this.route;
    }

    getIsNavigating(): boolean {
        return this.isNavigating;
    }

    getAllInstructions(): NavigationInstruction[] {
        return [...this.instructions];
    }
}