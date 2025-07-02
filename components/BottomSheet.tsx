import React, { useRef, useState } from 'react';
import {
    View,
    Dimensions,
    PanResponder,
    ScrollView
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    interpolate,
    Extrapolation,
} from "react-native-reanimated";
import { BottomSheetHeader } from './BottomSheetHeader';
import { RideOptionsList } from './RideOptionList'; // Fixed import name
import { ConfirmButton } from './ConfirmButton';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 380; // Keep original constraint
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

    // Pan responder for grabbable header ONLY
    const headerPanResponder = React.useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onMoveShouldSetPanResponder: (_, gestureState) => {
                    // Only respond to vertical gestures and only in the header area
                    return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) + 15;
                },
                onPanResponderGrant: (_, gestureState) => {
                    startY.current = translateY.value;
                    // Don't disable scroll here - only disable if we're actually dragging
                },
                onPanResponderMove: (_, gestureState) => {
                    // Only disable scroll if we're moving significantly
                    if (Math.abs(gestureState.dy) > 10) {
                        setIsScrollEnabled(false);
                    }

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
            {/* Header with pan handlers only on the header area */}
            <BottomSheetHeader
                panHandlers={headerPanResponder.panHandlers}
                currentLocation={currentLocation}
                destination={destination}
                onCurrentLocationChange={setCurrentLocation}
                onDestinationChange={setDestination}
                onCurrentLocationFocus={handleCurrentLocationFocus}
                onDestinationFocus={handleDestinationFocus}
            />

            {/* Scrollable content area - natural flow, button at bottom */}
            {isExpanded && (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        paddingHorizontal: 24,
                        paddingTop: 8,
                    }}
                    scrollEnabled={isScrollEnabled}
                    showsVerticalScrollIndicator={true}
                    bounces={true}
                    scrollEventThrottle={16}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                >
                    <RideOptionsList
                        rideOptions={rideOptions}
                        selectedRide={selectedRide}
                        customPrices={customPrices}
                        onRidePress={handleRidePress}
                        onPriceChange={handlePriceChange}
                        onSuggestionPress={handleSuggestionPress}
                    />

                    <ConfirmButton
                        isEnabled={Boolean(
                            currentLocation.trim() &&
                            destination.trim() &&
                            selectedRide
                        )}
                        onPress={handleConfirmPress}
                    />
                </ScrollView>
            )}
        </AnimatedView>
    );
};