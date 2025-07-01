import React, { useState, useRef } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView from 'react-native-maps';
import { useRouter } from 'expo-router'; // Import useRouter
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { BottomSheet } from "@/components/BottomSheet";
import { Map } from "@/components/Map";

export default function RideAppInterface() {
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);
    const mapRef = useRef<MapView>(null);
    const router = useRouter(); // Initialize router

    // Default region (you can customize this)
    const initialRegion = {
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
    };

    const handleMenuPress = () => {
        setIsSidebarVisible(true);
    };

    const handleNotificationPress = () => {
        console.log('Navigate to notifications');
        // router.push('/(tabs)/notifications'); // Example: if notifications is a tab screen
    };

    const handleProfilePress = () => {
        router.push('/(tabs)/profile');
        setIsSidebarVisible(false);
    };

    const handleHistoryPress = () => {
        router.push('/(tabs)/history');
        setIsSidebarVisible(false);
    };

    const handlePaymentPress = () => {
        console.log('Navigate to payment');
        // router.push('/(tabs)/payment'); // Example: if payment is a tab screen
        setIsSidebarVisible(false);
    };

    const handleSettingsPress = () => {
        router.push('/(tabs)/settings');
        setIsSidebarVisible(false);
    };

    const handleBecomeDriverPress = () => {
        router.push('/(tabs)/become-driver');
        setIsSidebarVisible(false);
    };

    const handleRideSelect = (ride: any) => {
        console.log('Selected ride:', ride);
    };

    const handleConfirmRide = () => {
        console.log('Confirming ride...');
        // Handle ride confirmation logic
    };

    return (
        <SafeAreaView className="flex-1 bg-gray-100" edges={["right", "top", "left", "bottom"]}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

            <Header
                onMenuPress={handleMenuPress}
                onNotificationPress={handleNotificationPress}
            />

            <Map
                mapRef={mapRef}
                initialRegion={initialRegion}
                className="flex-1"
            />

            <BottomSheet
                onRideSelect={handleRideSelect}
                onConfirmRide={handleConfirmRide}
            />

            <Sidebar
                isVisible={isSidebarVisible}
                onClose={() => setIsSidebarVisible(false)}
                onProfilePress={handleProfilePress}
                onHistoryPress={handleHistoryPress}
                onPaymentPress={handlePaymentPress}
                onSettingsPress={handleSettingsPress}
                onBecomeDriverPress={handleBecomeDriverPress}
            />
        </SafeAreaView>
    );
}