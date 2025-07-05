import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface UserAvatarProps {
    size?: number;
    backgroundColor?: string;
    iconColor?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
                                                          size = 50,
                                                          backgroundColor = '#007AFF',
                                                          iconColor = 'white'
                                                      }) => {
    return (
        <View style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor,
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <Ionicons name="wallet" size={size * 0.48} color={iconColor} />
        </View>
    );
};