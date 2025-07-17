import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import StyledButton from '@/components/StyledButton';
import { useAuthContext } from '@/context/AuthContext'; // Import useAuthContext
import {SettingsItem} from "@/components/SettingsItem";

export default function SettingsScreen() {
  const router = useRouter();
  const { setIsAuthenticated } = useAuthContext(); // Get setIsAuthenticated from context
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          onPress: () => {
            console.log('User logging out...');
            setIsAuthenticated(false);
            router.replace('/(auth)/login');
          },
          style: "destructive"
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top', 'left', 'right']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Settings',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} className="ml-4">
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView className="flex-1">
        <Text className="text-xs font-semibold text-gray-500 p-4 pt-6 uppercase">Account</Text>
        <SettingsItem label="Edit Profile" icon="person-outline" onPress={() => router.push('/(app)/profile')} />
        <SettingsItem label="Top Up" icon="card-outline" onPress={() => router.push('/(app)/top-up')} />
        <SettingsItem label="Auction Settings" icon="card-outline" onPress={() => router.push('/(app)/auction-settings')} />


        {/*<Text className="text-xs font-semibold text-gray-500 p-4 pt-6 uppercase">Preferences</Text>*/}
        {/*<SettingsItem*/}
        {/*  label="Notifications"*/}
        {/*  icon="notifications-outline"*/}
        {/*  isSwitch*/}
        {/*  switchValue={notificationsEnabled}*/}
        {/*  onSwitchChange={setNotificationsEnabled}*/}
        {/*/>*/}
        {/*<SettingsItem*/}
        {/*  label="Dark Mode"*/}
        {/*  icon="moon-outline"*/}
        {/*  isSwitch*/}
        {/*  switchValue={darkModeEnabled}*/}
        {/*  onSwitchChange={setDarkModeEnabled}*/}
        {/*/>*/}
        {/*<SettingsItem label="Language" icon="language-outline" onPress={() => console.log('Navigate to Language Settings')} />*/}
        {/*<SettingsItem label="Currency" icon="language-outline" onPress={() => console.log('Navigate to Currency Settings')} />*/}

        <View className="p-4 mt-6">
          <StyledButton
            title="Log Out"
            onPress={handleLogout}
            variant="secondary"
            className="bg-red-100 border-red-300"
            textClassName="text-red-700"
          />
        </View>
        <Text className="text-center text-xs text-gray-400 pb-6">Version 1.0.0 (mock)</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
