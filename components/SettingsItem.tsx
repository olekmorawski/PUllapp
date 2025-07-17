import {Ionicons} from "@expo/vector-icons";
import React from "react";
import {Switch, Text, TouchableOpacity, View} from "react-native";

interface SettingsItemProps {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress?: () => void;
    isSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
    hideArrow?: boolean;
}

export const SettingsItem: React.FC<SettingsItemProps> = ({
                                                       label,
                                                       icon,
                                                       onPress,
                                                       isSwitch,
                                                       switchValue,
                                                       onSwitchChange,
                                                       hideArrow
                                                   }) => (
    <TouchableOpacity
        onPress={onPress}
        className="bg-white p-4 flex-row items-center justify-between border-b border-gray-200"
        disabled={!onPress && !isSwitch}
        activeOpacity={onPress ? 0.2 : 1}
    >
        <View className="flex-row items-center">
            <Ionicons name={icon} size={22} color="#4B5563" className="mr-4" />
            <Text className="text-base text-gray-800">{label}</Text>
        </View>
        {isSwitch && onSwitchChange ? (
            <Switch
                value={switchValue}
                onValueChange={onSwitchChange}
                trackColor={{false: '#E5E7EB', true: '#3B82F6'}}
                thumbColor={switchValue ? '#FFFFFF' : '#F3F4F6'}
            />
        ) : !hideArrow && onPress ? (
            <Ionicons name="chevron-forward-outline" size={22} color="#9CA3AF" />
        ) : null}
    </TouchableOpacity>
);