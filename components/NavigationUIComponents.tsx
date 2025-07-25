// components/Navigation/NavigationUIComponents.tsx
import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NavigationCompassProps {
    bearing: number;
    isVisible?: boolean;
    onPress?: () => void;
}

export const NavigationCompass: React.FC<NavigationCompassProps> = ({
                                                                        bearing,
                                                                        isVisible = true,
                                                                        onPress
                                                                    }) => {
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: isVisible ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isVisible]);

    useEffect(() => {
        Animated.timing(rotateAnim, {
            toValue: bearing,
            duration: 500,
            useNativeDriver: true,
        }).start();
    }, [bearing]);

    if (!isVisible) return null;

    return (
        <Animated.View style={{
            position: 'absolute',
            top: 120,
            right: 16,
            opacity: fadeAnim,
            transform: [{ scale: fadeAnim }]
        }}>
            <TouchableOpacity
                onPress={onPress}
                style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 8,
                    elevation: 5,
                    borderWidth: 1,
                    borderColor: 'rgba(0, 0, 0, 0.1)'
                }}
            >
                <Animated.View style={{
                    transform: [{
                        rotate: rotateAnim.interpolate({
                            inputRange: [0, 360],
                            outputRange: ['0deg', '360deg']
                        })
                    }]
                }}>
                    <Ionicons name="navigate" size={28} color="#4285F4" />
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

interface SpeedIndicatorProps {
    speed: number;
    speedLimit?: number;
    isVisible?: boolean;
}

export const SpeedIndicator: React.FC<SpeedIndicatorProps> = ({
                                                                  speed,
                                                                  speedLimit,
                                                                  isVisible = true
                                                              }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: isVisible ? 1 : 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: isVisible ? 1 : 0,
                tension: 150,
                friction: 8,
                useNativeDriver: true,
            })
        ]).start();
    }, [isVisible]);

    if (!isVisible) return null;

    const isOverSpeedLimit = speedLimit && speed > speedLimit;

    return (
        <Animated.View style={{
            position: 'absolute',
            bottom: 200,
            left: 16,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
        }}>
            <View style={{
                backgroundColor: isOverSpeedLimit ? 'rgba(234, 67, 53, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                borderRadius: 16,
                paddingHorizontal: 16,
                paddingVertical: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 5,
                borderWidth: 1,
                borderColor: isOverSpeedLimit ? 'rgba(234, 67, 53, 0.3)' : 'rgba(0, 0, 0, 0.1)'
            }}>
                <Text style={{
                    fontSize: 24,
                    fontWeight: '700',
                    color: isOverSpeedLimit ? 'white' : '#1a1a1a',
                    textAlign: 'center'
                }}>
                    {Math.round(speed)}
                </Text>
                <Text style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: isOverSpeedLimit ? 'rgba(255, 255, 255, 0.8)' : '#666',
                    textAlign: 'center',
                    marginTop: 2
                }}>
                    km/h
                </Text>
                {speedLimit && (
                    <Text style={{
                        fontSize: 10,
                        fontWeight: '500',
                        color: isOverSpeedLimit ? 'rgba(255, 255, 255, 0.8)' : '#999',
                        textAlign: 'center',
                        marginTop: 4
                    }}>
                        Limit: {speedLimit}
                    </Text>
                )}
            </View>
        </Animated.View>
    );
};

interface NavigationInstructionProps {
    instruction: string;
    distance: string;
    maneuver?: 'turn-left' | 'turn-right' | 'straight' | 'u-turn';
    isVisible?: boolean;
}

export const NavigationInstruction: React.FC<NavigationInstructionProps> = ({
                                                                                instruction,
                                                                                distance,
                                                                                maneuver = 'straight',
                                                                                isVisible = true
                                                                            }) => {
    const slideAnim = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isVisible ? 0 : -100,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isVisible]);

    const getManeuverIcon = () => {
        switch (maneuver) {
            case 'turn-left':
                return 'arrow-back';
            case 'turn-right':
                return 'arrow-forward';
            case 'u-turn':
                return 'return-up-back';
            default:
                return 'arrow-up';
        }
    };

    if (!isVisible) return null;

    return (
        <Animated.View style={{
            position: 'absolute',
            top: 200,
            left: 16,
            right: 16,
            transform: [{ translateY: slideAnim }]
        }}>
            <View style={{
                backgroundColor: 'rgba(26, 26, 26, 0.95)',
                borderRadius: 16,
                padding: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
                flexDirection: 'row',
                alignItems: 'center'
            }}>
                <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: '#4285F4',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16
                }}>
                    <Ionicons name={getManeuverIcon()} size={24} color="white" />
                </View>

                <View style={{ flex: 1 }}>
                    <Text style={{
                        fontSize: 18,
                        fontWeight: '600',
                        color: 'white',
                        marginBottom: 4
                    }}>
                        {instruction}
                    </Text>
                    <Text style={{
                        fontSize: 14,
                        color: 'rgba(255, 255, 255, 0.7)'
                    }}>
                        in {distance}
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
};

interface EtaCardProps {
    arrivalTime: string;
    timeRemaining: string;
    distance: string;
    isVisible?: boolean;
}

export const EtaCard: React.FC<EtaCardProps> = ({
                                                    arrivalTime,
                                                    timeRemaining,
                                                    distance,
                                                    isVisible = true
                                                }) => {
    const slideAnim = useRef(new Animated.Value(100)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isVisible ? 0 : 100,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <Animated.View style={{
            position: 'absolute',
            bottom: 140,
            right: 16,
            transform: [{ translateY: slideAnim }]
        }}>
            <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 16,
                padding: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 5,
                minWidth: 120
            }}>
                <Text style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: '#1a1a1a',
                    textAlign: 'center'
                }}>
                    {arrivalTime}
                </Text>
                <Text style={{
                    fontSize: 12,
                    color: '#666',
                    textAlign: 'center',
                    marginTop: 2
                }}>
                    Arrival
                </Text>

                <View style={{
                    height: 1,
                    backgroundColor: '#e0e0e0',
                    marginVertical: 8
                }} />

                <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#4285F4',
                    textAlign: 'center'
                }}>
                    {timeRemaining}
                </Text>
                <Text style={{
                    fontSize: 12,
                    color: '#666',
                    textAlign: 'center',
                    marginTop: 2
                }}>
                    {distance}
                </Text>
            </View>
        </Animated.View>
    );
};

interface NavigationControlsProps {
    onRecenter?: () => void;
    onVolumeToggle?: () => void;
    onRouteOptions?: () => void;
    isMuted?: boolean;
    isVisible?: boolean;
}

export const NavigationControls: React.FC<NavigationControlsProps> = ({
                                                                          onRecenter,
                                                                          onVolumeToggle,
                                                                          onRouteOptions,
                                                                          isMuted = false,
                                                                          isVisible = true
                                                                      }) => {
    const slideAnim = useRef(new Animated.Value(100)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isVisible ? 0 : 100,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <Animated.View style={{
            position: 'absolute',
            bottom: 200,
            right: 16,
            transform: [{ translateY: slideAnim }]
        }}>
            <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 5,
                overflow: 'hidden'
            }}>
                <TouchableOpacity
                    onPress={onRecenter}
                    style={{
                        padding: 16,
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <Ionicons name="locate" size={24} color="#4285F4" />
                </TouchableOpacity>

                <View style={{
                    height: 1,
                    backgroundColor: '#e0e0e0',
                    marginHorizontal: 8
                }} />

                <TouchableOpacity
                    onPress={onVolumeToggle}
                    style={{
                        padding: 16,
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <Ionicons
                        name={isMuted ? "volume-mute" : "volume-high"}
                        size={24}
                        color={isMuted ? "#999" : "#4285F4"}
                    />
                </TouchableOpacity>

                <View style={{
                    height: 1,
                    backgroundColor: '#e0e0e0',
                    marginHorizontal: 8
                }} />

                <TouchableOpacity
                    onPress={onRouteOptions}
                    style={{
                        padding: 16,
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <Ionicons name="options" size={24} color="#4285F4" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

interface NavigationStatusBarProps {
    connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
    gpsAccuracy: 'high' | 'medium' | 'low';
    batteryLevel?: number;
    isVisible?: boolean;
}

export const NavigationStatusBar: React.FC<NavigationStatusBarProps> = ({
                                                                            connectionStatus,
                                                                            gpsAccuracy,
                                                                            batteryLevel,
                                                                            isVisible = true
                                                                        }) => {
    const slideAnim = useRef(new Animated.Value(-50)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: isVisible ? 0 : -50,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isVisible]);

    if (!isVisible) return null;

    const getGpsColor = () => {
        switch (gpsAccuracy) {
            case 'high':
                return '#34A853';
            case 'medium':
                return '#FBBC04';
            case 'low':
                return '#EA4335';
            default:
                return '#666';
        }
    };

    const getConnectionColor = () => {
        switch (connectionStatus) {
            case 'connected':
                return '#34A853';
            case 'reconnecting':
                return '#FBBC04';
            case 'disconnected':
                return '#EA4335';
            default:
                return '#666';
        }
    };

    return (
        <Animated.View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: [{ translateY: slideAnim }]
        }}>
            <View style={{
                backgroundColor: 'rgba(26, 26, 26, 0.9)',
                paddingHorizontal: 16,
                paddingVertical: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons
                        name="radio"
                        size={16}
                        color={getConnectionColor()}
                        style={{ marginRight: 8 }}
                    />
                    <Text style={{
                        fontSize: 12,
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontWeight: '500'
                    }}>
                        {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons
                        name="locate"
                        size={16}
                        color={getGpsColor()}
                        style={{ marginRight: 8 }}
                    />
                    <Text style={{
                        fontSize: 12,
                        color: 'rgba(255, 255, 255, 0.8)',
                        fontWeight: '500'
                    }}>
                        GPS: {gpsAccuracy}
                    </Text>
                </View>

                {batteryLevel !== undefined && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons
                            name={batteryLevel > 50 ? "battery-full" : batteryLevel > 20 ? "battery-half" : "battery-dead"}
                            size={16}
                            color={batteryLevel > 20 ? '#34A853' : '#EA4335'}
                            style={{ marginRight: 4 }}
                        />
                        <Text style={{
                            fontSize: 12,
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontWeight: '500'
                        }}>
                            {batteryLevel}%
                        </Text>
                    </View>
                )}
            </View>
        </Animated.View>
    );
};