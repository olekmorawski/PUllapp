import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
    onMenuPress: () => void;
    onNotificationPress: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuPress, onNotificationPress }) => {
    return (
        <View className="px-4 py-2">
            <View className="flex-row items-center justify-between">
                {/* Menu Icon */}
                <TouchableOpacity
                    className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm"
                    onPress={onMenuPress}
                >
                    <Ionicons name="menu-outline" size={20} color="#374151" />
                </TouchableOpacity>

                {/* Notifications */}
                <TouchableOpacity
                    className="w-10 h-10 bg-white rounded-full items-center justify-center shadow-sm relative"
                    onPress={onNotificationPress}
                >
                    <Ionicons name="notifications-outline" size={20} color="#374151" />
                    <View className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                </TouchableOpacity>
            </View>
        </View>
    );
};