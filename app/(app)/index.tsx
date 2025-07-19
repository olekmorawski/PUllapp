import React, { useRef, useEffect } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useRideAppState } from '@/hooks/useRideAppState';
import {useRideManagement} from "@/hooks/useRideManagment";
import {useRouteManagement} from "@/hooks/useRouteManagment";
import { useLocationSetup } from '@/hooks/useLocationSetup';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { PassengerView } from '@/components/PassengerView';
import { DriverView } from '@/components/DriverView';

const sampleRideOptions = [
    {
        id: 1,
        name: 'Standard',
        type: 'standard',
        time: '5 min',
        price: '$12.00',
        suggestedRange: '$10-12',
        icon: '🚗'
    },
];

export default function RideAppInterface() {
    const router = useRouter();
    const mapRef = useRef<any>(null);

    const {
        isSidebarVisible,
        isDriverViewActive,
        origin,
        destination,
        routeGeoJSON,
        routeInfo,
        isLoadingRoute,
        selectedRide,
        acceptingRideId,
        handleMenuPress,
        closeSidebar,
        handleLocationSelect,
        handleRideSelect,
        toggleDriverView,
        setRouteGeoJSON,
        setRouteInfo,
        setIsLoadingRoute,
        setAcceptingRideId,
    } = useRideAppState();

    const {
        handleLocationUpdate,
        getInitialRegion
    } = useLocationSetup({
        origin,
        setOrigin: (location) => handleLocationSelect('origin', location!),
        onLocationSelect: handleLocationSelect,
    });

    useRouteManagement({
        origin,
        destination,
        setRouteGeoJSON,
        setRouteInfo,
        setIsLoadingRoute,
    });

    const {
        availableRides,
        isLoadingRides,
        handleAcceptRide,
        handleRejectRide,
        handleRefreshRides,
        handleConfirmRide,
    } = useRideManagement({
        isDriverViewActive,
        origin,
        destination,
        selectedRide,
        routeInfo,
        setAcceptingRideId,
    });

    useEffect(() => {
        if (!isDriverViewActive) return;

        handleRefreshRides();
        const interval = setInterval(handleRefreshRides, 30000);
        return () => clearInterval(interval);
    }, [isDriverViewActive, handleRefreshRides]);

    // Navigation handlers
    const handleNotificationPress = () => console.log('Notifications pressed');
    const handleProfilePress = () => router.push('/(app)/profile');
    const handleHistoryPress = () => router.push('/(app)/history');
    const handlePaymentPress = () => console.log('Payment pressed');
    const handleSettingsPress = () => router.push('/(app)/settings');
    const handleBecomeDriverPress = () => router.push('/(app)/become-driver');

    return (
        <SafeAreaView className="flex-1 bg-gray-100" edges={['right', 'top', 'left', 'bottom']}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

            <Header
                onMenuPress={handleMenuPress}
                onNotificationPress={handleNotificationPress}
            />

            {isDriverViewActive ? (
                <DriverView
                    mapRef={mapRef}
                    initialRegion={getInitialRegion()}
                    availableRides={availableRides}
                    isLoadingRides={isLoadingRides}
                    acceptingRideId={acceptingRideId}
                    onAcceptRide={handleAcceptRide}
                    onRejectRide={handleRejectRide}
                    onRefreshRides={handleRefreshRides}
                />
            ) : (
                <PassengerView
                    mapRef={mapRef}
                    initialRegion={getInitialRegion()}
                    origin={origin}
                    destination={destination}
                    routeGeoJSON={routeGeoJSON}
                    onLocationUpdate={handleLocationUpdate}
                    routeInfo={routeInfo}
                    isLoadingRoute={isLoadingRoute}
                    rideOptions={sampleRideOptions}
                    onRideSelect={handleRideSelect}
                    onConfirmRide={handleConfirmRide}
                    onLocationSelect={handleLocationSelect}
                />
            )}

            <Sidebar
                isVisible={isSidebarVisible}
                onClose={closeSidebar}
                onProfilePress={handleProfilePress}
                onHistoryPress={handleHistoryPress}
                onPaymentPress={handlePaymentPress}
                onSettingsPress={handleSettingsPress}
                onBecomeDriverPress={!isDriverViewActive ? handleBecomeDriverPress : undefined}
                onSwitchToDriverViewPress={!isDriverViewActive ? toggleDriverView : undefined}
                onSwitchToPassengerViewPress={isDriverViewActive ? toggleDriverView : undefined}
            />
        </SafeAreaView>
    );
}