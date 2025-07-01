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
    Extrapolation,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 380; // Almost full screen
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
                                                                { id: 1, type: 'RideX', time: '2 min', price: '$8-12', icon: '🚗' },
                                                                { id: 2, type: 'RideXL', time: '3 min', price: '$15-22', icon: '🚙' },
                                                                { id: 3, type: 'RidePremium', time: '5 min', price: '$25-35', icon: '🖤' },
                                                            ],
                                                            onRideSelect,
                                                            onConfirmRide
                                                        }) => {
    const [currentLocation, setCurrentLocation] = useState('');
    const [destination, setDestination] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isScrollEnabled, setIsScrollEnabled] = useState(true);
    const [selectedRide, setSelectedRide] = useState<RideOption | null>(null);

    // Shared value for grabbing animation
    const translateY = useSharedValue(MIN_TRANSLATE_Y);
    const startY = useRef(0);

    const expandSheet = () => {
        setIsExpanded(true);
        translateY.value = withSpring(MAX_TRANSLATE_Y, {
            damping: 50,
            stiffness: 300,
        });
    };

    const collapseSheet = () => {
        setIsExpanded(false);
        translateY.value = withSpring(MIN_TRANSLATE_Y, {
            damping: 50,
            stiffness: 300,
        });
    };

    const handleDestinationFocus = () => {
        expandSheet();
    };

    const handleCurrentLocationFocus = () => {
        expandSheet();
    };

    const handleRidePress = (ride: RideOption) => {
        setSelectedRide(ride);
        onRideSelect?.(ride);
    };

    const handleConfirmPress = () => {
        if (currentLocation.trim() && destination.trim() && selectedRide) {
            onConfirmRide?.();
        }
    };

    // Pan responder for grabbable header
    const headerPanResponder = React.useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onMoveShouldSetPanResponder: (_, gestureState) => {
                    return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) + 10;
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

                    if (shouldExpand) {
                        expandSheet();
                    } else {
                        collapseSheet();
                    }
                }
            }),
        []
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

    const isConfirmEnabled = currentLocation.trim() && destination.trim() && selectedRide;

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
                            onFocus={handleCurrentLocationFocus}
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

            {/* Ride Options (always rendered when expanded, no complex animations) */}
            {isExpanded && (
                <View style={{ flex: 1 }}>
                    <ScrollView
                        className="flex-1 px-6"
                        scrollEnabled={isScrollEnabled}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    >
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-lg font-semibold text-gray-800">Choose a ride</Text>
                            <TouchableOpacity onPress={collapseSheet}>
                                <Ionicons name="chevron-down" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <View className="gap-3">
                            {rideOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.id}
                                    className={`flex-row items-center justify-between p-4 rounded-xl border ${
                                        selectedRide?.id === option.id
                                            ? 'bg-blue-50 border-blue-500'
                                            : 'bg-gray-50 border-gray-200'
                                    }`}
                                    onPress={() => handleRidePress(option)}
                                    activeOpacity={0.7}
                                >
                                    <View className="flex-row items-center gap-3">
                                        <Text className="text-2xl">{option.icon}</Text>
                                        <View>
                                            <Text className="font-semibold text-gray-800">{option.type}</Text>
                                            <Text className="text-sm text-gray-500">{option.time} away</Text>
                                        </View>
                                    </View>
                                    <View className="items-end">
                                        <Text className="font-bold text-gray-800 text-lg">{option.price}</Text>
                                        <Text className="text-xs text-gray-500">recommended price range</Text>
                                        {selectedRide?.id === option.id && (
                                            <Ionicons name="checkmark-circle" size={20} color="#3B82F6" style={{ marginTop: 2 }} />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity
                            className={`mt-6 py-4 rounded-xl ${
                                isConfirmEnabled
                                    ? 'bg-blue-600 active:bg-blue-700'
                                    : 'bg-gray-300'
                            }`}
                            onPress={handleConfirmPress}
                            disabled={!isConfirmEnabled}
                            activeOpacity={isConfirmEnabled ? 0.8 : 1}
                        >
                            <Text className={`text-center font-semibold text-lg ${
                                isConfirmEnabled ? 'text-white' : 'text-gray-500'
                            }`}>
                                {isConfirmEnabled
                                    ? 'Pull Up'
                                    : 'Select ride & fill locations'
                                }
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            )}
        </AnimatedView>
    );
};