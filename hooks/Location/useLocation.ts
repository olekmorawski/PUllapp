import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

interface UseLocationOptions {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
    autoStart?: boolean;
    watchTimeInterval?: number;
    watchDistanceInterval?: number;
}

interface UseLocationResult {
    location: Location.LocationObject | null;
    error: Error | null;
    isLoading: boolean;
    hasPermission: boolean | null;
    requestPermission: () => Promise<boolean>;
    getCurrentLocation: () => Promise<void>;
    startWatching: () => void;
    stopWatching: () => void;
}

export const useLocation = (options: UseLocationOptions = {}): UseLocationResult => {
    const {
        enableHighAccuracy = true,
        timeout = 5000,
        maximumAge = 1000,
        autoStart = false,
        // ✅ OPTIMIZED - More conservative defaults to reduce API usage
        watchTimeInterval = 10000, // 10 seconds instead of 1 second
        watchDistanceInterval = 100, // 100 meters instead of 10 meters
    } = options;

    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [watchSubscription, setWatchSubscription] = useState<Location.LocationSubscription | null>(null);

    // Check permissions on mount
    useEffect(() => {
        checkPermissions();
    }, []);

    // Auto-start location if requested
    useEffect(() => {
        if (autoStart && hasPermission) {
            getCurrentLocation();
        }
    }, [autoStart, hasPermission]);

    // Cleanup watch subscription
    useEffect(() => {
        return () => {
            if (watchSubscription) {
                watchSubscription.remove();
            }
        };
    }, [watchSubscription]);

    const checkPermissions = async () => {
        try {
            const { status } = await Location.getForegroundPermissionsAsync();
            setHasPermission(status === 'granted');
        } catch (err) {
            setError(new Error('Failed to check permissions'));
        }
    };

    const requestPermission = useCallback(async (): Promise<boolean> => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            const granted = status === 'granted';
            setHasPermission(granted);
            return granted;
        } catch (err) {
            setError(new Error('Failed to request permissions'));
            return false;
        }
    }, []);

    const getCurrentLocation = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Check/request permissions
            let permission = hasPermission;
            if (permission === null) {
                const { status } = await Location.getForegroundPermissionsAsync();
                permission = status === 'granted';
                setHasPermission(permission);
            }

            if (!permission) {
                permission = await requestPermission();
            }

            if (!permission) {
                throw new Error('Location permission denied');
            }

            // ✅ OPTIMIZED - Use balanced accuracy for better battery life and performance
            const locationPromise = Location.getCurrentPositionAsync({
                accuracy: enableHighAccuracy
                    ? Location.Accuracy.Balanced // Changed from High to Balanced
                    : Location.Accuracy.Low,
            });

            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Location timeout')), timeout)
            );

            const result = await Promise.race([locationPromise, timeoutPromise]);
            setLocation(result);
            setError(null);
        } catch (err) {
            // Try last known location as fallback
            try {
                const lastKnown = await Location.getLastKnownPositionAsync({
                    maxAge: maximumAge
                });
                if (lastKnown) {
                    setLocation(lastKnown);
                    setError(null);
                } else {
                    throw err;
                }
            } catch (fallbackErr) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
                setError(new Error(errorMessage));
                setLocation(null);
            }
        } finally {
            setIsLoading(false);
        }
    }, [hasPermission, requestPermission, enableHighAccuracy, timeout, maximumAge]);

    const startWatching = useCallback(async () => {
        try {
            if (!hasPermission) {
                const granted = await requestPermission();
                if (!granted) {
                    throw new Error('Location permission denied');
                }
            }

            // ✅ OPTIMIZED - Less aggressive location watching settings
            const subscription = await Location.watchPositionAsync(
                {
                    accuracy: enableHighAccuracy
                        ? Location.Accuracy.Balanced // Changed from High to Balanced
                        : Location.Accuracy.Low,
                    timeInterval: watchTimeInterval, // Now configurable, defaults to 10 seconds
                    distanceInterval: watchDistanceInterval, // Now configurable, defaults to 100 meters
                },
                (newLocation) => {
                    setLocation(newLocation);
                    setError(null);
                }
            );

            setWatchSubscription(subscription);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to watch location';
            setError(new Error(errorMessage));
        }
    }, [hasPermission, requestPermission, enableHighAccuracy, watchTimeInterval, watchDistanceInterval]);

    const stopWatching = useCallback(() => {
        if (watchSubscription) {
            watchSubscription.remove();
            setWatchSubscription(null);
        }
    }, [watchSubscription]);

    return {
        location,
        error,
        isLoading,
        hasPermission,
        requestPermission,
        getCurrentLocation,
        startWatching,
        stopWatching,
    };
};