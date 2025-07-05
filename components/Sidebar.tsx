import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    Dimensions,
    SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SidebarItem } from "@/components/SidebarItem";
import { dynamicClient } from '@/app/_layout'; // Your Dynamic client import

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.70;

interface SidebarProps {
    isVisible: boolean;
    onClose: () => void;
    onProfilePress: () => void;
    onHistoryPress: () => void;
    onPaymentPress: () => void;
    onSettingsPress: () => void;
    onBecomeDriverPress?: () => void;
    onSwitchToDriverViewPress?: () => void;
    onSwitchToPassengerViewPress?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = (props) => {
    const {
        isVisible,
        onClose,
        onProfilePress,
        onHistoryPress,
        onPaymentPress,
        onSettingsPress,
        onBecomeDriverPress,
        onSwitchToDriverViewPress,
        onSwitchToPassengerViewPress,
    } = props;

    const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const backdropOpacity = React.useRef(new Animated.Value(0)).current;

    // State for user and wallet information
    const [userName, setUserName] = useState('User');
    const [walletAddress, setWalletAddress] = useState('');

    useEffect(() => {
        // Get authenticated user and wallet information
        const getWalletInfo = () => {
            const authenticatedUser = dynamicClient.auth.authenticatedUser;

            if (authenticatedUser) {
                // Set user name from various possible sources
                const displayName = authenticatedUser.firstName ||
                    authenticatedUser.alias ||
                    authenticatedUser.username ||
                    'User';
                setUserName(displayName);

                // Get wallet address from verified credentials
                if (authenticatedUser.verifiedCredentials && authenticatedUser.verifiedCredentials.length > 0) {
                    // Get the first wallet address (you can modify this logic as needed)
                    const walletCredential = authenticatedUser.verifiedCredentials.find(
                        credential => credential.format === 'blockchain' && credential.address
                    );

                    if (walletCredential?.address) {
                        setWalletAddress(walletCredential.address);
                    }
                }
            }
        };

        if (isVisible) {
            getWalletInfo();
        }
    }, [isVisible]);

    const formatWalletAddress = (address: string) => {
        if (!address) return '';
        if (address.length <= 10) return address;
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    useEffect(() => {
        if (isVisible) {
            // Animate in
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 0.5,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Animate out
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -SIDEBAR_WIDTH,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isVisible]);

    const handleBecomeDriver = () => {
        if (onBecomeDriverPress) {
            onBecomeDriverPress();
        } else {
            console.log('Navigate to become a driver');
        }
        onClose();
    };

    if (!isVisible) return null;

    return (
        <View
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1000,
            }}
            pointerEvents={isVisible ? 'auto' : 'none'}
        >
            {/* Backdrop */}
            <Animated.View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'black',
                    opacity: backdropOpacity,
                }}
            >
                <TouchableOpacity
                    style={{ flex: 1 }}
                    activeOpacity={1}
                    onPress={onClose}
                />
            </Animated.View>

            {/* Sidebar */}
            <Animated.View
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: SIDEBAR_WIDTH,
                    height: SCREEN_HEIGHT,
                    backgroundColor: 'white',
                    transform: [{ translateX: slideAnim }],
                    shadowColor: '#000',
                    shadowOffset: {
                        width: 2,
                        height: 0,
                    },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 8,
                }}
            >
                <SafeAreaView style={{ flex: 1 }}>
                    {/* Header */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 20,
                        paddingVertical: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: '#f0f0f0',
                    }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                                width: 50,
                                height: 50,
                                borderRadius: 25,
                                backgroundColor: '#007AFF',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12,
                            }}>
                                <Ionicons name="wallet" size={24} color="white" />
                            </View>
                            <View>
                                <Text style={{
                                    fontSize: 18,
                                    fontWeight: '600',
                                    color: '#333',
                                }}>
                                    {userName}
                                </Text>
                                <Text style={{
                                    fontSize: 14,
                                    color: '#666',
                                    marginTop: 2,
                                    fontFamily: 'monospace', // Better for addresses
                                }}>
                                    {walletAddress ? formatWalletAddress(walletAddress) : 'No wallet connected'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={{
                                padding: 8,
                                borderRadius: 20,
                                backgroundColor: '#f5f5f5',
                            }}
                        >
                            <Ionicons name="close" size={20} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1, paddingTop: 8 }}>
                        <SidebarItem
                            icon="person-outline"
                            title="Profile"
                            onPress={onProfilePress}
                        />

                        <SidebarItem
                            icon="time-outline"
                            title="Ride History"
                            onPress={onHistoryPress}
                        />

                        <SidebarItem
                            icon="settings-outline"
                            title="Settings"
                            onPress={onSettingsPress}
                        />

                        {/* Divider */}
                        <View style={{
                            height: 1,
                            backgroundColor: '#f0f0f0',
                            marginVertical: 16,
                            marginHorizontal: 20,
                        }} />

                        {/* Become a Driver Button */}
                        {onBecomeDriverPress && (
                            <TouchableOpacity
                                onPress={handleBecomeDriver}
                                style={{
                                    marginHorizontal: 20,
                                    marginVertical: 8,
                                    backgroundColor: '#007AFF',
                                    borderRadius: 12,
                                    padding: 16,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    shadowColor: '#007AFF',
                                    shadowOffset: {
                                        width: 0,
                                        height: 2,
                                    },
                                    shadowOpacity: 0.2,
                                    shadowRadius: 4,
                                    elevation: 4,
                                }}
                            >
                                <View style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    borderRadius: 20,
                                    padding: 8,
                                    marginRight: 12,
                                }}>
                                    <Ionicons name="car-outline" size={20} color="white" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{
                                        color: 'white',
                                        fontSize: 16,
                                        fontWeight: '600',
                                    }}>
                                        Become a Driver
                                    </Text>
                                    <Text style={{
                                        color: 'rgba(255, 255, 255, 0.8)',
                                        fontSize: 12,
                                        marginTop: 2,
                                    }}>
                                        Start earning with your car
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="white" />
                            </TouchableOpacity>
                        )}

                        {onSwitchToDriverViewPress && (
                            <SidebarItem
                                icon="swap-horizontal-outline"
                                title="Switch to Driver View"
                                onPress={() => {
                                    onSwitchToDriverViewPress();
                                    onClose();
                                }}
                            />
                        )}
                        {onSwitchToPassengerViewPress && (
                            <SidebarItem
                                icon="swap-horizontal-outline"
                                title="Switch to Passenger View"
                                onPress={() => {
                                    onSwitchToPassengerViewPress();
                                    onClose();
                                }}
                            />
                        )}
                    </View>

                    {/* Footer */}
                    <View style={{
                        paddingHorizontal: 20,
                        paddingBottom: 20,
                        borderTopWidth: 1,
                        borderTopColor: '#f0f0f0',
                        paddingTop: 16,
                    }}>
                        <SidebarItem
                            icon="log-out-outline"
                            title="Sign Out"
                            onPress={() => console.log('Sign out pressed')}
                            textColor="#FF3B30"
                        />
                    </View>
                </SafeAreaView>
            </Animated.View>
        </View>
    );
};