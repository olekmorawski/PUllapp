import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {PlaceResult} from "@/components/BottomSheet/types";

interface UseRecentSearchesOptions {
    maxItems?: number;
    storageKey?: string;
}

interface UseRecentSearchesResult {
    recentSearches: PlaceResult[];
    isLoading: boolean;
    error: Error | null;
    addRecentSearch: (location: PlaceResult) => Promise<void>;
    removeRecentSearch: (locationId: string) => Promise<void>;
    clearRecentSearches: () => Promise<void>;
    refreshRecentSearches: () => Promise<void>;
}

export const useRecentSearches = (options: UseRecentSearchesOptions = {}): UseRecentSearchesResult => {
    const {
        maxItems = 10,
        storageKey = 'recentSearches'
    } = options;

    const [recentSearches, setRecentSearches] = useState<PlaceResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Load recent searches on mount
    useEffect(() => {
        loadRecentSearches();
    }, []);

    const loadRecentSearches = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const stored = await AsyncStorage.getItem(storageKey);
            const searches = stored ? JSON.parse(stored) : [];
            setRecentSearches(searches);
        } catch (err) {
            console.error('Error loading recent searches:', err);
            setError(new Error('Failed to load recent searches'));
            setRecentSearches([]);
        } finally {
            setIsLoading(false);
        }
    };

    const saveToStorage = async (searches: PlaceResult[]) => {
        try {
            await AsyncStorage.setItem(storageKey, JSON.stringify(searches));
        } catch (err) {
            console.error('Error saving recent searches:', err);
            throw new Error('Failed to save recent searches');
        }
    };

    const addRecentSearch = useCallback(async (location: PlaceResult) => {
        try {
            // Remove duplicate if exists and add to front
            const filtered = recentSearches.filter(item => item.id !== location.id);
            const updated = [location, ...filtered].slice(0, maxItems);

            // Update state immediately for better UX
            setRecentSearches(updated);

            // Save to storage
            await saveToStorage(updated);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to add recent search'));
            // Revert state on error
            setRecentSearches(recentSearches);
        }
    }, [recentSearches, maxItems, storageKey]);

    const removeRecentSearch = useCallback(async (locationId: string) => {
        try {
            const filtered = recentSearches.filter(item => item.id !== locationId);

            // Update state immediately
            setRecentSearches(filtered);

            // Save to storage
            await saveToStorage(filtered);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to remove recent search'));
            // Revert state on error
            setRecentSearches(recentSearches);
        }
    }, [recentSearches, storageKey]);

    const clearRecentSearches = useCallback(async () => {
        try {
            // Clear state immediately
            setRecentSearches([]);

            // Clear storage
            await AsyncStorage.removeItem(storageKey);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to clear recent searches'));
            // Reload on error
            await loadRecentSearches();
        }
    }, [storageKey]);

    const refreshRecentSearches = useCallback(async () => {
        await loadRecentSearches();
    }, [storageKey]);

    return {
        recentSearches,
        isLoading,
        error,
        addRecentSearch,
        removeRecentSearch,
        clearRecentSearches,
        refreshRecentSearches,
    };
};