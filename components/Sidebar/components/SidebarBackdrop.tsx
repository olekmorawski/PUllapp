import React from 'react';
import { TouchableOpacity, Animated } from 'react-native';

interface SidebarBackdropProps {
    opacity: Animated.AnimatedValue;
    onPress: () => void;
}

export const SidebarBackdrop: React.FC<SidebarBackdropProps> = ({ opacity, onPress }) => {
    return (
        <Animated.View
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'black',
                opacity,
            }}
        >
            <TouchableOpacity
                style={{ flex: 1 }}
                activeOpacity={1}
                onPress={onPress}
            />
        </Animated.View>
    );
};