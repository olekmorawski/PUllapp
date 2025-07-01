import React from 'react';
import { View, Text, Image, TouchableOpacity as RNTouchableOpacity } from 'react-native'; // Renamed to avoid conflict
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import StyledButton from '@/components/StyledButton';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledImage = styled(Image);
const StyledTouchableOpacity = styled(RNTouchableOpacity); // Use the renamed import

// Mock User Data
const mockUser = {
  name: 'Alex Rider',
  email: 'alex.rider@example.com',
  profileImageUrl: 'https://via.placeholder.com/150/007BFF/FFFFFF?Text=AR', // Placeholder image
  memberSince: 'Joined July 2024',
};

export default function ProfileScreen() {
  const router = useRouter();

  const handleEditProfile = () => {
    // Navigate to an Edit Profile screen (to be created)
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
            <StyledTouchableOpacity onPress={() => router.back()} className="ml-4">
              <Ionicons name="arrow-back" size={24} color="black" />
            </StyledTouchableOpacity>
          ),
        }}
      />

      <StyledView className="flex-1 items-center p-6">
        <StyledView className="items-center mb-8">
          <StyledImage
            source={{ uri: mockUser.profileImageUrl }}
            className="w-32 h-32 rounded-full mb-4 border-4 border-blue-500"
          />
          <StyledText className="text-2xl font-bold text-gray-800">{mockUser.name}</StyledText>
          <StyledText className="text-base text-gray-600">{mockUser.email}</StyledText>
          <StyledText className="text-sm text-gray-500 mt-1">{mockUser.memberSince}</StyledText>
        </StyledView>

        <StyledView className="w-full space-y-4">
          <InfoRow label="Full Name" value={mockUser.name} icon="person-outline" />
          <InfoRow label="Email Address" value={mockUser.email} icon="mail-outline" />
          <InfoRow label="Phone Number" value="(123) 456-7890 (mock)" icon="call-outline" />
          {/* Add more rows as needed */}
        </StyledView>

        <StyledButton
          title="Edit Profile"
          onPress={handleEditProfile}
          variant="primary"
          style={{ marginTop: 32, width: '100%', maxWidth: 300 }}
        />
      </StyledView>
    </SafeAreaView>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap; // For type safety on icon names
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, icon }) => (
  <StyledView className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex-row items-center">
    <Ionicons name={icon} size={22} color="#4B5563" className="mr-4" />
    <StyledView>
      <StyledText className="text-xs text-gray-500">{label}</StyledText>
      <StyledText className="text-base text-gray-800 font-medium">{value}</StyledText>
    </StyledView>
  </StyledView>
);
