import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; // For a back button icon
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity); // Will use Pressable from react-native later if needed

// Mock Data for Ride History
const mockRideHistory = [
  {
    id: '1',
    date: '2024-07-20',
    pickup: '123 Main St, Anytown',
    dropoff: '456 Oak Ave, Anytown',
    price: '$15.50',
    status: 'Completed',
  },
  {
    id: '2',
    date: '2024-07-18',
    pickup: '789 Pine Ln, Anytown',
    dropoff: '101 Maple Dr, Anytown',
    price: '$12.00',
    status: 'Completed',
  },
  {
    id: '3',
    date: '2024-07-15',
    pickup: '234 Birch Rd, Anytown',
    dropoff: '567 Cedar Ct, Anytown',
    price: '$22.75',
    status: 'Cancelled',
  },
  {
    id: '4',
    date: '2024-07-10',
    pickup: '890 Willow Way, Anytown',
    dropoff: '121 Spruce Pl, Anytown',
    price: '$18.20',
    status: 'Completed',
  },
];

interface RideItemProps {
  item: typeof mockRideHistory[0];
}

const RideItem: React.FC<RideItemProps> = ({ item }) => (
  <StyledView className="bg-white p-4 mb-4 rounded-lg shadow-sm border border-gray-200">
    <StyledView className="flex-row justify-between items-center mb-2">
      <StyledText className="text-lg font-semibold text-gray-800">{item.date}</StyledText>
      <StyledText
        className={`text-sm font-medium px-2 py-1 rounded-full ${
          item.status === 'Completed' ? 'bg-green-100 text-green-700' :
          item.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
          'bg-yellow-100 text-yellow-700'
        }`}
      >
        {item.status}
      </StyledText>
    </StyledView>
    <StyledView className="mb-1">
      <StyledText className="text-xs text-gray-500">From:</StyledText>
      <StyledText className="text-base text-gray-700">{item.pickup}</StyledText>
    </StyledView>
    <StyledView className="mb-2">
      <StyledText className="text-xs text-gray-500">To:</StyledText>
      <StyledText className="text-base text-gray-700">{item.dropoff}</StyledText>
    </StyledView>
    <StyledText className="text-lg font-bold text-right text-blue-600">{item.price}</StyledText>
  </StyledView>
);

export default function RideHistoryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top', 'left', 'right']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Ride History',
          headerLeft: () => (
            <StyledTouchableOpacity onPress={() => router.back()} className="ml-4">
              <Ionicons name="arrow-back" size={24} color="black" />
            </StyledTouchableOpacity>
          ),
        }}
      />

      <StyledView className="flex-1 p-4">
        {mockRideHistory.length > 0 ? (
          <FlatList
            data={mockRideHistory}
            renderItem={({ item }) => <RideItem item={item} />}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <StyledView className="flex-1 justify-center items-center">
            <StyledText className="text-lg text-gray-500">No ride history yet.</StyledText>
          </StyledView>
        )}
      </StyledView>
    </SafeAreaView>
  );
}

// Need to import TouchableOpacity for StyledTouchableOpacity
import { TouchableOpacity } from 'react-native-gesture-handler';
