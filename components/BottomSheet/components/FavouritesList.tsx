import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SearchResultItem } from './SearchResultItem';
import { PlaceResult } from '../types';

interface FavoritesListProps {
    favorites: Record<string, PlaceResult>;
    onSelectFavorite: (location: PlaceResult) => void;
    onAddFavorite: (key: string) => void;
}

export const FavoritesList: React.FC<FavoritesListProps> = ({
                                                                favorites,
                                                                onSelectFavorite,
                                                                onAddFavorite
                                                            }) => {
    const hasFavorites = Object.keys(favorites).length > 0;

    if (!hasFavorites && !favorites['home'] && !favorites['work']) {
        return null;
    }

    return (
        <>
            <Text style={styles.sectionHeader}>Favorites</Text>

            {Object.entries(favorites).map(([key, location]) => (
                <SearchResultItem
                    key={key}
                    icon="⭐"
                    iconBackgroundColor="#FFD700"
                    title={location.title}
                    subtitle={location.subtitle || location.fullAddress}
                    onPress={() => onSelectFavorite(location)}
                />
            ))}

            {!favorites['home'] && (
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => onAddFavorite('home')}
                >
                    <Text style={styles.addButtonText}>+ Add Home</Text>
                </TouchableOpacity>
            )}

            {!favorites['work'] && (
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => onAddFavorite('work')}
                >
                    <Text style={styles.addButtonText}>+ Add Work</Text>
                </TouchableOpacity>
            )}
        </>
    );
};

const styles = StyleSheet.create({
    sectionHeader: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#F8F8F8',
    },
    addButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 16,
        marginVertical: 4,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        borderStyle: 'dashed',
    },
    addButtonText: {
        color: '#007AFF',
        fontSize: 14,
        textAlign: 'center',
    },
});