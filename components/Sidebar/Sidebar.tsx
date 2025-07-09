import React, { useEffect } from 'react';
import {
    View,
    Animated,
    Dimensions,
    SafeAreaView,
} from 'react-native';
import { useAuthContext } from "@/context/AuthContext";
import {SidebarHeader} from "@/components/Sidebar/components/SidebarHeader";
import {SidebarContent} from "@/components/Sidebar/components/SidebarContent";
import {SidebarFooter} from "@/components/Sidebar/components/SidebarFooter";
import {SidebarBackdrop} from "@/components/Sidebar/components/SidebarBackdrop";

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
    onSignOut?: () => void;
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
        onSignOut,
    } = props;

    const { userName, userEmail, walletAddress, backendUser, signOut } = useAuthContext();
    const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const backdropOpacity = React.useRef(new Animated.Value(0)).current;

    // Debug: Log user data when sidebar is visible
    useEffect(() => {
        if (isVisible) {
            console.log('🎯 Sidebar opened:');
            console.log('📧 Email:', userEmail);
            console.log('👤 Username:', userName);
            console.log('💰 Wallet (Dynamic):', walletAddress);
            console.log('🔐 Backend User ID:', backendUser?.id);
            console.log('✅ Verified:', backendUser ? 'Yes' : 'No');
        }
    }, [isVisible, userName, userEmail, walletAddress, backendUser]);

    useEffect(() => {
        if (isVisible) {
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

    const handleSignOut = async () => {
        try {
            await signOut();
            onSignOut?.();
        } catch (error) {
            console.error('Error signing out:', error);
        }
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
            <SidebarBackdrop opacity={backdropOpacity} onPress={onClose} />

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
                    <SidebarHeader
                        userName={userName}
                        walletAddress={walletAddress} // Always from Dynamic
                        onClose={onClose}
                    />

                    <SidebarContent
                        onProfilePress={onProfilePress}
                        onHistoryPress={onHistoryPress}
                        onSettingsPress={onSettingsPress}
                        onBecomeDriverPress={onBecomeDriverPress}
                        onSwitchToDriverViewPress={onSwitchToDriverViewPress}
                        onSwitchToPassengerViewPress={onSwitchToPassengerViewPress}
                        onClose={onClose}
                    />

                    <SidebarFooter onSignOut={handleSignOut} />
                </SafeAreaView>
            </Animated.View>
        </View>
    );
};