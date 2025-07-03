import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Added import
import '../global.css'
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useEffect } from 'react';
import { useRouter, useSegments, Stack } from 'expo-router';
import { AuthProvider, useAuthContext } from '@/context/AuthContext';

// This is the component that will contain the navigation logic
function RootNavigation() {
  const colorScheme = useColorScheme(); // Assuming useColorScheme is a custom hook
  const { isAuthenticated } = useAuthContext(); // Use context-based auth state
  const segments = useSegments();
  const router = useRouter();
  const [fontsLoaded] = useFonts({ // Renamed `loaded` to `fontsLoaded` for clarity
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (!fontsLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    // Debugging logs
    // console.log('Auth State Changed:', isAuthenticated);
    // console.log('Current Segments:', segments);
    // console.log('In Auth Group:', inAuthGroup);


    if (isAuthenticated && inAuthGroup) {
      // console.log('Redirecting to /tabs');
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !inAuthGroup && segments[0] !== undefined) {
      // Added segments[0] !== undefined to prevent redirect on initial load when segments might be empty
      // console.log('Redirecting to /login');
      router.replace('/(auth)/login'); // Corrected path to /auth/login
    }
  }, [isAuthenticated, segments, fontsLoaded, router]);

  if (!fontsLoaded) {
    return null; // Or a custom splash screen component
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

// RootLayout now wraps RootNavigation with AuthProvider
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigation />
    </AuthProvider>
  );
}
