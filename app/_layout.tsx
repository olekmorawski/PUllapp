import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css'
import { useColorScheme } from '@/hooks/useColorScheme';

import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';

// Mock auth state hook (replace with your actual auth logic)
const useAuth = () => {
  // For now, let's assume the user is not authenticated initially.
  // In a real app, you'd check a token, async storage, etc.
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  return { isAuthenticated, setIsAuthenticated }; // Return setIsAuthenticated for potential use in login/logout
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const { isAuthenticated } = useAuth(); // Use your auth state
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!loaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      // User is authenticated and in auth group, redirect to main app
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !inAuthGroup) {
      // User is not authenticated and not in auth group, redirect to login
      router.replace('/login');
    }
  }, [isAuthenticated, segments, loaded, router]);

  if (!loaded) {
    // Async font loading only occurs in development.
    // You might want a proper splash screen here in production
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
// React is needed for useState
import React from 'react';
