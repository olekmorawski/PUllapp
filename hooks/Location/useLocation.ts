import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

interface UseLocationOptions {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
    autoStart?: boolean;
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
        autoStart = false
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

            // Get location with timeout
            const locationPromise = Location.getCurrentPositionAsync({
                accuracy: enableHighAccuracy
                    ? Location.Accuracy.High
                    : Location.Accuracy.Balanced,
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

                // Set fallback location
                setLocation({
                    coords: {
                        latitude: 37.78825,
                        longitude: -122.4324,
                        altitude: null,
                        accuracy: null,
                        altitudeAccuracy: null,
                        heading: null,
                        speed: null,
                    },
                    timestamp: Date.now(),
                });
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

            const subscription = await Location.watchPositionAsync(
                {
                    accuracy: enableHighAccuracy
                        ? Location.Accuracy.High
                        : Location.Accuracy.Balanced,
                    timeInterval: 1000,
                    distanceInterval: 10,
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
    }, [hasPermission, requestPermission, enableHighAccuracy]);

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