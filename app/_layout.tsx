import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css'
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useEffect } from 'react';
import { useRouter, useSegments, Stack } from 'expo-router';
import { AuthProvider, useAuthContext } from '@/context/AuthContext';
import { dynamicClient } from '@/lib/dynamicClient';
import {queryClient} from "@/lib/queryClient";
import {QueryClientProvider} from "@tanstack/react-query";

function RootNavigation() {
  const colorScheme = useColorScheme();
  const { isAuthenticated } = useAuthContext();
  const segments = useSegments();
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !inAuthGroup && segments[0] !== undefined) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, segments, fontsLoaded, router]);

  if (!fontsLoaded) {
    return null;
  }

  return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <dynamicClient.reactNative.WebView />
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

export default function RootLayout() {
  return (
      <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RootNavigation />
      </AuthProvider>
        </QueryClientProvider>
  );
}