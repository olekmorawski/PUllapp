import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RideOption {
    id: number;
    type: string;
    time: string;
    suggestedRange: string;
    icon: string;
}

interface RideOptionCardProps {
    option: RideOption;
    isSelected: boolean;
    customPrice: string;
    onPress: () => void;
    onPriceChange: (price: string) => void;
    onSuggestionPress: () => void;
}

export const RideOptionCard: React.FC<RideOptionCardProps> = ({
                                                                  option,
                                                                  isSelected,
                                                                  customPrice,
                                                                  onPress,
                                                                  onPriceChange,
                                                                  onSuggestionPress,
                                                              }) => {
    return (
        <TouchableOpacity
            className={`p-4 rounded-xl border ${
                isSelected
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-gray-50 border-gray-200'
            }`}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Top Row: Car info and selection indicator */}
            <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-3">
                    <Text className="text-2xl">{option.icon}</Text>
                    <View>
                        <Text className="font-semibold text-gray-800">{option.type}</Text>
                        <Text className="text-sm text-gray-500">{option.time} away</Text>
                    </View>
                </View>
                {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                )}
            </View>

            {/* Price Input Row */}
            <View className="flex-row items-center gap-3">
                <View className="flex-1">
                    <Text className="text-sm text-gray-600 mb-2">Your price offer:</Text>
                    <TextInput
                        className="p-3 bg-white border border-gray-300 rounded-lg text-lg font-semibold text-gray-800"
                        placeholder="$0"
                        value={customPrice}
                        onChangeText={onPriceChange}
                        keyboardType="numeric"
                        placeholderTextColor="#9CA3AF"
                        onFocus={(e) => e.stopPropagation()}
                    />
                </View>

                {/* Suggestion */}
                <View className="items-center">
                    <Text className="text-xs text-gray-500 mb-1">suggested</Text>
                    <TouchableOpacity
                        className="px-3 py-2 bg-green-100 rounded-lg border border-green-300"
                        onPress={onSuggestionPress}
                    >
                        <Text className="text-green-700 font-medium text-sm">
                            {option.suggestedRange}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
};