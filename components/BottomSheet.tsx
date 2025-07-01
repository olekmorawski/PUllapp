import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Dimensions,
    PanResponder,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    interpolate,
    Extrapolation
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 150; // Almost full screen
const MIN_TRANSLATE_Y = -200; // Collapsed state

const AnimatedView = Animated.createAnimatedComponent(View);

interface RideOption {
    id: number;
    type: string;
    time: string;
    price: string;
    icon: string;
}

interface BottomSheetProps {
    rideOptions?: RideOption[];
    onRideSelect?: (ride: RideOption) => void;
    onConfirmRide?: () => void;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
                                                            rideOptions = [
                                                                { id: 1, type: 'RideX', time: '2 min', price: '$8.50', icon: '🚗' },
                                                                { id: 2, type: 'RideXL', time: '3 min', price: '$12.20', icon: '🚙' },
                                                                { id: 3, type: 'RidePremium', time: '5 min', price: '$18.40', icon: '🖤' },
                                                            ],
                                                            onRideSelect,
                                                            onConfirmRide
                                                        }) => {
    const [currentLocation, setCurrentLocation] = useState('');
    const [destination, setDestination] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isScrollEnabled, setIsScrollEnabled] = useState(true);

    // Shared value for grabbing animation
    const translateY = useSharedValue(MIN_TRANSLATE_Y);
    const startY = useRef(0);

    const handleDestinationFocus = () => {
        if (currentLocation.trim() !== '') {
            setIsExpanded(true);
            translateY.value = withSpring(MAX_TRANSLATE_Y, {
                damping: 50,
                stiffness: 300,
            });
        }
    };

    const collapseCard = () => {
        setIsExpanded(false);
        translateY.value = withSpring(MIN_TRANSLATE_Y, {
            damping: 50,
            stiffness: 300,
        });
    };

    const handleRidePress = (ride: RideOption) => {
        onRideSelect?.(ride);
    };

    const handleConfirmPress = () => {
        onConfirmRide?.();
    };

    // Pan responder for grabbable header
    const headerPanResponder = React.useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onMoveShouldSetPanResponder: (_, gestureState) => {
                    // Only respond to vertical gestures, not when expanded and scrolling
                    return Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
                },
                onPanResponderGrant: (_, gestureState) => {
                    startY.current = translateY.value;
                    setIsScrollEnabled(false);
                },
                onPanResponderMove: (_, gestureState) => {
                    const newValue = startY.current + gestureState.dy;
                    translateY.value = Math.max(
                        Math.min(newValue, MIN_TRANSLATE_Y),
                        MAX_TRANSLATE_Y
                    );
                },
                onPanResponderRelease: (_, gestureState) => {
                    setIsScrollEnabled(true);
                    const shouldExpand =
                        gestureState.vy < -0.5 ||
                        translateY.value < (MIN_TRANSLATE_Y + MAX_TRANSLATE_Y) / 2;

                    if (shouldExpand && currentLocation.trim() !== '') {
                        setIsExpanded(true);
                        translateY.value = withSpring(MAX_TRANSLATE_Y, {
                            damping: 50,
                            stiffness: 300
                        });
                    } else {
                        setIsExpanded(false);
                        translateY.value = withSpring(MIN_TRANSLATE_Y, {
                            damping: 50,
                            stiffness: 300
                        });
                    }
                }
            }),
        [currentLocation]
    );

    // Animated style for the bottom card
    const rBottomSheetStyle = useAnimatedStyle(() => {
        const borderRadius = interpolate(
            translateY.value,
            [MAX_TRANSLATE_Y, MIN_TRANSLATE_Y],
            [0, 24],
            Extrapolation.CLAMP
        );

        return {
            transform: [{ translateY: translateY.value }],
            borderTopLeftRadius: borderRadius,
            borderTopRightRadius: borderRadius
        };
    });

    // Fixed animated style for ride options
    const rideOptionsStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            translateY.value,
            [MIN_TRANSLATE_Y, MIN_TRANSLATE_Y - 50, MAX_TRANSLATE_Y],
            [0, 0.3, 1],
            Extrapolation.CLAMP
        );

        return {
            opacity,
        };
    });

    return (
        <AnimatedView
            style={[
                rBottomSheetStyle,
                {
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: -SCREEN_HEIGHT,
                    backgroundColor: "white",
                    height: SCREEN_HEIGHT,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    elevation: 10,
                }
            ]}
        >
            {/* Grabbable Header */}
            <View {...headerPanResponder.panHandlers}>
                <View className="w-full items-center pt-4">
                    {/* Grabber Handle */}
                    <View className="w-12 h-1 bg-gray-300 rounded-full mb-4" />
                </View>

                {/* Inputs Section */}
                <View className="px-6 gap-4">
                    {/* Current Location */}
                    <View className="flex-row items-center gap-3">
                        <View className="w-3 h-3 bg-green-500 rounded-full" />
                        <TextInput
                            className="flex-1 p-4 bg-gray-50 rounded-xl text-gray-800"
                            placeholder="Current location"
                            value={currentLocation}
                            onChangeText={setCurrentLocation}
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    {/* Destination */}
                    <View className="flex-row items-center gap-3 mb-4">
                        <View className="w-3 h-3 bg-red-500 rounded-full" />
                        <TextInput
                            className="flex-1 p-4 bg-gray-50 rounded-xl text-gray-800"
                            placeholder="Where to?"
                            value={destination}
                            onChangeText={setDestination}
                            onFocus={handleDestinationFocus}
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                </View>
            </View>

            {/* Ride Options (shown when expanded) */}
            {isExpanded && (
                <Animated.View style={rideOptionsStyle}>
                    <ScrollView
                        className="flex-1 px-6"
                        scrollEnabled={isScrollEnabled}
                        showsVerticalScrollIndicator={false}
                    >
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-semibold text-gray-800">Choose a ride</Text>
                            <TouchableOpacity onPress={collapseCard}>
                                <Ionicons name="chevron-down" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View className="gap-3">
                            {rideOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.id}
                                    className="flex-row items-center justify-between p-4 bg-gray-50 rounded-xl active:bg-gray-100"
                                    onPress={() => handleRidePress(option)}
                                >
                                    <View className="flex-row items-center gap-3">
                                        <Text className="text-2xl">{option.icon}</Text>
                                        <View>
                                            <Text className="font-semibold text-gray-800">{option.type}</Text>
                                            <Text className="text-sm text-gray-500">{option.time} away</Text>
                                        </View>
                                    </View>
                                    <Text className="font-bold text-gray-800">{option.price}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            className="mt-6 mb-8 bg-blue-600 py-4 rounded-xl active:bg-blue-700"
                            onPress={handleConfirmPress}
                        >
                            <Text className="text-white text-center font-semibold text-lg">
                                Confirm Ride
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            )}
        </AnimatedView>
    );
};