import { useState, useCallback, useRef, useEffect } from 'react';
import { placesService } from './LocationService';
import {PlaceResult} from "@/components/BottomSheet/types";

interface UsePlacesSearchOptions {
    debounceDelay?: number;
    minSearchLength?: number;
    limit?: number;
    proximity?: { latitude: number; longitude: number } | null;
}

interface UsePlacesSearchResult {
    searchResults: PlaceResult[];
    isSearching: boolean;
    searchError: string | null;
    search: (query: string) => void;
    clearResults: () => void;
    getPlaceDetails: (placeId: string) => Promise<PlaceResult | null>;
}

export const usePlacesSearch = (options: UsePlacesSearchOptions = {}): UsePlacesSearchResult => {
    const {
        debounceDelay = 300,
        minSearchLength = 2,
        limit = 5,
        proximity = null
    } = options;

    const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);
    const abortController = useRef<AbortController | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
            if (abortController.current) {
                abortController.current.abort();
            }
        };
    }, []);

    const performSearch = useCallback(async (query: string) => {
        // Cancel previous search
        if (abortController.current) {
            abortController.current.abort();
        }

        if (query.length < minSearchLength) {
            setSearchResults([]);
            setSearchError(null);
            return;
        }

        setIsSearching(true);
        setSearchError(null);

        // Create new abort controller for this search
        abortController.current = new AbortController();

        try {
            const results = await placesService.searchPlaces(query, {
                limit,
                location: proximity || undefined,
                sessionId: `search-${Date.now()}`,
                language: 'en',
                types: 'establishment,address'
            });

            // Check if search was cancelled
            if (!abortController.current.signal.aborted) {
                setSearchResults(results);
                if (results.length === 0 && query.length >= minSearchLength) {
                    setSearchError('No places found matching your search.');
                }
            }
        } catch (error: any) {
            // Don't set error if search was cancelled
            if (!abortController.current?.signal.aborted) {
                console.error('Search error:', error);
                let friendlyMessage = 'Could not perform search. Please try again.';

                if (error.message) {
                    if (error.message.includes('ZERO_RESULTS') || error.message.includes('No places found')) {
                        friendlyMessage = 'No places found matching your search.';
                    } else if (error.message.toLowerCase().includes('network') || error.message.includes('Failed to fetch')) {
                        friendlyMessage = 'Network error. Please check your connection.';
                    } else if (error.message.startsWith('Places API Error:')) {
                        friendlyMessage = error.message;
                    }
                }

                setSearchError(friendlyMessage);
                setSearchResults([]);
            }
        } finally {
            if (!abortController.current?.signal.aborted) {
                setIsSearching(false);
            }
        }
    }, [minSearchLength, limit, proximity]);

    const search = useCallback((query: string) => {
        // Clear previous timeout
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        // Set immediate states
        if (query.length === 0) {
            setSearchResults([]);
            setSearchError(null);
            setIsSearching(false);
            return;
        }

        // Show loading state immediately for better UX
        if (query.length >= minSearchLength) {
            setIsSearching(true);
        }

        // Debounce the actual search
        searchTimeout.current = setTimeout(() => {
            performSearch(query);
        }, debounceDelay);
    }, [performSearch, debounceDelay, minSearchLength]);

    const clearResults = useCallback(() => {
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }
        if (abortController.current) {
            abortController.current.abort();
        }
        setSearchResults([]);
        setSearchError(null);
        setIsSearching(false);
    }, []);

    const getPlaceDetails = useCallback(async (placeId: string): Promise<PlaceResult | null> => {
        try {
            return await placesService.getPlaceDetails(placeId);
        } catch (error) {
            console.error('Error getting place details:', error);
            return null;
        }
    }, []);

    return {
        searchResults,
        isSearching,
        searchError,
        search,
        clearResults,
        getPlaceDetails,
    };
};