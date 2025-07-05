import React from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { SearchResultItem } from './SearchResultItem';
import {FavoritesList} from "./FavouritesList";
import { RecentSearchesList } from './RecentSearchesList';
import { PlaceResult } from '../types';

interface SearchResultsProps {
    activeSearchType: 'origin' | 'destination' | null;
    searchQuery: string;
    searchResults: PlaceResult[];
    recentSearches: PlaceResult[];
    favoriteLocations: Record<string, PlaceResult>;
    isSearching: boolean;
    isGettingLocation: boolean;
    searchError: string | null;
    onUseCurrentLocation: () => void;
    onSelectPlace: (place: PlaceResult) => void;
    onAddFavorite: (key: string) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
                                                                activeSearchType,
                                                                searchQuery,
                                                                searchResults,
                                                                recentSearches,
                                                                favoriteLocations,
                                                                isSearching,
                                                                isGettingLocation,
                                                                searchError,
                                                                onUseCurrentLocation,
                                                                onSelectPlace,
                                                                onAddFavorite
                                                            }) => {
    if (!activeSearchType) return null;

    return (
        <View style={styles.container}>
            {/* Current Location Option */}
            {activeSearchType === 'origin' && (
                <SearchResultItem
                    icon="📍"
                    iconBackgroundColor="#007AFF"
                    title={isGettingLocation ? 'Getting location...' : 'Use Current Location'}
                    subtitle={isGettingLocation ? 'Please wait...' : 'GPS location'}
                    onPress={onUseCurrentLocation}
                    isLoading={isGettingLocation}
                />
            )}

            {/* Show favorites and recent when not searching */}
            {searchQuery.length === 0 && (
                <>
                    <FavoritesList
                        favorites={favoriteLocations}
                        onSelectFavorite={onSelectPlace}
                        onAddFavorite={onAddFavorite}
                    />

                    <RecentSearchesList
                        recentSearches={recentSearches}
                        onSelectRecent={onSelectPlace}
                    />
                </>
            )}

            {/* Loading State */}
            {isSearching && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#007AFF" />
                    <Text style={styles.loadingText}>Searching...</Text>
                </View>
            )}

            {/* Error State */}
            {searchError && !isSearching && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{searchError}</Text>
                </View>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
                <>
                    {searchQuery.length > 0 && (
                        <Text style={styles.sectionHeader}>Suggestions</Text>
                    )}
                    <FlatList
                        data={searchResults}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <SearchResultItem
                                icon="📍"
                                title={item.title}
                                subtitle={item.subtitle}
                                onPress={() => onSelectPlace(item)}
                            />
                        )}
                        nestedScrollEnabled={true}
                    />
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        maxHeight: 300,
        backgroundColor: 'white',
        marginTop: 8,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#F8F8F8',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    loadingText: {
        marginTop: 4,
        color: '#666',
        fontSize: 12,
    },
    errorContainer: {
        backgroundColor: '#FFF0F0',
        padding: 16,
        alignItems: 'center',
    },
    errorText: {
        color: '#FF4444',
        fontSize: 14,
        textAlign: 'center',
    },
});