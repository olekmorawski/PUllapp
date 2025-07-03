import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface SearchResultItemProps {
    icon: string | React.ReactNode;
    iconBackgroundColor?: string;
    title: string;
    subtitle: string;
    onPress: () => void;
    isLoading?: boolean;
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
                                                                      icon,
                                                                      iconBackgroundColor = '#F0F0F0',
                                                                      title,
                                                                      subtitle,
                                                                      onPress,
                                                                      isLoading = false
                                                                  }) => {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress} disabled={isLoading}>
            <View style={[styles.iconContainer, { backgroundColor: iconBackgroundColor }]}>
                {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                ) : typeof icon === 'string' ? (
                    <Text style={styles.iconText}>{icon}</Text>
                ) : (
                    icon
                )}
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    iconText: {
        fontSize: 16,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
});