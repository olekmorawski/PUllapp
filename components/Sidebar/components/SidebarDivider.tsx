import React from 'react';
import { View } from 'react-native';

interface SidebarDividerProps {
    marginVertical?: number;
    marginHorizontal?: number;
    color?: string;
}

export const SidebarDivider: React.FC<SidebarDividerProps> = ({
                                                                  marginVertical = 16,
                                                                  marginHorizontal = 20,
                                                                  color = '#f0f0f0'
                                                              }) => {
    return (
        <View style={{
            height: 1,
            backgroundColor: color,
            marginVertical,
            marginHorizontal,
        }} />
    );
};