import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, G, Polygon, Circle, Defs, Filter, FeDropShadow, Text } from 'react-native-svg';

// Type definitions
interface ArrowProps {
    size?: number;
    color?: string;
    animated?: boolean;
}

interface DirectionalArrowProps extends ArrowProps {
    direction?: 'left' | 'right';
}

interface RoundaboutArrowProps extends ArrowProps {
    exit?: number;
}

interface NavigationArrowProps {
    type: string;
    modifier?: string;
    size?: number;
    color?: string;
    animated?: boolean;
}

// Base arrow container with shadow
const ArrowContainer: React.FC<{ children: React.ReactNode; size?: number; animated?: boolean }> = ({
                                                                                                        children,
                                                                                                        size = 50,
                                                                                                        animated = false
                                                                                                    }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (animated) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [animated, scaleAnim]);

    const containerStyle: ViewStyle = {
        width: size,
        height: size,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    };

    if (animated) {
        return (
            <Animated.View style={[containerStyle, { transform: [{ scale: scaleAnim }] }]}>
                {children}
            </Animated.View>
        );
    }

    return <View style={containerStyle}>{children}</View>;
};

// Straight arrow component
export const StraightArrow: React.FC<ArrowProps> = ({
                                                        size = 60,
                                                        color = '#4285F4',
                                                        animated = false
                                                    }) => {
    return (
        <ArrowContainer size={size} animated={animated}>
            <Svg width={size} height={size} viewBox="0 0 120 120">
                <Defs>
                    <Filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <FeDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                    </Filter>
                </Defs>

                {/* Background circle */}
                <Circle cx="60" cy="60" r="55" fill="white" filter="url(#shadow)" />

                {/* Arrow shaft */}
                <Path
                    d="M 60 85 L 60 35"
                    stroke={color}
                    strokeWidth="10"
                    strokeLinecap="round"
                />
                {/* Arrow head */}
                <Polygon
                    points="60,25 50,40 55,38 55,35 65,35 65,38 70,40"
                    fill={color}
                />
            </Svg>
        </ArrowContainer>
    );
};

// U-turn arrow component
export const UTurnArrow: React.FC<DirectionalArrowProps> = ({
                                                                direction = 'left',
                                                                size = 60,
                                                                color = '#FF6B00',
                                                                animated = false
                                                            }) => {
    const isLeft = direction === 'left';

    return (
        <ArrowContainer size={size} animated={animated}>
            <Svg width={size} height={size} viewBox="0 0 120 120">
                <Defs>
                    <Filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <FeDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                    </Filter>
                </Defs>

                <Circle cx="60" cy="60" r="55" fill="white" filter="url(#shadow)" />

                <G transform={isLeft ? 'scale(-1, 1) translate(-120, 0)' : ''}>
                    {/* U-turn curve */}
                    <Path
                        d="M 35 75 L 35 50 Q 35 25, 60 25 Q 85 25, 85 50 L 85 70"
                        stroke={color}
                        strokeWidth="9"
                        strokeLinecap="round"
                        fill="none"
                    />
                    {/* Arrow head */}
                    <Polygon
                        points="85,80 75,65 80,68 80,70 90,70 90,68 95,65"
                        fill={color}
                    />
                    {/* U-turn indicator */}
                    <Circle cx="60" cy="50" r="3" fill={color} opacity="0.5" />
                </G>
            </Svg>
        </ArrowContainer>
    );
};

// Roundabout arrow component with exit number
export const RoundaboutArrow: React.FC<RoundaboutArrowProps> = ({
                                                                    exit = 1,
                                                                    size = 60,
                                                                    color = '#4285F4',
                                                                    animated = false
                                                                }) => {
    // Calculate rotation based on exit number (90 degrees per exit)
    const rotation = -90 + (exit * 90);

    return (
        <ArrowContainer size={size} animated={animated}>
            <Svg width={size} height={size} viewBox="0 0 120 120">
                <Defs>
                    <Filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <FeDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                    </Filter>
                </Defs>

                <Circle cx="60" cy="60" r="55" fill="white" filter="url(#shadow)" />

                {/* Roundabout circle */}
                <Path
                    d="M 60 30 A 25 25 0 1 1 59.9 30"
                    stroke={color}
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray="6,4"
                />

                {/* Entry arrow */}
                <Path
                    d="M 60 90 L 60 65"
                    stroke={color}
                    strokeWidth="8"
                    strokeLinecap="round"
                />

                {/* Exit arrow */}
                <G transform={`rotate(${rotation} 60 60)`}>
                    <Path
                        d="M 60 35 L 60 15"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                    />
                    <Polygon
                        points="60,10 52,20 56,18 56,15 64,15 64,18 68,20"
                        fill={color}
                    />
                </G>

                {/* Exit number */}
                <Circle cx="60" cy="60" r="12" fill={color} />
                <Text
                    x="60"
                    y="65"
                    textAnchor="middle"
                    fill="white"
                    fontSize="16"
                    fontWeight="bold"
                >
                    {exit}
                </Text>
            </Svg>
        </ArrowContainer>
    );
};

// Merge arrow component
export const MergeArrow: React.FC<DirectionalArrowProps> = ({
                                                                direction = 'right',
                                                                size = 60,
                                                                color = '#FBBC04',
                                                                animated = false
                                                            }) => {
    const isLeft = direction === 'left';

    return (
        <ArrowContainer size={size} animated={animated}>
            <Svg width={size} height={size} viewBox="0 0 120 120">
                <Defs>
                    <Filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <FeDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                    </Filter>
                </Defs>

                <Circle cx="60" cy="60" r="55" fill="white" filter="url(#shadow)" />

                <G transform={isLeft ? 'scale(-1, 1) translate(-120, 0)' : ''}>
                    {/* Main road */}
                    <Path
                        d="M 20 75 L 90 75"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        opacity="0.6"
                    />
                    {/* Merging road */}
                    <Path
                        d="M 35 35 Q 55 55, 75 75"
                        stroke={color}
                        strokeWidth="10"
                        strokeLinecap="round"
                        fill="none"
                    />
                    {/* Arrow head */}
                    <Polygon
                        points="82,75 70,65 73,70 75,68 77,70 80,65"
                        fill={color}
                    />
                    {/* Merge indicator dots */}
                    <Circle cx="45" cy="45" r="3" fill={color} opacity="0.5" />
                    <Circle cx="55" cy="55" r="3" fill={color} opacity="0.5" />
                </G>
            </Svg>
        </ArrowContainer>
    );
};

// Ramp/Exit arrow component
export const RampArrow: React.FC<DirectionalArrowProps> = ({
                                                               direction = 'right',
                                                               size = 60,
                                                               color = '#4285F4',
                                                               animated = false
                                                           }) => {
    const isLeft = direction === 'left';

    return (
        <ArrowContainer size={size} animated={animated}>
            <Svg width={size} height={size} viewBox="0 0 120 120">
                <Defs>
                    <Filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <FeDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                    </Filter>
                </Defs>

                <Circle cx="60" cy="60" r="55" fill="white" filter="url(#shadow)" />

                <G transform={isLeft ? 'scale(-1, 1) translate(-120, 0)' : ''}>
                    {/* Highway */}
                    <Path
                        d="M 60 90 L 60 30"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        opacity="0.5"
                    />
                    {/* Exit ramp */}
                    <Path
                        d="M 60 70 Q 70 60, 85 45"
                        stroke={color}
                        strokeWidth="10"
                        strokeLinecap="round"
                        fill="none"
                    />
                    {/* Arrow head */}
                    <Polygon
                        points="90,40 78,45 82,48 80,52 88,47"
                        fill={color}
                    />
                    {/* Exit indicator */}
                    <Path
                        d="M 45 70 L 50 70"
                        stroke={color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="2,2"
                    />
                </G>
            </Svg>
        </ArrowContainer>
    );
};

// Depart/Start arrow component
export const DepartArrow: React.FC<ArrowProps> = ({
                                                      size = 60,
                                                      color = '#34A853',
                                                      animated = true
                                                  }) => {
    return (
        <ArrowContainer size={size} animated={animated}>
            <Svg width={size} height={size} viewBox="0 0 120 120">
                <Defs>
                    <Filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <FeDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                    </Filter>
                </Defs>

                {/* Background circle */}
                <Circle cx="60" cy="60" r="55" fill="white" filter="url(#shadow)" />

                {/* Inner circle */}
                <Circle cx="60" cy="60" r="45" fill={color} opacity="0.1" />

                {/* Play icon (triangle) */}
                <Polygon
                    points="48,40 48,80 78,60"
                    fill={color}
                />

                {/* Start text */}
                <Text
                    x="60"
                    y="100"
                    textAnchor="middle"
                    fill={color}
                    fontSize="10"
                    fontWeight="600"
                >
                    START
                </Text>
            </Svg>
        </ArrowContainer>
    );
};

// Arrive/Destination arrow component
export const ArriveArrow: React.FC<ArrowProps> = ({
                                                      size = 60,
                                                      color = '#EA4335',
                                                      animated = true
                                                  }) => {
    return (
        <ArrowContainer size={size} animated={animated}>
            <Svg width={size} height={size} viewBox="0 0 120 120">
                <Defs>
                    <Filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <FeDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                    </Filter>
                </Defs>

                {/* Background circle */}
                <Circle cx="60" cy="60" r="55" fill="white" filter="url(#shadow)" />

                {/* Inner circle */}
                <Circle cx="60" cy="60" r="45" fill={color} opacity="0.1" />

                {/* Flag pole */}
                <Path
                    d="M 50 85 L 50 35"
                    stroke={color}
                    strokeWidth="5"
                    strokeLinecap="round"
                />

                {/* Flag */}
                <Path
                    d="M 50 35 L 80 45 L 80 60 L 50 50 Z"
                    fill={color}
                />

                {/* Base */}
                <Path
                    d="M 40 85 L 60 85"
                    stroke={color}
                    strokeWidth="5"
                    strokeLinecap="round"
                />

                {/* Destination text */}
                <Text
                    x="60"
                    y="100"
                    textAnchor="middle"
                    fill={color}
                    fontSize="10"
                    fontWeight="600"
                >
                    ARRIVE
                </Text>
            </Svg>
        </ArrowContainer>
    );
};

// Enhanced turn arrow with better visual design
export const EnhancedTurnArrow: React.FC<DirectionalArrowProps> = ({
                                                                       direction = 'right',
                                                                       size = 60,
                                                                       color = '#4285F4',
                                                                       animated = false
                                                                   }) => {
    const isLeft = direction === 'left';

    return (
        <ArrowContainer size={size} animated={animated}>
            <Svg width={size} height={size} viewBox="0 0 120 120">
                <Defs>
                    <Filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <FeDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                    </Filter>
                </Defs>

                {/* Background circle */}
                <Circle cx="60" cy="60" r="55" fill="white" filter="url(#shadow)" />

                <G transform={isLeft ? 'scale(-1, 1) translate(-120, 0)' : ''}>
                    {/* Curved arrow path */}
                    <Path
                        d="M 30 60 Q 30 30, 60 30 L 80 30"
                        stroke={color}
                        strokeWidth="10"
                        strokeLinecap="round"
                        fill="none"
                    />
                    {/* Arrow head with better shape */}
                    <Polygon
                        points="85,30 70,22 74,30 70,38"
                        fill={color}
                    />
                    {/* Direction indicator dots */}
                    <Circle cx="30" cy="75" r="3" fill={color} opacity="0.5" />
                    <Circle cx="30" cy="85" r="3" fill={color} opacity="0.5" />
                </G>
            </Svg>
        </ArrowContainer>
    );
};

// Slight turn arrow (for minor direction changes)
export const SlightTurnArrow: React.FC<DirectionalArrowProps> = ({
                                                                     direction = 'right',
                                                                     size = 60,
                                                                     color = '#4285F4',
                                                                     animated = false
                                                                 }) => {
    const isLeft = direction === 'left';

    return (
        <ArrowContainer size={size} animated={animated}>
            <Svg width={size} height={size} viewBox="0 0 120 120">
                <Defs>
                    <Filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <FeDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                    </Filter>
                </Defs>

                <Circle cx="60" cy="60" r="55" fill="white" filter="url(#shadow)" />

                <G transform={isLeft ? 'scale(-1, 1) translate(-120, 0)' : ''}>
                    {/* Slight curve */}
                    <Path
                        d="M 40 80 Q 60 60, 80 40"
                        stroke={color}
                        strokeWidth="10"
                        strokeLinecap="round"
                        fill="none"
                    />
                    {/* Arrow head */}
                    <Polygon
                        points="85,35 72,42 76,42 76,40 80,44"
                        fill={color}
                    />
                </G>
            </Svg>
        </ArrowContainer>
    );
};

// Sharp turn arrow
export const SharpTurnArrow: React.FC<DirectionalArrowProps> = ({
                                                                    direction = 'right',
                                                                    size = 60,
                                                                    color = '#FF6B00',
                                                                    animated = false
                                                                }) => {
    const isLeft = direction === 'left';

    return (
        <ArrowContainer size={size} animated={animated}>
            <Svg width={size} height={size} viewBox="0 0 120 120">
                <Defs>
                    <Filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <FeDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                    </Filter>
                </Defs>

                <Circle cx="60" cy="60" r="55" fill="white" filter="url(#shadow)" />

                <G transform={isLeft ? 'scale(-1, 1) translate(-120, 0)' : ''}>
                    {/* Sharp angle */}
                    <Path
                        d="M 30 80 L 30 40 L 70 40"
                        stroke={color}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                    />
                    {/* Arrow head */}
                    <Polygon
                        points="75,40 60,32 64,40 60,48"
                        fill={color}
                    />
                    {/* Warning indicator */}
                    <Circle cx="50" cy="60" r="4" fill={color} />
                </G>
            </Svg>
        </ArrowContainer>
    );
};

// Fork/Keep arrow (for highway splits)
export const ForkArrow: React.FC<DirectionalArrowProps> = ({
                                                               direction = 'right',
                                                               size = 60,
                                                               color = '#4285F4',
                                                               animated = false
                                                           }) => {
    const isLeft = direction === 'left';

    return (
        <ArrowContainer size={size} animated={animated}>
            <Svg width={size} height={size} viewBox="0 0 120 120">
                <Defs>
                    <Filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <FeDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                    </Filter>
                </Defs>

                <Circle cx="60" cy="60" r="55" fill="white" filter="url(#shadow)" />

                <G transform={isLeft ? 'scale(-1, 1) translate(-120, 0)' : ''}>
                    {/* Main road */}
                    <Path
                        d="M 60 90 L 60 30"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        opacity="0.5"
                    />
                    {/* Fork road */}
                    <Path
                        d="M 60 60 L 85 35"
                        stroke={color}
                        strokeWidth="10"
                        strokeLinecap="round"
                    />
                    {/* Arrow head */}
                    <Polygon
                        points="90,30 77,37 81,37 81,35 85,39"
                        fill={color}
                    />
                </G>
            </Svg>
        </ArrowContainer>
    );
};

// Enhanced navigation arrow selector with more maneuver types
export const EnhancedNavigationArrow: React.FC<NavigationArrowProps> = ({
                                                                            type,
                                                                            modifier,
                                                                            size = 60,
                                                                            color,
                                                                            animated = false
                                                                        }) => {
    // Determine arrow color if not provided
    const arrowColor = color || '#4285F4';

    // More detailed maneuver type handling
    switch (type) {
        case 'turn':
            if (modifier === 'sharp left' || modifier === 'sharp right') {
                return <SharpTurnArrow direction={modifier.includes('left') ? 'left' : 'right'} size={size} color={arrowColor} animated={animated} />;
            } else if (modifier === 'slight left' || modifier === 'slight right') {
                return <SlightTurnArrow direction={modifier.includes('left') ? 'left' : 'right'} size={size} color={arrowColor} animated={animated} />;
            } else if (modifier === 'left' || modifier === 'right') {
                return <EnhancedTurnArrow direction={modifier} size={size} color={arrowColor} animated={animated} />;
            } else if (modifier === 'uturn') {
                return <UTurnArrow direction="left" size={size} color={arrowColor} animated={animated} />;
            }
            break;

        case 'fork':
            return <ForkArrow direction={modifier === 'left' ? 'left' : 'right'} size={size} color={arrowColor} animated={animated} />;

        case 'merge':
            return <MergeArrow direction={modifier === 'left' ? 'left' : 'right'} size={size} color={arrowColor} animated={animated} />;

        case 'ramp':
            return <RampArrow direction={modifier === 'left' ? 'left' : 'right'} size={size} color={arrowColor} animated={animated} />;

        case 'roundabout':
            const exitMatch = modifier?.match(/exit-(\d+)/);
            const exit = exitMatch ? parseInt(exitMatch[1]) : 1;
            return <RoundaboutArrow exit={exit} size={size} color={arrowColor} animated={animated} />;

        case 'depart':
            return <DepartArrow size={size} color={arrowColor} animated={animated} />;

        case 'arrive':
            return <ArriveArrow size={size} color={arrowColor} animated={animated} />;

        case 'continue':
        case 'straight':
        default:
            return <StraightArrow size={size} color={arrowColor} animated={animated} />;
    }

    // Default fallback
    return <StraightArrow size={size} color={arrowColor} animated={animated} />;
};