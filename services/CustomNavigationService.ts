// services/CustomNavigationService.ts
import { DirectionsService } from '@/components/DirectionsService';
import * as Location from 'expo-location';

export interface NavigationInstruction {
    id: string;
    text: string;
    distance: number;
    duration: number;
    maneuver: {
        type: string;
        modifier?: string;
        bearing_after?: number;
    };
    voiceInstruction?: string;
    location: {
        latitude: number;
        longitude: number;
    };
}

export interface NavigationProgress {
    distanceRemaining: number;
    durationRemaining: number;
    distanceTraveled: number;
    fractionTraveled: number;
    currentStepIndex: number;
    nextInstruction?: NavigationInstruction;
    upcomingInstruction?: NavigationInstruction;
}

export class CustomNavigationService {
    private directionsService: DirectionsService;
    private route: any = null;
    private instructions: NavigationInstruction[] = [];
    private currentPosition: Location.LocationObject | null = null;
    private isNavigating = false;
    private listeners: { [key: string]: Function[] } = {};
    private locationSubscription: Location.LocationSubscription | null = null;
    private currentStepIndex = 0;
    private lastAnnouncedInstruction = -1;

    constructor() {
        this.directionsService = new DirectionsService();
    }

    // Event system for navigation updates
    on(event: string, callback: Function) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event: string, callback: Function) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    }

    private emit(event: string, data: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    async startNavigation(origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) {
        try {
            // Get detailed route with steps
            const routeData = await this.directionsService.getDirections(origin, destination, {
                steps: true,
                overview: 'full'
            });

            this.route = routeData;
            this.instructions = this.parseInstructions(routeData.steps || []);
            this.currentStepIndex = 0;
            this.lastAnnouncedInstruction = -1;
            this.isNavigating = true;

            // Start location tracking
            await this.startLocationTracking();

            this.emit('navigationStarted', {
                route: this.route,
                instructions: this.instructions
            });

            return routeData;
        } catch (error) {
            this.emit('navigationError', error);
            throw error;
        }
    }

    private parseInstructions(steps: any[]): NavigationInstruction[] {
        return steps.map((step, index) => ({
            id: `step_${index}`,
            text: step.maneuver?.instruction || `Continue for ${step.distance}m`,
            distance: step.distance || 0,
            duration: step.duration || 0,
            maneuver: {
                type: step.maneuver?.type || 'continue',
                modifier: step.maneuver?.modifier,
                bearing_after: step.maneuver?.bearing_after,
            },
            voiceInstruction: this.generateVoiceInstruction(step),
            location: {
                latitude: step.maneuver?.location?.[1] || 0,
                longitude: step.maneuver?.location?.[0] || 0,
            }
        }));
    }

    private generateVoiceInstruction(step: any): string {
        const maneuver = step.maneuver;
        const distance = step.distance;

        let instruction = "";

        if (maneuver?.type === 'turn') {
            instruction = `In ${Math.round(distance)}m, turn ${maneuver.modifier || 'right'}`;
        } else if (maneuver?.type === 'roundabout') {
            instruction = `In ${Math.round(distance)}m, enter the roundabout`;
        } else if (maneuver?.type === 'depart') {
            instruction = `Head ${maneuver.modifier || 'straight'}`;
        } else {
            instruction = `Continue for ${Math.round(distance)}m`;
        }

        return instruction;
    }

    private async startLocationTracking() {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            throw new Error('Location permission denied');
        }

        this.locationSubscription = await Location.watchPositionAsync(
            {
                accuracy: Location.Accuracy.BestForNavigation,
                timeInterval: 1000,
                distanceInterval: 5,
            },
            (location) => {
                this.currentPosition = location;
                this.updateNavigationProgress(location);
            }
        );
    }

    private updateNavigationProgress(location: Location.LocationObject) {
        if (!this.route || !this.instructions.length) return;

        const progress = this.calculateProgress(location);

        // Check if we should advance to next instruction
        if (this.shouldAdvanceInstruction(location, progress)) {
            this.currentStepIndex++;

            // Announce new instruction
            if (this.currentStepIndex < this.instructions.length &&
                this.currentStepIndex !== this.lastAnnouncedInstruction) {
                this.announceInstruction(this.instructions[this.currentStepIndex]);
                this.lastAnnouncedInstruction = this.currentStepIndex;
            }
        }

        // Check if arrived at destination
        if (this.hasArrivedAtDestination(location)) {
            this.stopNavigation();
            this.emit('destinationReached', { location });
            return;
        }

        this.emit('progressUpdate', progress);
    }

    private calculateProgress(location: Location.LocationObject): NavigationProgress {
        // This is a simplified calculation - you'd want to use proper map matching
        const totalDistance = this.route.distance;
        const remainingDistance = this.calculateRemainingDistance(location);
        const distanceTraveled = totalDistance - remainingDistance;

        return {
            distanceRemaining: remainingDistance,
            durationRemaining: this.calculateRemainingDuration(remainingDistance),
            distanceTraveled,
            fractionTraveled: distanceTraveled / totalDistance,
            currentStepIndex: this.currentStepIndex,
            nextInstruction: this.instructions[this.currentStepIndex],
            upcomingInstruction: this.instructions[this.currentStepIndex + 1],
        };
    }

    private calculateRemainingDistance(location: Location.LocationObject): number {
        // Simplified - calculate distance from current position to end of route
        if (!this.route.coordinates || !this.route.coordinates.length) return 0;

        const destination = this.route.coordinates[this.route.coordinates.length - 1];
        return this.getDistanceBetweenPoints(
            location.coords,
            destination
        );
    }

    private calculateRemainingDuration(remainingDistance: number): number {
        // Estimate based on average speed
        const averageSpeedMps = 13.9; // ~50 km/h in m/s
        return remainingDistance / averageSpeedMps;
    }

    private shouldAdvanceInstruction(location: Location.LocationObject, progress: NavigationProgress): boolean {
        if (this.currentStepIndex >= this.instructions.length - 1) return false;

        const currentInstruction = this.instructions[this.currentStepIndex];
        const distanceToInstruction = this.getDistanceBetweenPoints(
            location.coords,
            currentInstruction.location
        );

        // Advance if we're within 20m of the instruction point
        return distanceToInstruction < 20;
    }

    private hasArrivedAtDestination(location: Location.LocationObject): boolean {
        if (!this.route.coordinates || !this.route.coordinates.length) return false;

        const destination = this.route.coordinates[this.route.coordinates.length - 1];
        const distanceToDestination = this.getDistanceBetweenPoints(
            location.coords,
            destination
        );

        // Consider arrived if within 50m of destination
        return distanceToDestination < 50;
    }

    private getDistanceBetweenPoints(
        point1: { latitude: number; longitude: number },
        point2: { latitude: number; longitude: number }
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

    private announceInstruction(instruction: NavigationInstruction) {
        // You can integrate with expo-speech or other TTS libraries
        console.log('Voice instruction:', instruction.voiceInstruction);
        this.emit('voiceInstruction', instruction);
    }

    stopNavigation() {
        this.isNavigating = false;

        if (this.locationSubscription) {
            this.locationSubscription.remove();
            this.locationSubscription = null;
        }

        this.route = null;
        this.instructions = [];
        this.currentStepIndex = 0;
        this.lastAnnouncedInstruction = -1;

        this.emit('navigationStopped', {});
    }

    getCurrentProgress(): NavigationProgress | null {
        if (!this.currentPosition || !this.isNavigating) return null;
        return this.calculateProgress(this.currentPosition);
    }

    isActive(): boolean {
        return this.isNavigating;
    }
}