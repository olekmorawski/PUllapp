import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

interface LoadingScreenProps {
    title: string;
    subtitle: string;
    color?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
                                                                title,
                                                                subtitle,
                                                                color = "#4285F4"
                                                            }) => (
    <View className="flex-1 justify-center items-center">
        <View className="bg-white rounded-2xl p-8 mx-8 items-center shadow-lg">
            <ActivityIndicator size="large" color={color} />
            <Text className="text-xl font-semibold text-gray-900 mt-4 mb-2">
                {title}
            </Text>
            <Text className="text-base text-gray-600 text-center leading-6">
                {subtitle}
            </Text>
        </View>
    </View>
);