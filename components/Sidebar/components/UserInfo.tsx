import React from 'react';
import { View, Text } from 'react-native';

interface UserInfoProps {
    userName: string;
    walletAddress: string;
}

export const UserInfo: React.FC<UserInfoProps> = ({ userName, walletAddress }) => {
    const formatWalletAddress = (address: string) => {
        if (!address) return '';
        if (address.length <= 10) return address;
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
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
                fontFamily: 'monospace',
            }}>
                {walletAddress ? formatWalletAddress(walletAddress) : 'No wallet connected'}
            </Text>
        </View>
    );
};