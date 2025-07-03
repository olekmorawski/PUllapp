import React from 'react';
import { View, Text } from 'react-native';
import { RideOptionCard } from './RideOptionCard';

interface RideOption {
    id: number;
    type: string;
    time: string;
    suggestedRange: string;
    icon: string;
}

interface RideOptionsListProps {
    rideOptions: RideOption[];
    selectedRide: RideOption | null;
    customPrices: {[key: number]: string};
    onRidePress: (ride: RideOption) => void;
    onPriceChange: (rideId: number, price: string) => void;
    onSuggestionPress: (rideId: number, suggestedRange: string) => void;
}

export const RideOptionsList: React.FC<RideOptionsListProps> = ({
                                                                    rideOptions,
                                                                    selectedRide,
                                                                    customPrices,
                                                                    onRidePress,
                                                                    onPriceChange,
                                                                    onSuggestionPress,
                                                                }) => {
    return (
        <>
            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-semibold text-gray-800">Choose a ride</Text>
            </View>

            <View className="gap-4">
                {rideOptions.map((option) => (
                    <RideOptionCard
                        key={option.id}
                        option={option}
                        isSelected={Boolean(selectedRide && selectedRide.id === option.id)}
                        customPrice={customPrices[option.id] || ''}
                        onPress={() => onRidePress(option)}
                        onPriceChange={(price) => onPriceChange(option.id, price)}
                        onSuggestionPress={() => onSuggestionPress(option.id, option.suggestedRange)}
                    />
                ))}
            </View>
        </>
    );
};