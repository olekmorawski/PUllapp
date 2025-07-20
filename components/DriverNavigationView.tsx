import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { NavigationView, NavigationViewController, CameraPerspective } from '@googlemaps/react-native-navigation-sdk';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface DriverNavigationViewProps {
    driverLocation?: { latitude: number; longitude: number };
    pickupLocation: { latitude: number; longitude: number };
    pickupAddress: string;
    destinationLocation: { latitude: number; longitude: number };
    destinationAddress: string;
    riderName: string;
    riderPhone?: string;
    onArrivedAtPickup: () => void;
    onStartTrip: () => void;
    onCompleteTrip: () => void;
    onCancelNavigation: () => void;
}

export const DriverNavigationView: React.FC<DriverNavigationViewProps> = ({
                                                                              driverLocation,
                                                                              pickupLocation,
                                                                              pickupAddress,
                                                                              destinationLocation,
                                                                              destinationAddress,
                                                                              riderName,
                                                                              riderPhone,
                                                                              onArrivedAtPickup,
                                                                              onStartTrip,
                                                                              onCompleteTrip,
                                                                              onCancelNavigation,
                                                                          }) => {
    const navigationControllerRef = useRef<NavigationViewController | null>(null);
    const [navigationState, setNavigationState] = useState<'to_pickup' | 'at_pickup' | 'to_destination' | 'completed'>('to_pickup');
    const [currentInstruction, setCurrentInstruction] = useState('');
    const [timeToDestination, setTimeToDestination] = useState('');
    const [distanceToDestination, setDistanceToDestination] = useState('');

    const onNavigationViewControllerCreated = (controller: NavigationViewController) => {
        navigationControllerRef.current = controller;

        // Example camera + UI setup
        controller.setFollowingPerspective(CameraPerspective.TILTED);
        controller.setNavigationUIEnabled(true);
        controller.setTripProgressBarEnabled(true);
        controller.setSpeedometerEnabled(true);
        controller.setRecenterButtonEnabled(true);
    };

    const handleArrivalAtPickup = () => {
        setNavigationState('at_pickup');
        onArrivedAtPickup();

        Alert.alert(
            'Arrived at Pickup',
            `You've arrived at the pickup location. Please wait for ${riderName}.`,
            [
                {
                    text: 'Start Trip',
                    onPress: () => {
                        setNavigationState('to_destination');
                        onStartTrip();
                    },
                },
                {
                    text: 'Call Rider',
                    onPress: () => {
                        if (riderPhone) {
                            console.log('Calling rider:', riderPhone);
                            // add call implementation if desired
                        }
                    },
                },
            ]
        );
    };

    const handleArrivalAtDestination = () => {
        setNavigationState('completed');
        Alert.alert('Trip Completed', 'You have arrived at the destination.', [
            {
                text: 'Complete Trip',
                onPress: onCompleteTrip,
            },
        ]);
    };

    const handleNavigationUpdate = (event: any) => {
        if (event.currentStep?.instruction) {
            setCurrentInstruction(event.currentStep.instruction);
        }

        if (event.remainingTime) {
            const minutes = Math.round(event.remainingTime / 60);
            setTimeToDestination(`${minutes} min`);
        }

        if (event.remainingDistance) {
            const km = (event.remainingDistance / 1000).toFixed(1);
            setDistanceToDestination(`${km} km`);
        }

        if (event.hasArrived) {
            if (navigationState === 'to_pickup') {
                handleArrivalAtPickup();
            } else if (navigationState === 'to_destination') {
                handleArrivalAtDestination();
            }
        }
    };

    const renderNavigationInfo = () => (
        <View style={styles.infoContainer}>
            <View style={styles.instructionContainer}>
                <Ionicons name="navigate" size={24} color="#007AFF" />
                <Text style={styles.instructionText} numberOfLines={2}>
                    {currentInstruction || 'Starting navigation...'}
                </Text>
            </View>

            <View style={styles.metricsContainer}>
                <View style={styles.metric}>
                    <Ionicons name="time-outline" size={20} color="#666" />
                    <Text style={styles.metricText}>{timeToDestination || '--'}</Text>
                </View>
                <View style={styles.metric}>
                    <Ionicons name="location-outline" size={20} color="#666" />
                    <Text style={styles.metricText}>{distanceToDestination || '--'}</Text>
                </View>
            </View>

            <View style={styles.destinationInfo}>
                <Text style={styles.destinationLabel}>
                    {navigationState === 'to_pickup' ? 'Pickup' : 'Destination'}:
                </Text>
                <Text style={styles.destinationAddress} numberOfLines={2}>
                    {navigationState === 'to_pickup' ? pickupAddress : destinationAddress}
                </Text>
            </View>

            <View style={styles.riderInfo}>
                <Ionicons name="person-circle-outline" size={24} color="#666" />
                <Text style={styles.riderName}>{riderName}</Text>
                {riderPhone && (
                    <TouchableOpacity style={styles.callButton}>
                        <Ionicons name="call" size={20} color="#007AFF" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mapContainer}>
                <NavigationView
                    style={styles.map}
                    onMapViewControllerCreated={(controller) => {
                        console.log('Map controller ready');
                    }}
                    onNavigationViewControllerCreated={onNavigationViewControllerCreated}
                    navigationViewCallbacks={{ onRecenterButtonClick: () => console.log('Recenter clicked') }}
                    mapViewCallbacks={{}}
                />

                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() =>
                        Alert.alert('Cancel Navigation', 'Are you sure you want to cancel this trip?', [
                            { text: 'No', style: 'cancel' },
                            { text: 'Yes', onPress: onCancelNavigation, style: 'destructive' },
                        ])
                    }
                >
                    <Ionicons name="close" size={24} color="#FF3B30" />
                </TouchableOpacity>
            </View>

            {renderNavigationInfo()}

            <View style={styles.actionContainer}>
                {navigationState === 'at_pickup' && (
                    <TouchableOpacity style={styles.actionButton} onPress={() => {
                        setNavigationState('to_destination');
                        onStartTrip();
                    }}>
                        <Text style={styles.actionButtonText}>Start Trip to Destination</Text>
                    </TouchableOpacity>
                )}
                {navigationState === 'completed' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.completeButton]}
                        onPress={onCompleteTrip}
                    >
                        <Text style={styles.actionButtonText}>Complete Trip</Text>
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    cancelButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: 'white',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    infoContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    instructionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    instructionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
        color: '#333',
    },
    metricsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 15,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#E5E5E5',
    },
    metric: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metricText: {
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 5,
        color: '#333',
    },
    destinationInfo: {
        marginBottom: 15,
    },
    destinationLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    destinationAddress: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    riderInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 10,
        borderTopWidth: 1,
        borderColor: '#E5E5E5',
    },
    riderName: {
        flex: 1,
        fontSize: 16,
        marginLeft: 10,
        color: '#333',
    },
    callButton: {
        padding: 10,
    },
    actionContainer: {
        padding: 20,
        backgroundColor: 'white',
    },
    actionButton: {
        backgroundColor: '#007AFF',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    completeButton: {
        backgroundColor: '#34C759',
    },
    actionButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
});