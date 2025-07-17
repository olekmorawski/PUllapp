import {Ionicons} from "@expo/vector-icons";
import React from "react";
import {Text, View} from "react-native";

interface InfoRowProps {
    label: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
    badge?: string;
}

export const InfoRow: React.FC<InfoRowProps> = ({ label, value, icon, badge }) => (
    <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex-row items-center">
        <Ionicons name={icon} size={22} color="#4B5563" className="mr-4" />
        <View className="flex-1">
            <View className="flex-row items-center justify-between">
                <Text className="text-xs text-gray-500">{label}</Text>
                {badge && (
                    <View className={`px-2 py-1 rounded-full ${
                        badge === 'LIVE' ? 'bg-green-100' :
                            badge === 'VERIFIED' ? 'bg-blue-100' :
                                'bg-yellow-100'
                    }`}>
                        <Text className={`text-xs font-medium ${
                            badge === 'LIVE' ? 'text-green-700' :
                                badge === 'VERIFIED' ? 'text-blue-700' :
                                    'text-yellow-700'
                        }`}>
                            {badge}
                        </Text>
                    </View>
                )}
            </View>
            <Text className="text-base text-gray-800 font-medium">{value}</Text>
        </View>
    </View>
);