import React from "react";
import {Text, TouchableOpacity} from "react-native";
import {Ionicons} from "@expo/vector-icons";

interface SidebarItemProps {
    icon: string;
    title: string;
    onPress: () => void;
    textColor?: string;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
                                                     icon,
                                                     title,
                                                     onPress,
                                                     textColor = '#333'
                                                 }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 16,
                backgroundColor: 'transparent',
            }}
            activeOpacity={0.7}
        >
            <Ionicons
                name={icon as any}
                size={22}
                color={textColor === '#333' ? '#666' : textColor}
                style={{ marginRight: 16, width: 24 }}
            />
            <Text style={{
                fontSize: 16,
                color: textColor,
                flex: 1,
            }}>
                {title}
            </Text>
            {textColor === '#333' && (
                <Ionicons name="chevron-forward" size={16} color="#ccc" />
            )}
        </TouchableOpacity>
    );
};