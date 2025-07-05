import React from 'react';
import { View } from 'react-native';
import { SidebarItem } from "@/components/BottomSheet/components/SidebarItem";

interface SidebarFooterProps {
    onSignOut?: () => void;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({ onSignOut }) => {
    return (
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
                onPress={onSignOut || (() => console.log('Sign out pressed'))}
                textColor="#FF3B30"
            />
        </View>
    );
};
