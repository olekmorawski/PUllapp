import React from 'react';
import { View, PanResponderInstance } from 'react-native';
import { LocationInputs } from './LocationInputs';

interface BottomSheetHeaderProps {
    panHandlers: PanResponderInstance['panHandlers'];
    currentLocation: string;
    destination: string;
    onCurrentLocationChange: (text: string) => void;
    onDestinationChange: (text: string) => void;
    onCurrentLocationFocus: () => void;
    onDestinationFocus: () => void;
}

export const BottomSheetHeader: React.FC<BottomSheetHeaderProps> = ({
                                                                        panHandlers,
                                                                        currentLocation,
                                                                        destination,
                                                                        onCurrentLocationChange,
                                                                        onDestinationChange,
                                                                        onCurrentLocationFocus,
                                                                        onDestinationFocus,
                                                                    }) => {
    return (
        <View {...panHandlers}>
            <View className="w-full items-center pt-4">
                <View className="w-12 h-1 bg-gray-300 rounded-full mb-4" />
            </View>

            <LocationInputs
                currentLocation={currentLocation}
                destination={destination}
                onCurrentLocationChange={onCurrentLocationChange}
                onDestinationChange={onDestinationChange}
                onCurrentLocationFocus={onCurrentLocationFocus}
                onDestinationFocus={onDestinationFocus}
            />
        </View>
    );
};