// hooks/useCustomNavigation.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { CustomNavigationService, NavigationProgress, NavigationInstruction } from '@/services/CustomNavigationService';

interface UseCustomNavigationProps {
    onDestinationReached?: () => void;
    onNavigationError?: (error: any) => void;
    onVoiceInstruction?: (instruction: NavigationInstruction) => void;
}

export const useCustomNavigation = ({
                                        onDestinationReached,
                                        onNavigationError,
                                        onVoiceInstruction,
                                    }: UseCustomNavigationProps = {}) => {
    const [isNavigating, setIsNavigating] = useState(false);
    const [progress, setProgress] = useState<NavigationProgress | null>(null);
    const [currentInstruction, setCurrentInstruction] = useState<NavigationInstruction | null>(null);
    const [upcomingInstruction, setUpcomingInstruction] = useState<NavigationInstruction | null>(null);
    const [route, setRoute] = useState<any>(null);

    const navigationService = useRef(new CustomNavigationService()).current;

    useEffect(() => {
        // Set up event listeners
        navigationService.on('navigationStarted', ({ route: routeData, instructions }) => {
            setIsNavigating(true);
            setRoute(routeData);
            setCurrentInstruction(instructions[0] || null);
            setUpcomingInstruction(instructions[1] || null);
        });

        navigationService.on('progressUpdate', (progressData: NavigationProgress) => {
            setProgress(progressData);
            setCurrentInstruction(progressData.nextInstruction || null);
            setUpcomingInstruction(progressData.upcomingInstruction || null);
        });

        navigationService.on('destinationReached', () => {
            setIsNavigating(false);
            setProgress(null);
            setCurrentInstruction(null);
            setUpcomingInstruction(null);
            setRoute(null);
            onDestinationReached?.();
        });

        navigationService.on('navigationStopped', () => {
            setIsNavigating(false);
            setProgress(null);
            setCurrentInstruction(null);
            setUpcomingInstruction(null);
            setRoute(null);
        });

        navigationService.on('navigationError', (error: any) => {
            setIsNavigating(false);
            onNavigationError?.(error);
        });

        navigationService.on('voiceInstruction', (instruction: NavigationInstruction) => {
            onVoiceInstruction?.(instruction);
        });

        // Cleanup
        return () => {
            navigationService.stopNavigation();
        };
    }, []);

    const startNavigation = useCallback(async (
        origin: { latitude: number; longitude: number },
        destination: { latitude: number; longitude: number }
    ) => {
        try {
            await navigationService.startNavigation(origin, destination);
        } catch (error) {
            onNavigationError?.(error);
        }
    }, []);

    const stopNavigation = useCallback(() => {
        navigationService.stopNavigation();
    }, []);

    const getCurrentProgress = useCallback(() => {
        return navigationService.getCurrentProgress();
    }, []);

    // Utility functions for UI
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
        switch (type) {
            case 'turn':
                return modifier === 'left' ? '↰' : '↱';
            case 'continue':
                return '↑';
            case 'roundabout':
                return '⭮';
            case 'depart':
                return '🚗';
            case 'arrive':
                return '🏁';
            default:
                return '↑';
        }
    }, []);

    return {
        // State
        isNavigating,
        progress,
        currentInstruction,
        upcomingInstruction,
        route,

        // Actions
        startNavigation,
        stopNavigation,
        getCurrentProgress,

        // Utilities
        formatDistance,
        formatDuration,
        getManeuverIcon,
    };
};