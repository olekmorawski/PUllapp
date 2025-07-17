import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import StyledButton from '@/components/StyledButton';
import {InfoRow} from "@/components/InfoRow";
import { useAuthContext } from '@/context/AuthContext';

export default function ProfileScreen() {
    const router = useRouter();
    const { dynamicUser, backendUser, isVerified, walletAddress, isDriver, userName } = useAuthContext();

    const handleEditProfile = () => {
        router.push('/edit');
    };

    // Use userName from context (which now prioritizes backend username)
    const displayName = userName && userName !== 'User' ?
        userName.charAt(0).toUpperCase() + userName.slice(1) :
        'User';

    const profileImageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=150&background=007BFF&color=ffffff&bold=true`;

    const formatMemberSince = (dateString?: string) => {
        if (!dateString) return 'Member since recently';

        try {
            const date = new Date(dateString);
            const options: Intl.DateTimeFormatOptions = {
                year: 'numeric',
                month: 'long'
            };
            return `Joined ${date.toLocaleDateString('en-US', options)}`;
        } catch {
            return 'Member since recently';
        }
    };

    const formatWalletForDisplay = (address: string) => {
        if (!address) return 'No wallet connected';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-100" edges={['top', 'left', 'right']}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'My Profile',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} className="ml-4">
                            <Ionicons name="arrow-back" size={24} color="black" />
                        </TouchableOpacity>
                    ),
                }}
            />

            <View className="flex-1 items-center p-6">
                <View className="items-center mb-8">
                    <View className="relative">
                        <Image
                            source={{ uri: profileImageUrl }}
                            className="w-32 h-32 rounded-full mb-4 border-4 border-blue-500"
                        />
                        {isVerified && (
                            <View className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1">
                                <Ionicons name="checkmark" size={16} color="white" />
                            </View>
                        )}
                    </View>

                    <Text className="text-2xl font-bold text-gray-800">{displayName}</Text>
                    <Text className="text-base text-gray-600">{dynamicUser?.email || 'No email'}</Text>
                    <Text className="text-sm text-gray-500 mt-1">
                        {formatMemberSince(backendUser?.createdAt)}
                    </Text>

                    <View className={`px-3 py-1 rounded-full mt-2 ${isVerified ? 'bg-green-100' : 'bg-yellow-100'}`}>
                        <Text className={`text-xs font-medium ${isVerified ? 'text-green-800' : 'text-yellow-800'}`}>
                            {isVerified ? '✅ Verified User' : '⏳ Verification Pending'}
                        </Text>
                    </View>
                </View>

                <View className="w-full space-y-4">
                    <InfoRow
                        label="Username"
                        value={userName || 'Not set'}
                        icon="person-outline"
                    />

                    <InfoRow
                        label="Email Address"
                        value={dynamicUser?.email || 'No email'}
                        icon="mail-outline"
                    />

                    <InfoRow
                        label="Wallet Address"
                        value={formatWalletForDisplay(walletAddress)}
                        icon="wallet-outline"
                        badge={walletAddress ? "LIVE" : undefined}
                    />

                    {backendUser?.id && (
                        <InfoRow
                            label="Is Driver?"
                            value={isDriver ? 'Yes' : 'No'}
                            icon="car-outline"
                        />
                    )}

                    <InfoRow
                        label="Account Status"
                        value={isVerified ? 'Verified' : 'Pending Verification'}
                        icon="shield-checkmark-outline"
                        badge={isVerified ? "VERIFIED" : "PENDING"}
                    />
                </View>

                <StyledButton
                    title="Edit Profile"
                    onPress={handleEditProfile}
                    variant="primary"
                    className="mt-8 w-full max-w-[300px]"
                />
            </View>
        </SafeAreaView>
    );
}