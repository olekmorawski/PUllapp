// screens/EditProfileScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import StyledButton from '@/components/StyledButton';
import { useAuthContext } from '@/context/AuthContext';
import { useUsernameUpdate, useUsernameValidation } from '@/hooks/user/useUpdateUsername';

export default function EditProfileScreen() {
    const router = useRouter();
    const { dynamicUser, backendUser } = useAuthContext();
    const { validateUsername } = useUsernameValidation();

    const [username, setUsername] = useState(
        backendUser?.username || ''
    );

    const usernameUpdate = useUsernameUpdate({
        onSuccess: (newUsername) => {
            Alert.alert(
                'Success',
                `Username updated to "${newUsername}"!`,
                [{ text: 'OK', onPress: () => router.back() }]
            );
        },
        onError: (error) => {
            Alert.alert(
                'Error',
                error.message || 'Failed to update username. Please try again.'
            );
        }
    });

    const handleSaveProfile = async () => {
        const trimmedUsername = username.trim();

        // Validate username
        const validation = validateUsername(trimmedUsername);
        if (!validation.isValid) {
            Alert.alert('Invalid Username', validation.error);
            return;
        }

        // Check if username actually changed
        const currentUsername = dynamicUser?.username || backendUser?.username;
        if (trimmedUsername === currentUsername) {
            Alert.alert('No Changes', 'Username is already up to date.');
            return;
        }

        try {
            await usernameUpdate.updateUsername({ newUsername: trimmedUsername });
        } catch (error) {
            // Error handling is already done in the hook's onError
            console.error('Username update error:', error);
        }
    };

    const formatWalletAddress = (address?: string) => {
        if (!address) return 'No wallet connected';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-100" edges={['top', 'left', 'right']}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Edit Profile',
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} className="ml-4">
                            <Ionicons name="arrow-back" size={24} color="black" />
                        </TouchableOpacity>
                    ),
                }}
            />

            <View className="flex-1 p-6">
                <View className="space-y-6">
                    {/* Editable Username */}
                    <View>
                        <Text className="text-sm font-medium text-gray-700 mb-2">
                            Username
                        </Text>
                        <TextInput
                            className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base focus:border-blue-500"
                            value={username}
                            onChangeText={setUsername}
                            placeholder="Enter username"
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!usernameUpdate.isLoading}
                        />
                        <Text className="text-xs text-gray-500 mt-1">
                            3-20 characters, letters, numbers, dots, and underscores only
                        </Text>
                    </View>

                    {/* Read-only Email */}
                    <View>
                        <Text className="text-sm font-medium text-gray-700 mb-2">
                            Email
                        </Text>
                        <TextInput
                            className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-600"
                            value={dynamicUser?.email || 'No email'}
                            editable={false}
                        />
                        <Text className="text-xs text-gray-500 mt-1">
                            Email cannot be changed
                        </Text>
                    </View>

                    {/* Read-only Wallet Address */}
                    <View>
                        <Text className="text-sm font-medium text-gray-700 mb-2">
                            Wallet Address
                        </Text>
                        <TextInput
                            className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-600"
                            value={formatWalletAddress(dynamicUser?.walletAddress)}
                            editable={false}
                        />
                        <Text className="text-xs text-gray-500 mt-1">
                            Wallet address cannot be changed
                        </Text>
                    </View>

                    {/* Account Info */}
                    <View className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <Text className="text-sm font-medium text-blue-800 mb-1">
                            Account Information
                        </Text>
                        <Text className="text-xs text-blue-600">
                            Backend ID: {backendUser?.id || 'Not synced'}
                        </Text>
                        <Text className="text-xs text-blue-600">
                            Created: {backendUser?.createdAt ?
                            new Date(backendUser.createdAt).toLocaleDateString() :
                            'Unknown'
                        }
                        </Text>
                    </View>
                </View>

                {/* Save Button */}
                <StyledButton
                    title={usernameUpdate.isLoading ? "Saving..." : "Save Changes"}
                    onPress={handleSaveProfile}
                    variant="primary"
                    className="mt-8 w-full"
                    disabled={usernameUpdate.isLoading}
                />

                {/* Cancel Button */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="mt-4 py-3 items-center"
                    disabled={usernameUpdate.isLoading}
                >
                    <Text className="text-gray-600 text-base">Cancel</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}