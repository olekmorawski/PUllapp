import React from 'react';
import { View, Text, ScrollView, TouchableOpacity as RNTouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import StyledButton from '@/components/StyledButton';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledTouchableOpacity = styled(RNTouchableOpacity);
const StyledSwitch = styled(Switch);

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
  <StyledTouchableOpacity
    onPress={onPress}
    className="bg-white p-4 flex-row items-center justify-between border-b border-gray-200"
    disabled={!onPress && !isSwitch}
  >
    <StyledView className="flex-row items-center">
      <Ionicons name={icon} size={22} color="#4B5563" className="mr-4" />
      <StyledText className="text-base text-gray-800">{label}</StyledText>
    </StyledView>
    {isSwitch && onSwitchChange ? (
      <StyledSwitch value={switchValue} onValueChange={onSwitchChange} trackColor={{false: '#E5E7EB', true: '#3B82F6'}} thumbColor={switchValue ? '#FFFFFF' : '#F3F4F6'} />
    ) : !hideArrow ? (
      <Ionicons name="chevron-forward-outline" size={22} color="#9CA3AF" />
    ) : null}
  </StyledTouchableOpacity>
);

export default function SettingsScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false); // Example state

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          onPress: () => {
            console.log('User logged out');
            // Here you would typically:
            // 1. Clear authentication tokens / state
            // 2. Navigate to the login screen
            // For now, using mock auth, we'll just navigate to login
            // This assumes the useAuth hook in _layout.tsx will reset or be reset.
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
            <StyledTouchableOpacity onPress={() => router.back()} className="ml-4">
              <Ionicons name="arrow-back" size={24} color="black" />
            </StyledTouchableOpacity>
          ),
        }}
      />

      <StyledScrollView className="flex-1">
        <StyledText className="text-xs font-semibold text-gray-500 p-4 pt-6 uppercase">Account</StyledText>
        <SettingsItem label="Edit Profile" icon="person-outline" onPress={() => router.push('/(tabs)/profile')} />
        <SettingsItem label="Payment Methods" icon="card-outline" onPress={() => console.log('Navigate to Payment Methods')} />
        <SettingsItem label="Privacy" icon="shield-checkmark-outline" onPress={() => console.log('Navigate to Privacy Settings')} />

        <StyledText className="text-xs font-semibold text-gray-500 p-4 pt-6 uppercase">Preferences</StyledText>
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

        <StyledText className="text-xs font-semibold text-gray-500 p-4 pt-6 uppercase">Support & Legal</StyledText>
        <SettingsItem label="Help & Support" icon="help-circle-outline" onPress={() => console.log('Navigate to Help & Support')} />
        <SettingsItem label="Terms of Service" icon="document-text-outline" onPress={() => console.log('Navigate to Terms of Service')} />
        <SettingsItem label="About" icon="information-circle-outline" onPress={() => console.log('Navigate to About Page')} />

        <StyledView className="p-4 mt-6">
          <StyledButton
            title="Log Out"
            onPress={handleLogout}
            variant="secondary" // Or a custom 'danger' variant if created
            style={{ backgroundColor: '#FECACA', borderColor: '#F87171' }} // Example: light red for logout
            textStyle={{ color: '#DC2626' }} // Example: darker red text
          />
        </StyledView>
        <StyledText className="text-center text-xs text-gray-400 pb-6">Version 1.0.0 (mock)</StyledText>
      </StyledScrollView>
    </SafeAreaView>
  );
}
