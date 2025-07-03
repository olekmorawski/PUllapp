import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.4; // 40% of screen height
const VISIBLE_HEIGHT = MODAL_HEIGHT - 80; // How much is visible when collapsed

interface DriverRideDetails {
    earnings: string;
    pickupAddress: string;
    destinationAddress: string;
    timeToClient: string;
}

interface DriverBottomSheetProps {
    rideDetails: DriverRideDetails | null;
    isVisible: boolean; // To control initial rendering if needed
}

export const DriverBottomSheet: React.FC<DriverBottomSheetProps> = ({ rideDetails, isVisible }) => {
    const translateY = useSharedValue(SCREEN_HEIGHT); // Start off-screen
    const context = useSharedValue({ y: 0 });

    const panGesture = Gesture.Pan()
        .onStart(() => {
            context.value = { y: translateY.value };
        })
        .onUpdate((event) => {
            translateY.value = Math.max(context.value.y + event.translationY, SCREEN_HEIGHT - MODAL_HEIGHT);
        })
        .onEnd(() => {
            if (translateY.value > SCREEN_HEIGHT - MODAL_HEIGHT / 2) {
                translateY.value = withTiming(SCREEN_HEIGHT - VISIBLE_HEIGHT); // Snap to collapsed
            } else {
                translateY.value = withTiming(SCREEN_HEIGHT - MODAL_HEIGHT); // Snap to expanded
            }
        });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
        };
    });

    React.useEffect(() => {
        if (isVisible) {
            // Animate in when component becomes visible (e.g., driver view active)
            translateY.value = withTiming(SCREEN_HEIGHT - VISIBLE_HEIGHT, { duration: 300 });
        } else {
            translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 }); // Animate out
        }
    }, [isVisible, translateY]);


    if (!rideDetails) {
        // Or render a placeholder if no active ride
        return (
            <Animated.View style={[styles.container, animatedStyle, { height: MODAL_HEIGHT }]}>
                <View style={styles.handleBarContainer}>
                    <View style={styles.handleBar} />
                </View>
                <View style={styles.content}>
                    <Ionicons name="information-circle-outline" size={40} color="#999" style={{alignSelf: 'center', marginBottom: 10}}/>
                    <Text style={styles.placeholderText}>No active ride assigned.</Text>
                    <Text style={styles.placeholderSubText}>Waiting for new requests...</Text>
                </View>
            </Animated.View>
        );
    }

    return (
        <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.container, animatedStyle, { height: MODAL_HEIGHT }]}>
                <View style={styles.handleBarContainer}>
                    <View style={styles.handleBar} />
                </View>
                <View style={styles.content}>
                    <View style={styles.infoRow}>
                        <Ionicons name="cash-outline" size={24} color="#4CAF50" style={styles.icon} />
                        <Text style={styles.label}>Earnings for this trip:</Text>
                        <Text style={styles.valueBold}>{rideDetails.earnings}</Text>
                    </View>

                    <View style={styles.separator} />

                    <View style={styles.addressContainer}>
                        <Ionicons name="navigate-circle-outline" size={24} color="#007AFF" style={styles.icon} />
                        <View style={styles.addressTextContainer}>
                            <Text style={styles.label}>Pick up:</Text>
                            <Text style={styles.value}>{rideDetails.pickupAddress}</Text>
                        </View>
                    </View>
                     <View style={styles.timeToClientRow}>
                        <Ionicons name="time-outline" size={20} color="#FF9500" style={styles.iconSmall} />
                        <Text style={styles.timeToClientText}>Time to client: {rideDetails.timeToClient}</Text>
                    </View>

                    <View style={styles.addressContainer}>
                        <Ionicons name="flag-outline" size={24} color="#AF52DE" style={styles.icon} />
                        <View style={styles.addressTextContainer}>
                            <Text style={styles.label}>Destination:</Text>
                            <Text style={styles.value}>{rideDetails.destinationAddress}</Text>
                        </View>
                    </View>

                    {/* More details can be added here */}
                </View>
            </Animated.View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 10,
    },
    handleBarContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    handleBar: {
        width: 40,
        height: 5,
        backgroundColor: '#ccc',
        borderRadius: 3,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 20, // For safe area or additional spacing
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start', // Align icon to the top of the text block
        marginVertical: 10,
    },
    addressTextContainer: {
        flex: 1,
    },
    icon: {
        marginRight: 12,
        marginTop: 2, // Align with first line of text
    },
    iconSmall: {
        marginRight: 8,
    },
    label: {
        fontSize: 16,
        color: '#555',
        marginBottom: 2,
    },
    value: {
        fontSize: 16,
        color: '#333',
    },
    valueBold: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginLeft: 'auto', // Push to the right
    },
    timeToClientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 36, // Align with address text, under pickup
        marginBottom: 10,
    },
    timeToClientText: {
        fontSize: 14,
        color: '#FF9500',
    },
    separator: {
        height: 1,
        backgroundColor: '#e0e0e0',
        marginVertical: 12,
    },
    placeholderText: {
        fontSize: 18,
        color: '#777',
        textAlign: 'center',
        marginBottom: 5,
    },
    placeholderSubText: {
        fontSize: 14,
        color: '#aaa',
        textAlign: 'center',
    }
});

export default DriverBottomSheet;
