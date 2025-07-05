import { useState, useCallback } from 'react';
import { placesService } from './LocationService';

interface UseReverseGeocodeResult {
    address: string | null;
    isLoading: boolean;
    error: Error | null;
    reverseGeocode: (coordinates: { latitude: number; longitude: number }) => Promise<string>;
    clearAddress: () => void;
}

export const useReverseGeocode = (): UseReverseGeocodeResult => {
    const [address, setAddress] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const reverseGeocode = useCallback(async (coordinates: { latitude: number; longitude: number }): Promise<string> => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await placesService.reverseGeocode(coordinates);
            setAddress(result);
            return result;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Reverse geocoding failed';
            const error = new Error(errorMessage);
            setError(error);

            // Return coordinate string as fallback
            const fallback = `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`;
            setAddress(fallback);
            return fallback;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const clearAddress = useCallback(() => {
        setAddress(null);
        setError(null);
    }, []);

    return {
        address,
        isLoading,
        error,
        reverseGeocode,
        clearAddress,
    };
};