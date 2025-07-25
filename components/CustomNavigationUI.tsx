// components/CustomNavigationUI.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MapboxMap } from '@/components/MapboxMap';
import { useCustomNavigation } from '@/hooks/useCustomNavigation';

interface CustomNavigationUIProps {
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number };
    onNavigationComplete?: () => void;
    onNavigationCancel?: () => void;
    style?: any;
}

export const CustomNavigationUI: React.FC<CustomNavigationUIProps> = ({
                                                                          origin,
                                                                          destination,
                                                                          onNavigationComplete,
                                                                          onNavigationCancel,
                                                                          style
                                                                      }) => {
    const {
        isNavigating,
        progress,
        currentInstruction,
        upcomingInstruction,
        route,
        startNavigation,
        stopNavigation,
        formatDistance,
        formatDuration,
        getManeuverIcon,
    } = useCustomNavigation({
        onDestinationReached: onNavigationComplete,
        onNavigationError: (error) => {
            console.error('Navigation error:', error);
        },
        onVoiceInstruction: (instruction) => {
            // You can integrate expo-speech here for TTS
            console.log('Voice instruction:', instruction.voiceInstruction);
        },
    });

    React.useEffect(() => {
        if (!isNavigating) {
            startNavigation(origin, destination);
        }
    }, []);

    const handleCancel = () => {
        stopNavigation();
        onNavigationCancel?.();
    };

    return (
        <View style={[styles.container, style]}>
            {/* Map View */}
            <View style={styles.mapContainer}>
                <MapboxMap
                    initialRegion={{
                        latitude: origin.latitude,
                        longitude: origin.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                    origin={origin}
                    destination={destination}
                    routeGeoJSON={route?.geoJSON || null}
                    showUserLocation={true} mapRef={null}                />

                {/* Cancel Button */}
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                    <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* Navigation Instructions Panel */}
            {isNavigating && (
                <NavigationInstructionsPanel
                    currentInstruction={currentInstruction}
                    upcomingInstruction={upcomingInstruction}
                    progress={progress}
                    formatDistance={formatDistance}
                    formatDuration={formatDuration}
                    getManeuverIcon={getManeuverIcon}
                />
            )}
        </View>
    );
};

interface NavigationInstructionsPanelProps {
    currentInstruction: any;
    upcomingInstruction: any;
    progress: any;
    formatDistance: (meters: number) => string;
    formatDuration: (seconds: number) => string;
    getManeuverIcon: (type: string, modifier?: string) => string;
}

const NavigationInstructionsPanel: React.FC<NavigationInstructionsPanelProps> = ({
                                                                                     currentInstruction,
                                                                                     upcomingInstruction,
                                                                                     progress,
                                                                                     formatDistance,
                                                                                     formatDuration,
                                                                                     getManeuverIcon,
                                                                                 }) => {
    return (
        <View style={styles.instructionsContainer}>
            {/* Progress Bar */}
            {progress && (
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                { width: `${(progress.fractionTraveled * 100)}%` }
                            ]}
                        />
                    </View>
                    <View style={styles.progressInfo}>
                        <Text style={styles.progressText}>
                            {formatDistance(progress.distanceRemaining)} • {formatDuration(progress.durationRemaining)}
                        </Text>
                    </View>
                </View>
            )}

            {/* Current Instruction */}
            {currentInstruction && (
                <View style={styles.currentInstructionContainer}>
                    <View style={styles.instructionRow}>
                        <View style={styles.maneuverContainer}>
                            <Text style={styles.maneuverIcon}>
                                {getManeuverIcon(currentInstruction.maneuver.type, currentInstruction.maneuver.modifier)}
                            </Text>
                        </View>
                        <View style={styles.instructionText}>
                            <Text style={styles.instructionTitle}>
                                {currentInstruction.text}
                            </Text>
                            <Text style={styles.instructionDistance}>
                                in {formatDistance(currentInstruction.distance)}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Upcoming Instruction Preview */}
            {upcomingInstruction && (
                <View style={styles.upcomingInstructionContainer}>
                    <View style={styles.instructionRow}>
                        <View style={styles.upcomingManeuverContainer}>
                            <Text style={styles.upcomingManeuverIcon}>
                                {getManeuverIcon(upcomingInstruction.maneuver.type, upcomingInstruction.maneuver.modifier)}
                            </Text>
                        </View>
                        <View style={styles.instructionText}>
                            <Text style={styles.upcomingInstructionTitle}>
                                Then {upcomingInstruction.text.toLowerCase()}
                            </Text>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    cancelButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: 25,
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    instructionsContainer: {
        position: 'absolute',
        top: 100,
        left: 20,
        right: 20,
        backgroundColor: 'white',
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    progressContainer: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    progressBar: {
        height: 4,
        backgroundColor: '#e0e0e0',
        borderRadius: 2,
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 2,
    },
    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    currentInstructionContainer: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    instructionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    maneuverContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#007AFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    maneuverIcon: {
        fontSize: 24,
        color: 'white',
        fontWeight: 'bold',
    },
    instructionText: {
        flex: 1,
    },
    instructionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    instructionDistance: {
        fontSize: 14,
        color: '#666',
    },
    upcomingInstructionContainer: {
        padding: 15,
        backgroundColor: '#f8f9fa',
    },
    upcomingManeuverContainer: {
        width: 35,
        height: 35,
        borderRadius: 17.5,
        backgroundColor: '#e9ecef',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    upcomingManeuverIcon: {
        fontSize: 16,
        color: '#666',
    },
    upcomingInstructionTitle: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
});