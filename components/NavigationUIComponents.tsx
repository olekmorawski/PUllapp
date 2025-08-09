import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Define valid maneuver types
type ManeuverType = 'turn-left' | 'turn-right' | 'straight' | 'u-turn';

interface NavigationInstructionProps {
    instruction: string;
    distance: string;
    maneuver?: ManeuverType;
    isVisible?: boolean;
}

export const NavigationInstruction: React.FC<NavigationInstructionProps> = ({
                                                                                instruction,
                                                                                distance,
                                                                                maneuver = 'straight',
                                                                                isVisible = true
                                                                            }) => {
    const slideAnim = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isVisible ? 0 : -100,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isVisible]);

    const getManeuverIcon = (): keyof typeof Ionicons.glyphMap => {
        switch (maneuver) {
            case 'turn-left':
                return 'arrow-back';
            case 'turn-right':
                return 'arrow-forward';
            case 'u-turn':
                return 'return-up-back';
            case 'straight':
            default:
                return 'arrow-up';
        }
    };

    if (!isVisible) return null;

    return (
        <Animated.View
            style={{ transform: [{ translateY: slideAnim }] }}
            className="absolute top-52 left-4 right-4"
        >
            <View className="bg-gray-900/95 rounded-2xl p-5 shadow-xl flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-blue-500 items-center justify-center mr-4">
                    <Ionicons name={getManeuverIcon()} size={24} color="white" />
                </View>

                <View className="flex-1">
                    <Text className="text-lg font-semibold text-white mb-1">
                        {instruction}
                    </Text>
                    <Text className="text-sm text-white/70">
                        in {distance}
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
};

interface EtaCardProps {
    arrivalTime: string;
    timeRemaining: string;
    distance: string;
    isVisible?: boolean;
}

export const EtaCard: React.FC<EtaCardProps> = ({
                                                    arrivalTime,
                                                    timeRemaining,
                                                    distance,
                                                    isVisible = true
                                                }) => {
    const slideAnim = useRef(new Animated.Value(100)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isVisible ? 0 : 100,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <Animated.View
            style={{ transform: [{ translateY: slideAnim }] }}
            className="absolute bottom-36 right-4"
        >
            <View className="bg-white/95 rounded-2xl p-4 shadow-lg min-w-32">
                <Text className="text-xl font-bold text-gray-900 text-center">
                    {arrivalTime}
                </Text>
                <Text className="text-xs text-gray-600 text-center mt-1">
                    Arrival
                </Text>

                <View className="h-px bg-gray-300 my-2" />

                <Text className="text-sm font-semibold text-blue-500 text-center">
                    {timeRemaining}
                </Text>
                <Text className="text-xs text-gray-600 text-center mt-1">
                    {distance}
                </Text>
            </View>
        </Animated.View>
    );
};

interface NavigationControlsProps {
    onRecenter?: () => void;
    onVolumeToggle?: () => void;
    onRouteOptions?: () => void;
    isMuted?: boolean;
    isVisible?: boolean;
}

export const NavigationControls: React.FC<NavigationControlsProps> = ({
                                                                          onRecenter,
                                                                          onVolumeToggle,
                                                                          onRouteOptions,
                                                                          isMuted = false,
                                                                          isVisible = true
                                                                      }) => {
    const slideAnim = useRef(new Animated.Value(100)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isVisible ? 0 : 100,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <Animated.View
            style={{ transform: [{ translateY: slideAnim }] }}
            className="absolute bottom-52 right-4"
        >
            <View className="bg-white/95 rounded-2xl shadow-lg overflow-hidden">
                <TouchableOpacity
                    onPress={onRecenter}
                    className="p-4 items-center justify-center"
                >
                    <Ionicons name="locate" size={24} color="#4285F4" />
                </TouchableOpacity>

                <View className="h-px bg-gray-300 mx-2" />

                <TouchableOpacity
                    onPress={onVolumeToggle}
                    className="p-4 items-center justify-center"
                >
                    <Ionicons
                        name={isMuted ? "volume-mute" : "volume-high"}
                        size={24}
                        color={isMuted ? "#999" : "#4285F4"}
                    />
                </TouchableOpacity>

                <View className="h-px bg-gray-300 mx-2" />

                <TouchableOpacity
                    onPress={onRouteOptions}
                    className="p-4 items-center justify-center"
                >
                    <Ionicons name="options" size={24} color="#4285F4" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};