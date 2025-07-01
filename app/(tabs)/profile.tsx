import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import StyledButton from '@/components/StyledButton';

// Mock User Data
const mockUser = {
  name: 'Alex Rider',
  email: 'alex.rider@example.com',
  profileImageUrl: 'https://via.placeholder.com/150/007BFF/FFFFFF?Text=AR',
  memberSince: 'Joined July 2024',
};

export default function ProfileScreen() {
  const router = useRouter();

  const handleEditProfile = () => {
    // router.push('/(tabs)/edit-profile');
    console.log('Navigate to Edit Profile');
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
          <Image
            source={{ uri: mockUser.profileImageUrl }}
            className="w-32 h-32 rounded-full mb-4 border-4 border-blue-500"
          />
          <Text className="text-2xl font-bold text-gray-800">{mockUser.name}</Text>
          <Text className="text-base text-gray-600">{mockUser.email}</Text>
          <Text className="text-sm text-gray-500 mt-1">{mockUser.memberSince}</Text>
        </View>

        <View className="w-full space-y-4">
          <InfoRow label="Full Name" value={mockUser.name} icon="person-outline" />
          <InfoRow label="Email Address" value={mockUser.email} icon="mail-outline" />
          <InfoRow label="Phone Number" value="(123) 456-7890 (mock)" icon="call-outline" />
        </View>

        <StyledButton
          title="Edit Profile"
          onPress={handleEditProfile}
          variant="primary"
          className="mt-8 w-full max-w-[300px]" // Use className for styling
        />
      </View>
    </SafeAreaView>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, icon }) => (
  <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex-row items-center">
    <Ionicons name={icon} size={22} color="#4B5563" className="mr-4" />
    <View>
      <Text className="text-xs text-gray-500">{label}</Text>
      <Text className="text-base text-gray-800 font-medium">{value}</Text>
    </View>
  </View>
);
