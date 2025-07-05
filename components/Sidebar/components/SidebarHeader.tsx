import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from './UserAvatar';
import { UserInfo } from './UserInfo';

interface SidebarHeaderProps {
    userName: string;
    walletAddress: string;
    onClose: () => void;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
                                                                userName,
                                                                walletAddress,
                                                                onClose
                                                            }) => {
    return (
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
                <View style={{ marginRight: 12 }}>
                    <UserAvatar />
                </View>
                <UserInfo userName={userName} walletAddress={walletAddress} />
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
    );
};