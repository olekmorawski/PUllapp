import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { SearchResultItem } from './SearchResultItem';
import { PlaceResult } from '../types';

interface RecentSearchesListProps {
    recentSearches: PlaceResult[];
    onSelectRecent: (location: PlaceResult) => void;
    maxItems?: number;
}

export const RecentSearchesList: React.FC<RecentSearchesListProps> = ({
                                                                          recentSearches,
                                                                          onSelectRecent,
                                                                          maxItems = 3
                                                                      }) => {
    if (recentSearches.length === 0) {
        return null;
    }

    return (
        <>
            <Text style={styles.sectionHeader}>Recent</Text>
            {recentSearches.slice(0, maxItems).map((location) => (
                <SearchResultItem
                    key={location.id}
                    icon="🕐"
                    title={location.title}
                    subtitle={location.subtitle}
                    onPress={() => onSelectRecent(location)}
                />
            ))}
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
});