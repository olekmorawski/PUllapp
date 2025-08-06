import React, { useMemo } from 'react';
import { View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as turf from '@turf/turf';
import { Feature, LineString, Point, Position } from 'geojson';

interface RoadFittedArrowProps {
    routeGeoJSON: Feature | null;
    maneuverPoint: {
        coordinate: [number, number];
        type: string;
        modifier?: string;
        instruction: string;
        uniqueIndex?: number;
    };
    uniqueKey: string | number; // Required unique key for the arrow
    arrowLength?: number; // Length of arrow in meters
    arrowWidth?: number; // Width of arrow in pixels
    color?: string;
    opacity?: number;
}

interface ArrowGeometry {
    shaft: Feature<LineString>;
    head: Feature<LineString>[];
    outline?: Feature<LineString>;
}

/**
 * Extracts a segment of the route for arrow placement
 * The arrow should END at the maneuver point, not start there
 */
function extractRouteSegmentForArrow(
    routeLine: Position[],
    maneuverCoord: [number, number],
    arrowLength: number = 50 // Length in meters
): Position[] {
    try {
        const maneuverPoint = turf.point(maneuverCoord);

        // Find the exact index of the maneuver point on the route
        let closestIdx = -1;
        let minDist = Infinity;

        for (let i = 0; i < routeLine.length; i++) {
            const dist = turf.distance(
                turf.point(routeLine[i]),
                maneuverPoint,
                { units: 'meters' }
            );
            if (dist < minDist) {
                minDist = dist;
                closestIdx = i;
            }
        }

        // If maneuver point is too far from route, skip
        if (minDist > 100) { // Increased tolerance
            console.warn(`Maneuver point too far from route: ${minDist.toFixed(0)}m`);
            return [];
        }

        // Calculate how many points we need for the arrow length
        // The arrow should END at the maneuver point
        let accumulatedDist = 0;
        let startIdx = closestIdx;

        // Walk backwards along the route to find the start point
        for (let i = closestIdx - 1; i >= 0 && accumulatedDist < arrowLength; i--) {
            const segmentDist = turf.distance(
                turf.point(routeLine[i]),
                turf.point(routeLine[i + 1]),
                { units: 'meters' }
            );
            accumulatedDist += segmentDist;
            startIdx = i;
        }

        // Extract the segment from start to maneuver point
        const segment = routeLine.slice(startIdx, closestIdx + 1);

        // Ensure we have enough points for a visible arrow
        if (segment.length < 2) {
            // Try to get more points
            const expandedStart = Math.max(0, closestIdx - 20);
            const expandedEnd = Math.min(routeLine.length - 1, closestIdx + 2);
            return routeLine.slice(expandedStart, expandedEnd + 1);
        }

        // Add the exact maneuver coordinate at the end to ensure precision
        const lastSegmentPoint = segment[segment.length - 1];
        const lastDist = turf.distance(
            turf.point(lastSegmentPoint),
            maneuverPoint,
            { units: 'meters' }
        );

        // Only add maneuver point if it's close enough to the route
        if (lastDist < 20 && lastDist > 0.1) {
            segment.push(maneuverCoord);
        }

        return segment;
    } catch (error) {
        console.warn('Error extracting route segment for arrow:', error);
        return [];
    }
}

/**
 * Creates a curved arrow geometry that follows the road
 */
function createCurvedArrowGeometry(
    routeSegment: Position[],
    maneuverType: string,
    modifier?: string
): ArrowGeometry | null {
    if (!routeSegment || routeSegment.length < 2) {
        console.warn('Route segment too short for arrow:', routeSegment?.length);
        return null;
    }

    try {
        const line = turf.lineString(routeSegment);
        const lineLength = turf.length(line, { units: 'meters' });

        // Determine arrow properties based on maneuver type
        const arrowConfig = getArrowConfig(maneuverType, modifier);

        // Calculate shaft length based on available line length and config
        const shaftLength = Math.min(lineLength * 0.8, arrowConfig.maxLength);

        // Ensure minimum arrow length for visibility
        if (shaftLength < 10) {
            console.warn('Arrow shaft too short:', shaftLength);
            // Use the entire segment for very short sections
            const smoothedShaft = smoothPath(routeSegment);
            const headGeometry = createArrowHead(
                smoothedShaft,
                arrowConfig.headSize,
                maneuverType,
                modifier
            );

            return {
                shaft: turf.lineString(smoothedShaft),
                head: headGeometry,
                outline: createArrowOutline(smoothedShaft, arrowConfig.width)
            };
        }

        // Sample points along the line for smooth arrow shaft
        const numSamples = Math.max(5, Math.floor(shaftLength / 5)); // Sample every 5 meters

        const shaftPoints: Position[] = [];
        for (let i = 0; i <= numSamples; i++) {
            const distance = (i / numSamples) * shaftLength;
            const point = turf.along(line, distance, { units: 'meters' });
            shaftPoints.push(point.geometry.coordinates);
        }

        // Smooth the shaft using bezier curve if needed
        const smoothedShaft = smoothPath(shaftPoints);

        // Create arrow head at the end of the shaft
        const headGeometry = createArrowHead(
            smoothedShaft,
            arrowConfig.headSize,
            maneuverType,
            modifier
        );

        return {
            shaft: turf.lineString(smoothedShaft),
            head: headGeometry,
            outline: createArrowOutline(smoothedShaft, arrowConfig.width)
        };
    } catch (error) {
        console.warn('Error creating curved arrow for', maneuverType, ':', error);
        return null;
    }
}

/**
 * Get arrow configuration based on maneuver type
 */
function getArrowConfig(type: string, modifier?: string) {
    const configs: Record<string, any> = {
        'turn': {
            maxLength: 50,
            width: 10,
            headSize: 15,
            color: '#4285F4'
        },
        'sharp turn': {
            maxLength: 45,
            width: 12,
            headSize: 16,
            color: '#FF6B00'
        },
        'slight turn': {
            maxLength: 60,
            width: 8,
            headSize: 12,
            color: '#4285F4'
        },
        'merge': {
            maxLength: 70,
            width: 9,
            headSize: 13,
            color: '#FBBC04'
        },
        'fork': {
            maxLength: 55,
            width: 10,
            headSize: 14,
            color: '#4285F4'
        },
        'roundabout': {
            maxLength: 50,
            width: 10,
            headSize: 14,
            color: '#4285F4',
            curved: true
        },
        'ramp': {
            maxLength: 65,
            width: 10,
            headSize: 14,
            color: '#4285F4'
        },
        'continue': {
            maxLength: 80,
            width: 8,
            headSize: 12,
            color: '#34A853'
        },
        'depart': {
            maxLength: 60,
            width: 10,
            headSize: 14,
            color: '#34A853'
        },
        'arrive': {
            maxLength: 50,
            width: 10,
            headSize: 14,
            color: '#EA4335'
        }
    };

    // Check for sharp modifier
    if (modifier?.includes('sharp')) {
        return configs['sharp turn'];
    }
    if (modifier?.includes('slight')) {
        return configs['slight turn'];
    }

    // Default configuration
    const defaultConfig = configs[type] || {
        maxLength: 50,
        width: 10,
        headSize: 14,
        color: '#4285F4'
    };

    return defaultConfig;
}

/**
 * Smooth path using quadratic bezier interpolation
 */
function smoothPath(points: Position[]): Position[] {
    if (points.length <= 2) return points;

    const smoothed: Position[] = [points[0]];

    for (let i = 1; i < points.length - 1; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const next = points[i + 1];

        // Add current point
        smoothed.push(curr);

        // Add interpolated point for smoothing
        if (i < points.length - 2) {
            const midPoint: Position = [
                (curr[0] + next[0]) / 2,
                (curr[1] + next[1]) / 2
            ];
            smoothed.push(midPoint);
        }
    }

    smoothed.push(points[points.length - 1]);
    return smoothed;
}

/**
 * Create arrow head geometry
 */
function createArrowHead(
    shaftPoints: Position[],
    headSize: number,
    maneuverType: string,
    modifier?: string
): Feature<LineString>[] {
    if (shaftPoints.length < 2) return [];

    const lastPoint = shaftPoints[shaftPoints.length - 1];
    const secondLastPoint = shaftPoints[shaftPoints.length - 2];

    // Calculate direction
    const bearing = turf.bearing(
        turf.point(secondLastPoint),
        turf.point(lastPoint)
    );

    // Create arrow head based on maneuver type
    const headLines: Feature<LineString>[] = [];

    if (maneuverType === 'turn' || maneuverType === 'fork') {
        // Create V-shaped arrow head
        const leftWing = turf.destination(
            turf.point(lastPoint),
            headSize / 1000, // Convert to km
            bearing - 150,
            { units: 'kilometers' }
        );

        const rightWing = turf.destination(
            turf.point(lastPoint),
            headSize / 1000,
            bearing + 150,
            { units: 'kilometers' }
        );

        headLines.push(
            turf.lineString([leftWing.geometry.coordinates, lastPoint]),
            turf.lineString([rightWing.geometry.coordinates, lastPoint])
        );
    } else if (maneuverType === 'merge') {
        // Create merge-style arrow head
        const side = modifier === 'left' ? -1 : 1;
        const wingAngle = 135 * side;

        const wing = turf.destination(
            turf.point(lastPoint),
            headSize / 1000,
            bearing + wingAngle,
            { units: 'kilometers' }
        );

        headLines.push(
            turf.lineString([wing.geometry.coordinates, lastPoint])
        );
    } else {
        // Default arrow head (straight/continue)
        const leftWing = turf.destination(
            turf.point(lastPoint),
            headSize / 1000,
            bearing - 150,
            { units: 'kilometers' }
        );

        const rightWing = turf.destination(
            turf.point(lastPoint),
            headSize / 1000,
            bearing + 150,
            { units: 'kilometers' }
        );

        headLines.push(
            turf.lineString([leftWing.geometry.coordinates, lastPoint]),
            turf.lineString([rightWing.geometry.coordinates, lastPoint])
        );
    }

    return headLines;
}

/**
 * Create arrow outline for better visibility
 */
function createArrowOutline(points: Position[], width: number): Feature<LineString> | undefined {
    if (points.length < 2) return undefined;

    try {
        // Create a buffer around the line for outline effect
        const line = turf.lineString(points);
        return line;
    } catch (error) {
        console.warn('Error creating arrow outline:', error);
        return undefined;
    }
}

/**
 * Road-fitted arrow component that bends with the road
 */
export const RoadFittedArrow: React.FC<RoadFittedArrowProps> = ({
                                                                    routeGeoJSON,
                                                                    maneuverPoint,
                                                                    uniqueKey,
                                                                    arrowLength = 50,
                                                                    arrowWidth = 12,
                                                                    color,
                                                                    opacity = 1.0
                                                                }) => {
    const arrowGeometry = useMemo(() => {
        if (!routeGeoJSON || !routeGeoJSON.geometry || routeGeoJSON.geometry.type !== 'LineString') {
            console.warn('Invalid route GeoJSON for arrow:', uniqueKey);
            return null;
        }

        const routeCoords = routeGeoJSON.geometry.coordinates;
        const segment = extractRouteSegmentForArrow(
            routeCoords,
            maneuverPoint.coordinate,
            arrowLength
        );

        if (segment.length === 0) {
            console.warn(`No valid segment for arrow at`, maneuverPoint.coordinate);
            return null;
        }

        const geometry = createCurvedArrowGeometry(segment, maneuverPoint.type, maneuverPoint.modifier);

        if (!geometry) {
            console.warn(`Failed to create arrow geometry for maneuver ${maneuverPoint.type} at`, maneuverPoint.coordinate);
        } else {
            console.log(`Created arrow for ${maneuverPoint.type} at`, maneuverPoint.coordinate);
        }

        return geometry;
    }, [routeGeoJSON, maneuverPoint, arrowLength]);

    if (!arrowGeometry) {
        return null;
    }

    const arrowConfig = getArrowConfig(maneuverPoint.type, maneuverPoint.modifier);
    const arrowColor = color || arrowConfig.color;
    const finalWidth = arrowWidth || arrowConfig.width;
    const sourceId = `arrow-source-${uniqueKey}`;

    return (
        <>
            {/* Arrow outline for better visibility */}
            {arrowGeometry.outline && (
                <Mapbox.ShapeSource
                    id={`${sourceId}-outline`}
                    shape={arrowGeometry.outline}
                >
                    <Mapbox.LineLayer
                        id={`${sourceId}-outline-layer`}
                        style={{
                            lineColor: 'white',
                            lineWidth: finalWidth + 4,
                            lineCap: 'round',
                            lineJoin: 'round',
                            lineOpacity: opacity * 0.9
                        }}
                    />
                </Mapbox.ShapeSource>
            )}

            {/* Arrow shaft */}
            <Mapbox.ShapeSource
                id={`${sourceId}-shaft`}
                shape={arrowGeometry.shaft}
            >
                <Mapbox.LineLayer
                    id={`${sourceId}-shaft-layer`}
                    style={{
                        lineColor: arrowColor,
                        lineWidth: finalWidth,
                        lineCap: 'round',
                        lineJoin: 'round',
                        lineOpacity: opacity
                    }}
                />
            </Mapbox.ShapeSource>

            {/* Arrow head */}
            {arrowGeometry.head.map((headLine, index) => (
                <Mapbox.ShapeSource
                    key={`${sourceId}-head-${index}`}
                    id={`${sourceId}-head-${index}`}
                    shape={headLine}
                >
                    <Mapbox.LineLayer
                        id={`${sourceId}-head-layer-${index}`}
                        style={{
                            lineColor: arrowColor,
                            lineWidth: finalWidth,
                            lineCap: 'round',
                            lineJoin: 'round',
                            lineOpacity: opacity
                        }}
                    />
                </Mapbox.ShapeSource>
            ))}
        </>
    );
};

export default RoadFittedArrow;