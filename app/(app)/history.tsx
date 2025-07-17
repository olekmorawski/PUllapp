import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native'; // Use TouchableOpacity from react-native
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {mockRideHistory} from "@/components/RideReciept";
import {RideReciept} from "@/components/RideReciept";


export default function RideHistoryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top', 'left', 'right']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Ride History',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-4">
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
          ),
        }}
      />

      <View className="flex-1 p-4">
        {mockRideHistory.length > 0 ? (
          <FlatList
            data={mockRideHistory}
            renderItem={({ item }) => <RideReciept item={item} />}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1 justify-center items-center">
            <Text className="text-lg text-gray-500">No ride history yet.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
