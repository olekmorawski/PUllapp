import React from 'react';
import { TouchableOpacity, Text } from 'react-native';

interface ConfirmButtonProps {
    isEnabled: boolean;
    onPress: () => void;
}

export const ConfirmButton: React.FC<ConfirmButtonProps> = ({
                                                                isEnabled,
                                                                onPress,
                                                            }) => {
    return (
        <TouchableOpacity
            className={`mt-4 py-4 rounded-xl ${
                isEnabled
                    ? 'bg-blue-600 active:bg-blue-700'
                    : 'bg-gray-300'
            }`}
            onPress={onPress}
            disabled={!isEnabled}
            activeOpacity={isEnabled ? 0.8 : 1}
        >
            <Text className={`text-center font-semibold text-base ${
                isEnabled ? 'text-white' : 'text-gray-500'
            }`}>
                {isEnabled
                    ? 'Pull Up'
                    : 'Select ride & fill locations'
                }
            </Text>
        </TouchableOpacity>
    );
};