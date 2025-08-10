import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorScreenProps {
    title: string;
    message: string;
    onRetry?: () => void;
    onGoBack: () => void;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
                                                            title,
                                                            message,
                                                            onRetry,
                                                            onGoBack
                                                        }) => (
    <View className="flex-1 justify-center items-center">
        <View className="bg-white rounded-2xl p-8 mx-8 items-center shadow-lg">
            <Ionicons name="warning" size={48} color="#EA4335" />
            <Text className="text-xl font-semibold text-gray-900 mt-4 mb-2 text-center">
                {title}
            </Text>
            <Text className="text-base text-gray-600 text-center leading-6 mb-6">
                {message}
            </Text>
            {onRetry && (
                <TouchableOpacity
                    onPress={onRetry}
                    className="bg-blue-500 rounded-xl px-6 py-3 mb-3"
                >
                    <Text className="text-white font-semibold">Try Again</Text>
                </TouchableOpacity>
            )}
            <TouchableOpacity
                onPress={onGoBack}
                className="bg-gray-100 rounded-xl px-6 py-3"
            >
                <Text className="text-gray-600 font-medium">Go Back</Text>
            </TouchableOpacity>
        </View>
    </View>
);