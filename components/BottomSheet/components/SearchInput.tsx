import React from 'react';
import { View, TextInput, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

interface SearchInputProps {
    type: 'origin' | 'destination';
    value: string;
    placeholder: string;
    isActive: boolean;
    showLocationButton?: boolean;
    isGettingLocation?: boolean;
    onChange: (text: string) => void;
    onFocus: () => void;
    onLocationPress?: () => void;
}

export const SearchInput: React.FC<SearchInputProps> = ({
                                                            type,
                                                            value,
                                                            placeholder,
                                                            isActive,
                                                            showLocationButton = false,
                                                            isGettingLocation = false,
                                                            onChange,
                                                            onFocus,
                                                            onLocationPress
                                                        }) => {
    const markerColor = type === 'origin' ? '#00C851' : '#FF4444';
    const markerStyle = type === 'origin' ? styles.originMarker : styles.destinationMarker;

    return (
        <View style={styles.container}>
            <View style={styles.inputRow}>
                <View style={[styles.marker, markerStyle, { backgroundColor: markerColor }]} />
                <TextInput
                    style={[
                        styles.input,
                        { borderBottomColor: isActive ? '#007AFF' : '#E0E0E0' },
                        showLocationButton && styles.inputWithButton
                    ]}
                    placeholder={placeholder}
                    value={value}
                    onChangeText={onChange}
                    onFocus={onFocus}
                />
                {showLocationButton && (
                    <TouchableOpacity
                        style={styles.locationButton}
                        onPress={onLocationPress}
                        disabled={isGettingLocation}
                    >
                        {isGettingLocation ? (
                            <ActivityIndicator size="small" color="#007AFF" />
                        ) : (
                            <View style={styles.locationIcon}>
                                <Text>📍</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    marker: {
        width: 12,
        height: 12,
        marginRight: 12,
    },
    originMarker: {
        borderRadius: 6,
    },
    destinationMarker: {
        borderRadius: 1,
    },
    input: {
        flex: 1,
        fontSize: 16,
        borderBottomWidth: 1,
        paddingVertical: 8,
    },
    inputWithButton: {
        paddingRight: 40,
    },
    locationButton: {
        position: 'absolute',
        right: 0,
        padding: 8,
    },
    locationIcon: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
});