import { Stack } from 'expo-router';
import React from 'react';

export default function TabLayout() {
    return (
        <Stack>
            <Stack.Screen
                name="index"
                options={{
                    headerShown: false, // The main map screen has its own custom header
                }}
            />
            <Stack.Screen
                name="history"
                // Options are configured within history.tsx using Stack.Screen
                // This keeps screen-specific configurations co-located.
                // If we wanted a default header for all (tabs) screens, we'd set it in screenOptions here.
            />
            <Stack.Screen name="profile" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="become-driver" />
            {/*
              Note: By not specifying `options` here for history, profile, etc.,
              we rely on the `Stack.Screen` options defined within each of those screen files themselves.
              This is a valid approach with Expo Router.
              Alternatively, common options could be set in `screenOptions` above,
              and specific screens could override them. For now, individual config is fine.
            */}
        </Stack>
    );
}