import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    interpolate,
    Extrapolation
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SidebarProps {
    isVisible: boolean;
    onClose: () => void;
    onProfilePress?: () => void;
    onHistoryPress?: () => void;
    onPaymentPress?: () => void;
    onSettingsPress?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
                                                    isVisible,
                                                    onClose,
                                                    onProfilePress,
                                                    onHistoryPress,
                                                    onPaymentPress,
                                                    onSettingsPress
                                                }) => {
    const sidebarTranslateX = useSharedValue(-SCREEN_WIDTH);

    React.useEffect(() => {
        sidebarTranslateX.value = withSpring(isVisible ? 0 : -SCREEN_WIDTH, {
            damping: 20,
            stiffness: 300
        });
    }, [isVisible]);

    const sidebarStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: sidebarTranslateX.value }]
    }));

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            sidebarTranslateX.value,
            [-SCREEN_WIDTH, 0],
            [0, 0.5],
            Extrapolation.CLAMP
        )
    }));

    if (!isVisible) return null;

    const menuItems = [
        {
            icon: 'person-outline',
            title: 'Profile',
            onPress: onProfilePress
        },
        {
            icon: 'time-outline',
            title: 'Ride History',
            onPress: onHistoryPress
        },
        {
            icon: 'card-outline',
            title: 'Payment',
            onPress: onPaymentPress
        },
        {
            icon: 'settings-outline',
            title: 'Settings',
            onPress: onSettingsPress
        }
    ];

    return (
        <>
            {/* Overlay */}
            <Animated.View
                style={[overlayStyle]}
                className="absolute inset-0 bg-black z-40"
            >
                <TouchableOpacity
                    className="flex-1"
                    onPress={onClose}
                    activeOpacity={1}
                />
            </Animated.View>

            {/* Sidebar */}
            <Animated.View
                style={[sidebarStyle]}
                className="absolute left-0 top-0 bottom-0 w-80 bg-white z-50 shadow-2xl"
            >
                <SafeAreaView className="flex-1" edges={["top", "left", "bottom"]}>
                    <View className="p-6">
                        <View className="flex-row items-center justify-between mb-8">
                            <Text className="text-xl font-bold text-gray-800">Menu</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <View className="gap-4">
                            {menuItems.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    className="flex-row items-center gap-3 p-3 rounded-lg active:bg-gray-100"
                                    onPress={item.onPress}
                                >
                                    <Ionicons name={item.icon as any} size={24} color="#374151" />
                                    <Text className="text-lg text-gray-800">{item.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </SafeAreaView>
            </Animated.View>
        </>
    );
};