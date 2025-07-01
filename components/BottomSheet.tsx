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
    suggestedRange: string;
    icon: string;
}

interface BottomSheetProps {
    rideOptions?: RideOption[];
    onRideSelect?: (ride: RideOption, customPrice: string) => void;
    onConfirmRide?: () => void;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
                                                            rideOptions = [
                                                                { id: 1, type: 'RideX', time: '2 min', suggestedRange: '$8-12', icon: '🚗' },
                                                                { id: 2, type: 'RideXL', time: '3 min', suggestedRange: '$15-22', icon: '🚙' },
                                                                { id: 3, type: 'RidePremium', time: '5 min', suggestedRange: '$25-35', icon: '🖤' },
                                                            ],
                                                            onRideSelect,
                                                            onConfirmRide
                                                        }) => {
    const [currentLocation, setCurrentLocation] = useState('');
    const [destination, setDestination] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isScrollEnabled, setIsScrollEnabled] = useState(true);
    const [selectedRide, setSelectedRide] = useState<RideOption | null>(null);
    const [customPrices, setCustomPrices] = useState<{[key: number]: string}>({});

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
        const customPrice = customPrices[ride.id] || '';
        onRideSelect?.(ride, customPrice);
    };

    const handlePriceChange = (rideId: number, price: string) => {
        // Only allow numbers, dots, and dollar signs
        const cleanPrice = price.replace(/[^0-9.$]/g, '');
        setCustomPrices(prev => ({
            ...prev,
            [rideId]: cleanPrice
        }));

        // If this ride is selected, update the parent
        if (selectedRide?.id === rideId) {
            onRideSelect?.(selectedRide, cleanPrice);
        }
    };

    const handleSuggestionPress = (rideId: number, suggestedRange: string) => {
        // Extract middle value from range like "$8-12" -> "$10"
        const numbers = suggestedRange.match(/\d+/g);
        if (numbers && numbers.length >= 2) {
            const min = parseInt(numbers[0]);
            const max = parseInt(numbers[1]);
            const middle = Math.round((min + max) / 2);
            const middlePrice = `$${middle}`;
            handlePriceChange(rideId, middlePrice);
        }
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

            {/* Ride Options */}
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

                        <View className="gap-4">
                            {rideOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.id}
                                    className={`p-4 rounded-xl border ${
                                        selectedRide?.id === option.id
                                            ? 'bg-blue-50 border-blue-500'
                                            : 'bg-gray-50 border-gray-200'
                                    }`}
                                    onPress={() => handleRidePress(option)}
                                    activeOpacity={0.7}
                                >
                                    {/* Top Row: Car info and selection indicator */}
                                    <View className="flex-row items-center justify-between mb-3">
                                        <View className="flex-row items-center gap-3">
                                            <Text className="text-2xl">{option.icon}</Text>
                                            <View>
                                                <Text className="font-semibold text-gray-800">{option.type}</Text>
                                                <Text className="text-sm text-gray-500">{option.time} away</Text>
                                            </View>
                                        </View>
                                        {selectedRide?.id === option.id && (
                                            <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                                        )}
                                    </View>

                                    {/* Price Input Row */}
                                    <View className="flex-row items-center gap-3">
                                        <View className="flex-1">
                                            <Text className="text-sm text-gray-600 mb-2">Your price offer:</Text>
                                            <TextInput
                                                className="p-3 bg-white border border-gray-300 rounded-lg text-lg font-semibold text-gray-800"
                                                placeholder="$0"
                                                value={customPrices[option.id] || ''}
                                                onChangeText={(text) => handlePriceChange(option.id, text)}
                                                keyboardType="numeric"
                                                placeholderTextColor="#9CA3AF"
                                                onFocus={(e) => e.stopPropagation()}
                                            />
                                        </View>

                                        {/* Suggestion */}
                                        <View className="items-center">
                                            <Text className="text-xs text-gray-500 mb-1">suggested</Text>
                                            <TouchableOpacity
                                                className="px-3 py-2 bg-green-100 rounded-lg border border-green-300"
                                                onPress={() => handleSuggestionPress(option.id, option.suggestedRange)}
                                            >
                                                <Text className="text-green-700 font-medium text-sm">{option.suggestedRange}</Text>
                                            </TouchableOpacity>
                                        </View>
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