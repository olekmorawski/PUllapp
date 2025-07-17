import React from 'react';
import { View } from 'react-native';
import { SidebarItem } from "@/components/BottomSheet/components/SidebarItem";
import { BecomeDriverButton } from './BecomeDriverButton';
import { SidebarDivider } from './SidebarDivider';

interface SidebarContentProps {
    onProfilePress: () => void;
    onHistoryPress: () => void;
    onSettingsPress: () => void;
    onBecomeDriverPress?: () => void;
    onSwitchToDriverViewPress?: () => void;
    onSwitchToPassengerViewPress?: () => void;
    onClose: () => void;
}

export const SidebarContent: React.FC<SidebarContentProps> = ({
                                                                  onProfilePress,
                                                                  onHistoryPress,
                                                                  onSettingsPress,
                                                                  onBecomeDriverPress,
                                                                  onSwitchToDriverViewPress,
                                                                  onSwitchToPassengerViewPress,
                                                                  onClose
                                                              }) => {
    const handleBecomeDriver = () => {
        if (onBecomeDriverPress) {
            onBecomeDriverPress();
        } else {
            console.log('Navigate to become a driver');
        }
        onClose();
    };

    return (
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

            <SidebarDivider />

            {onBecomeDriverPress && (
                <BecomeDriverButton onPress={handleBecomeDriver} />
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
    );
};