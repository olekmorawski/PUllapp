import React from 'react';
import { View, TextInput } from 'react-native';

interface LocationInputsProps {
    currentLocation: string;
    destination: string;
    onCurrentLocationChange: (text: string) => void;
    onDestinationChange: (text: string) => void;
    onCurrentLocationFocus: () => void;
    onDestinationFocus: () => void;
}

export const LocationInputs: React.FC<LocationInputsProps> = ({
                                                                  currentLocation,
                                                                  destination,
                                                                  onCurrentLocationChange,
                                                                  onDestinationChange,
                                                                  onCurrentLocationFocus,
                                                                  onDestinationFocus,
                                                              }) => {
    return (
        <View className="px-6 gap-4">
            <View className="flex-row items-center gap-3">
                <View className="w-3 h-3 bg-green-500 rounded-full" />
                <TextInput
                    className="flex-1 p-4 bg-gray-50 rounded-xl text-gray-800"
                    placeholder="Current location"
                    value={currentLocation}
                    onChangeText={onCurrentLocationChange}
                    onFocus={onCurrentLocationFocus}
                    placeholderTextColor="#9CA3AF"
                />
            </View>

            <View className="flex-row items-center gap-3 mb-4">
                <View className="w-3 h-3 bg-red-500 rounded-full" />
                <TextInput
                    className="flex-1 p-4 bg-gray-50 rounded-xl text-gray-800"
                    placeholder="Where to?"
                    value={destination}
                    onChangeText={onDestinationChange}
                    onFocus={onDestinationFocus}
                    placeholderTextColor="#9CA3AF"
                />
            </View>
        </View>
    );
};