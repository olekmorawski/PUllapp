// hooks/useOSRMNavigation.ts - Fixed infinite loop
import { useState, useEffect, useRef, useCallback } from 'react';
import {
    OSRMNavigationService,
    NavigationCoordinates,
    NavigationRoute,
    NavigationProgress,
    NavigationInstruction
} from '@/services/OSRMNavigationService';
import * as Location from 'expo-location';

interface UseOSRMNavigationProps {
    origin: NavigationCoordinates;
    destination: NavigationCoordinates;
    onDestinationReached?: (data: { location: Location.LocationObject }) => void;
    onNavigationError?: (error: Error) => void;
    onNewInstruction?: (instruction: NavigationInstruction) => void;
}

interface MapboxCameraConfig {
    centerCoordinate: [number, number];
    zoomLevel: number;
    pitch: number;
    heading: number;
    animationDuration?: number;
}

export interface UseOSRMNavigationReturn {
    // State
    isNavigating: boolean;
    isLoading: boolean;
    route: NavigationRoute | null;
    currentPosition: Location.LocationObjectCoords | null;
    currentHeading: number;
    progress: NavigationProgress | null;
    currentInstruction: NavigationInstruction | null;
    nextInstruction: NavigationInstruction | null;
    error: Error | null;
    retryCount: number;

    // Actions
    startNavigation: () => Promise<void>;
    stopNavigation: () => void;
    retryNavigation: () => Promise<void>;

    // Utilities for Mapbox
    getMapboxCameraConfig: () => MapboxCameraConfig | null;
    getRouteGeoJSON: () => GeoJSON.Feature | null;
    formatDistance: (meters: number) => string;
    formatDuration: (seconds: number) => string;
    getManeuverIcon: (type: string, modifier?: string) => string;

    // Raw navigation service (for advanced usage)
    navigationService: OSRMNavigationService;
}

export const useOSRMNavigation = ({
                                      origin,
                                      destination,
                                      onDestinationReached,
                                      onNavigationError,
                                      onNewInstruction,
                                  }: UseOSRMNavigationProps): UseOSRMNavigationReturn => {
    // Navigation service instance
    const navigationService = useRef(new OSRMNavigationService()).current;

    // State with proper typing
    const [isNavigating, setIsNavigating] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [route, setRoute] = useState<NavigationRoute | null>(null);
    const [currentPosition, setCurrentPosition] = useState<Location.LocationObjectCoords | null>(null);
    const [currentHeading, setCurrentHeading] = useState<number>(0);
    const [progress, setProgress] = useState<NavigationProgress | null>(null);
    const [currentInstruction, setCurrentInstruction] = useState<NavigationInstruction | null>(null);
    const [nextInstruction, setNextInstruction] = useState<NavigationInstruction | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [retryCount, setRetryCount] = useState<number>(0);

    // Prevent multiple simultaneous navigation attempts
    const isStartingRef = useRef<boolean>(false);

    // Set up navigation service listeners
    useEffect(() => {
        const handleNavigationStarted = ({ route: routeData, instructions }: { route: NavigationRoute; instructions: NavigationInstruction[] }) => {
            console.log('📍 Navigation started successfully');
            setRoute(routeData);
            setIsNavigating(true);
            setIsLoading(false);
            setError(null);
            setRetryCount(0);
            setCurrentInstruction(instructions[0] || null);
            setNextInstruction(instructions[1] || null);
            isStartingRef.current = false;
        };

        const handleProgressUpdate = (progressData: NavigationProgress) => {
            setProgress(progressData);
            setCurrentPosition(progressData.location);
            setCurrentHeading(progressData.heading);
            setCurrentInstruction(progressData.currentInstruction || null);
            setNextInstruction(progressData.nextInstruction || null);
        };

        const handleNewInstruction = (instruction: NavigationInstruction) => {
            console.log('🗣️ New instruction:', instruction.voiceInstruction);
            onNewInstruction?.(instruction);
        };

        const handleDestinationReached = (data: { location: Location.LocationObject }) => {
            console.log('🎯 Destination reached');
            setIsNavigating(false);
            isStartingRef.current = false;
            onDestinationReached?.(data);
        };

        const handleNavigationError = (error: Error) => {
            console.error('❌ Navigation error:', error);
            setError(error);
            setIsLoading(false);
            setIsNavigating(false);
            isStartingRef.current = false;
            setRetryCount(prev => prev + 1);
            onNavigationError?.(error);
        };

        const handleNavigationStopped = () => {
            console.log('🛑 Navigation stopped');
            setIsNavigating(false);
            setIsLoading(false);
            setRoute(null);
            setCurrentPosition(null);
            setCurrentHeading(0);
            setProgress(null);
            setCurrentInstruction(null);
            setNextInstruction(null);
            isStartingRef.current = false;
        };

        // Register listeners
        navigationService.on('navigationStarted', handleNavigationStarted);
        navigationService.on('progressUpdate', handleProgressUpdate);
        navigationService.on('newInstruction', handleNewInstruction);
        navigationService.on('destinationReached', handleDestinationReached);
        navigationService.on('navigationError', handleNavigationError);
        navigationService.on('navigationStopped', handleNavigationStopped);

        // Cleanup listeners on unmount
        return () => {
            navigationService.off('navigationStarted', handleNavigationStarted);
            navigationService.off('progressUpdate', handleProgressUpdate);
            navigationService.off('newInstruction', handleNewInstruction);
            navigationService.off('destinationReached', handleDestinationReached);
            navigationService.off('navigationError', handleNavigationError);
            navigationService.off('navigationStopped', handleNavigationStopped);

            // Stop navigation
            navigationService.stopNavigation();
            isStartingRef.current = false;
        };
    }, [onDestinationReached, onNavigationError, onNewInstruction]);

    // Start navigation with retry logic
    const startNavigation = useCallback(async (): Promise<void> => {
        if (!origin || !destination) {
            const error = new Error('Origin and destination are required');
            setError(error);
            return;
        }

        if (isStartingRef.current || isLoading) {
            console.log('Navigation already starting, skipping...');
            return;
        }

        isStartingRef.current = true;
        setIsLoading(true);
        setError(null);

        console.log('🚀 Starting navigation from', origin, 'to', destination);

        try {
            await navigationService.startNavigation(origin, destination);
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to start navigation');
            setError(error);
            setIsLoading(false);
            isStartingRef.current = false;
            console.error('Failed to start navigation:', error);
        }
    }, [origin, destination, navigationService, isLoading]);

    // Retry navigation with exponential backoff
    const retryNavigation = useCallback(async (): Promise<void> => {
        if (retryCount >= 3) {
            setError(new Error('Maximum retry attempts reached. Please check your internet connection.'));
            return;
        }

        console.log(`🔄 Retrying navigation (attempt ${retryCount + 1})`);

        // Exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));

        await startNavigation();
    }, [retryCount, startNavigation]);

    // Stop navigation
    const stopNavigation = useCallback((): void => {
        console.log('🛑 Stopping navigation manually');
        isStartingRef.current = false;
        navigationService.stopNavigation();
    }, [navigationService]);

    // Mapbox-specific camera configuration
    const getMapboxCameraConfig = useCallback((): MapboxCameraConfig | null => {
        const position = currentPosition || (origin ? { latitude: origin.latitude, longitude: origin.longitude } : null);
        if (!position) return null;

        return {
            centerCoordinate: [position.longitude, position.latitude],
            zoomLevel: 18, // Close zoom for navigation
            pitch: 60, // 3D perspective
            heading: currentHeading, // Rotate based on driver direction
            animationDuration: 1000,
        };
    }, [currentPosition, currentHeading, origin]);

    // Convert route to GeoJSON for Mapbox
    const getRouteGeoJSON = useCallback((): GeoJSON.Feature | null => {
        if (!route) return null;

        return {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: route.coordinates.map(coord => [coord.longitude, coord.latitude])
            }
        };
    }, [route]);

    // Utility functions
    const formatDistance = useCallback((meters: number): string => {
        if (meters >= 1000) {
            return `${(meters / 1000).toFixed(1)} km`;
        }
        return `${Math.round(meters)} m`;
    }, []);

    const formatDuration = useCallback((seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }, []);

    const getManeuverIcon = useCallback((type: string, modifier?: string): string => {
        const getIconForType = (maneuverType: string, maneuverModifier?: string): string => {
            switch (maneuverType) {
                case 'turn':
                    switch (maneuverModifier) {
                        case 'left': return 'arrow-back';
                        case 'right': return 'arrow-forward';
                        case 'slight left': return 'trending-up';
                        case 'slight right': return 'trending-up';
                        case 'sharp left': return 'arrow-back';
                        case 'sharp right': return 'arrow-forward';
                        default: return 'arrow-forward';
                    }
                case 'depart': return 'play';
                case 'arrive': return 'flag';
                case 'roundabout': return 'refresh';
                case 'exit roundabout': return 'exit-outline';
                case 'merge': return 'git-merge-outline';
                case 'ramp': return 'trending-up';
                case 'continue': return 'arrow-up';
                case 'new name': return 'arrow-up';
                default: return 'arrow-up';
            }
        };

        return getIconForType(type, modifier);
    }, []);

    return {
        // State
        isNavigating,
        isLoading,
        route,
        currentPosition,
        currentHeading,
        progress,
        currentInstruction,
        nextInstruction,
        error,
        retryCount,

        // Actions
        startNavigation,
        stopNavigation,
        retryNavigation,

        // Utilities
        getMapboxCameraConfig,
        getRouteGeoJSON,
        formatDistance,
        formatDuration,
        getManeuverIcon,

        // Raw navigation service (for advanced usage)
        navigationService,
    };
};