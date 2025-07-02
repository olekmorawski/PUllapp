import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import StyledButton from '@/components/StyledButton';
import { useAuthContext } from '@/context/AuthContext'; // Import useAuthContext

interface SettingsItemProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  isSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  hideArrow?: boolean;
}

const SettingsItem: React.FC<SettingsItemProps> = ({
  label,
  icon,
  onPress,
  isSwitch,
  switchValue,
  onSwitchChange,
  hideArrow
}) => (
  <TouchableOpacity
    onPress={onPress}
    className="bg-white p-4 flex-row items-center justify-between border-b border-gray-200"
    disabled={!onPress && !isSwitch}
    activeOpacity={onPress ? 0.2 : 1}
  >
    <View className="flex-row items-center">
      <Ionicons name={icon} size={22} color="#4B5563" className="mr-4" />
      <Text className="text-base text-gray-800">{label}</Text>
    </View>
    {isSwitch && onSwitchChange ? (
      <Switch
        value={switchValue}
        onValueChange={onSwitchChange}
        trackColor={{false: '#E5E7EB', true: '#3B82F6'}}
        thumbColor={switchValue ? '#FFFFFF' : '#F3F4F6'}
      />
    ) : !hideArrow && onPress ? (
      <Ionicons name="chevron-forward-outline" size={22} color="#9CA3AF" />
    ) : null}
  </TouchableOpacity>
);

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
            setIsAuthenticated(false); // Set isAuthenticated to false
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
        <SettingsItem label="Edit Profile" icon="person-outline" onPress={() => router.push('/(tabs)/profile')} />
        <SettingsItem label="Payment Methods" icon="card-outline" onPress={() => console.log('Navigate to Payment Methods')} />
        <SettingsItem label="Privacy" icon="shield-checkmark-outline" onPress={() => console.log('Navigate to Privacy Settings')} />

        <Text className="text-xs font-semibold text-gray-500 p-4 pt-6 uppercase">Preferences</Text>
        <SettingsItem
          label="Notifications"
          icon="notifications-outline"
          isSwitch
          switchValue={notificationsEnabled}
          onSwitchChange={setNotificationsEnabled}
        />
        <SettingsItem
          label="Dark Mode"
          icon="moon-outline"
          isSwitch
          switchValue={darkModeEnabled}
          onSwitchChange={setDarkModeEnabled}
        />
        <SettingsItem label="Language" icon="language-outline" onPress={() => console.log('Navigate to Language Settings')} />

        <Text className="text-xs font-semibold text-gray-500 p-4 pt-6 uppercase">Support & Legal</Text>
        <SettingsItem label="Help & Support" icon="help-circle-outline" onPress={() => console.log('Navigate to Help & Support')} />
        <SettingsItem label="Terms of Service" icon="document-text-outline" onPress={() => console.log('Navigate to Terms of Service')} />
        <SettingsItem label="About" icon="information-circle-outline" onPress={() => console.log('Navigate to About Page')} />

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
