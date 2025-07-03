import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {PlaceResult} from "@/components/BottomSheet/types";

interface UseFavoriteLocationsOptions {
    storageKey?: string;
    defaultFavorites?: string[];
}

interface UseFavoriteLocationsResult {
    favoriteLocations: Record<string, PlaceResult>;
    isLoading: boolean;
    error: Error | null;
    addFavorite: (key: string, location: PlaceResult) => Promise<void>;
    removeFavorite: (key: string) => Promise<void>;
    getFavorite: (key: string) => PlaceResult | undefined;
    hasFavorite: (key: string) => boolean;
    clearFavorites: () => Promise<void>;
    refreshFavorites: () => Promise<void>;
}

export const useFavoriteLocations = (options: UseFavoriteLocationsOptions = {}): UseFavoriteLocationsResult => {
    const {
        storageKey = 'favoriteLocations',
        defaultFavorites = ['home', 'work']
    } = options;

    const [favoriteLocations, setFavoriteLocations] = useState<Record<string, PlaceResult>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Load favorites on mount
    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const stored = await AsyncStorage.getItem(storageKey);
            const favorites = stored ? JSON.parse(stored) : {};
            setFavoriteLocations(favorites);
        } catch (err) {
            console.error('Error loading favorite locations:', err);
            setError(new Error('Failed to load favorite locations'));
            setFavoriteLocations({});
        } finally {
            setIsLoading(false);
        }
    };

    const saveToStorage = async (favorites: Record<string, PlaceResult>) => {
        try {
            await AsyncStorage.setItem(storageKey, JSON.stringify(favorites));
        } catch (err) {
            console.error('Error saving favorite locations:', err);
            throw new Error('Failed to save favorite locations');
        }
    };

    const addFavorite = useCallback(async (key: string, location: PlaceResult) => {
        try {
            const updated = {
                ...favoriteLocations,
                [key]: {
                    ...location,
                    id: key, // Ensure the ID matches the key
                    title: key.charAt(0).toUpperCase() + key.slice(1) // Capitalize key as title
                }
            };

            // Update state immediately
            setFavoriteLocations(updated);

            // Save to storage
            await saveToStorage(updated);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to add favorite'));
            // Revert state on error
            setFavoriteLocations(favoriteLocations);
        }
    }, [favoriteLocations, storageKey]);

    const removeFavorite = useCallback(async (key: string) => {
        try {
            const { [key]: removed, ...remaining } = favoriteLocations;

            // Update state immediately
            setFavoriteLocations(remaining);

            // Save to storage
            await saveToStorage(remaining);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to remove favorite'));
            // Revert state on error
            setFavoriteLocations(favoriteLocations);
        }
    }, [favoriteLocations, storageKey]);

    const getFavorite = useCallback((key: string): PlaceResult | undefined => {
        return favoriteLocations[key];
    }, [favoriteLocations]);

    const hasFavorite = useCallback((key: string): boolean => {
        return key in favoriteLocations;
    }, [favoriteLocations]);

    const clearFavorites = useCallback(async () => {
        try {
            // Clear state immediately
            setFavoriteLocations({});

            // Clear storage
            await AsyncStorage.removeItem(storageKey);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to clear favorites'));
            // Reload on error
            await loadFavorites();
        }
    }, [storageKey]);

    const refreshFavorites = useCallback(async () => {
        await loadFavorites();
    }, [storageKey]);

    return {
        favoriteLocations,
        isLoading,
        error,
        addFavorite,
        removeFavorite,
        getFavorite,
        hasFavorite,
        clearFavorites,
        refreshFavorites,
    };
};