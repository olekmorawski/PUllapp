import React, { useMemo } from 'react';
import { View } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import * as turf from '@turf/turf';
import { Feature, LineString, Point, Position, Polygon } from 'geojson';

interface RoadFittedArrowProps {
    routeGeoJSON: Feature | null;
    maneuverPoint: {
        coordinate: [number, number];
        type: string;
        modifier?: string;
        instruction: string;
        uniqueIndex?: number;
    };
    uniqueKey: string | number;
    arrowLength?: number; // Length of arrow in meters
    arrowWidth?: number; // Width of arrow in pixels
    color?: string;
    opacity?: number;
}

interface CurvedArrowGeometry {
    shaft: Feature<LineString>;
    head: Feature<Polygon>;
}

/**
 * Extracts a segment of the route for arrow placement
 * The arrow should be CENTERED at the maneuver point
 */
function extractRouteSegmentForArrow(
    routeLine: Position[],
    maneuverCoord: [number, number],
    arrowLength: number = 50
): Position[] {
    try {
        const maneuverPoint = turf.point(maneuverCoord);

        // Find the closest point on the route
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
        if (minDist > 100) {
            console.warn(`Maneuver point too far from route: ${minDist.toFixed(0)}m`);
            return [];
        }

        // Calculate segment that's CENTERED at the maneuver point
        const halfLength = arrowLength * 0.3;
        let accumulatedDistBefore = 0;
        let accumulatedDistAfter = 0;
        let startIdx = closestIdx;
        let endIdx = closestIdx;

        // Walk backwards to find start point (half the arrow length before maneuver)
        for (let i = closestIdx - 1; i >= 0 && accumulatedDistBefore < halfLength; i--) {
            const segmentDist = turf.distance(
                turf.point(routeLine[i]),
                turf.point(routeLine[i + 1]),
                { units: 'meters' }
            );
            accumulatedDistBefore += segmentDist;
            startIdx = i;
        }

        // Walk forwards to find end point (half the arrow length after maneuver)
        for (let i = closestIdx; i < routeLine.length - 1 && accumulatedDistAfter < halfLength; i++) {
            const segmentDist = turf.distance(
                turf.point(routeLine[i]),
                turf.point(routeLine[i + 1]),
                { units: 'meters' }
            );
            accumulatedDistAfter += segmentDist;
            endIdx = i + 1;
        }

        // Extract the segment
        const segment = routeLine.slice(startIdx, endIdx + 1);

        // Ensure we have enough points
        if (segment.length < 2) {
            const expandedStart = Math.max(0, closestIdx - 10);
            const expandedEnd = Math.min(routeLine.length - 1, closestIdx + 10);
            return routeLine.slice(expandedStart, expandedEnd + 1);
        }

        return segment;
    } catch (error) {
        console.warn('Error extracting route segment:', error);
        return [];
    }
}

/**
 * Creates a simple curved arrow that follows the road
 * Line follows the curve, triangle head at the end
 */
function createCurvedArrowGeometry(
    routeSegment: Position[],
    maneuverType: string,
    modifier?: string
): CurvedArrowGeometry | null {
    if (!routeSegment || routeSegment.length < 2) {
        return null;
    }

    try {
        // Create the curved shaft that follows the road
        const shaft = turf.lineString(routeSegment);

        // Get the last two points to determine arrow head direction
        const lastPoint = routeSegment[routeSegment.length - 1];
        const secondLastPoint = routeSegment[routeSegment.length - 2];

        // Calculate bearing for arrow head
        const bearing = turf.bearing(
            turf.point(secondLastPoint),
            turf.point(lastPoint)
        );

        // Create simple triangle head
        const headSize = 15; // Size of triangle in meters
        const headSizeKm = headSize / 1000;

        // Triangle tip is at the end of the shaft
        const tipPoint = lastPoint;

        // Create triangle base points
        const leftBase = turf.destination(
            turf.point(tipPoint),
            headSizeKm * 0.7,
            bearing - 150,
            { units: 'kilometers' }
        );

        const rightBase = turf.destination(
            turf.point(tipPoint),
            headSizeKm * 0.7,
            bearing + 150,
            { units: 'kilometers' }
        );

        // Create triangle polygon
        const head = turf.polygon([[
            tipPoint,
            leftBase.geometry.coordinates,
            rightBase.geometry.coordinates,
            tipPoint // Close the polygon
        ]]);

        return { shaft, head };
    } catch (error) {
        console.warn('Error creating curved arrow:', error);
        return null;
    }
}

/**
 * Get arrow configuration based on maneuver type
 */
function getArrowConfig(type: string, modifier?: string) {
    const configs: Record<string, any> = {
        'turn': {
            length: 50,
            width: 4,
            color: '#EA4335'  // Red
        },
        'sharp turn': {
            length: 45,
            width: 5,
            color: '#EA4335'  // Red
        },
        'slight turn': {
            length: 60,
            width: 3,
            color: '#EA4335'  // Red
        },
        'merge': {
            length: 70,
            width: 4,
            color: '#EA4335'  // Red
        },
        'fork': {
            length: 55,
            width: 4,
            color: '#EA4335'  // Red
        },
        'roundabout': {
            length: 50,
            width: 4,
            color: '#EA4335'  // Red
        },
        'ramp': {
            length: 65,
            width: 4,
            color: '#EA4335'  // Red
        },
        'continue': {
            length: 80,
            width: 3,
            color: '#EA4335'  // Red
        },
        'depart': {
            length: 60,
            width: 4,
            color: '#EA4335'  // Red
        },
        'arrive': {
            length: 50,
            width: 4,
            color: '#EA4335'  // Red
        }
    };

    // Check for modifiers
    if (modifier?.includes('sharp')) {
        return configs['sharp turn'];
    }
    if (modifier?.includes('slight')) {
        return configs['slight turn'];
    }

    return configs[type] || {
        length: 50,
        width: 4,
        color: '#EA4335'  // Red
    };
}

/**
 * Road-fitted arrow component with simple visual style
 * Curves with the road but uses simple line + triangle design
 */
export const RoadFittedArrow: React.FC<RoadFittedArrowProps> = ({
                                                                    routeGeoJSON,
                                                                    maneuverPoint,
                                                                    uniqueKey,
                                                                    arrowLength,
                                                                    arrowWidth,
                                                                    color,
                                                                    opacity = 1.0
                                                                }) => {
    const arrowGeometry = useMemo(() => {
        if (!routeGeoJSON || !routeGeoJSON.geometry || routeGeoJSON.geometry.type !== 'LineString') {
            console.warn('Invalid route GeoJSON for arrow:', uniqueKey);
            return null;
        }

        const routeCoords = routeGeoJSON.geometry.coordinates;

        // Get arrow configuration
        const config = getArrowConfig(maneuverPoint.type, maneuverPoint.modifier);
        const finalLength = arrowLength || config.length;

        // Extract segment centered at maneuver point
        const segment = extractRouteSegmentForArrow(
            routeCoords,
            maneuverPoint.coordinate,
            finalLength
        );

        if (segment.length === 0) {
            console.warn(`No valid segment for arrow at`, maneuverPoint.coordinate);
            return null;
        }

        // Create curved arrow that follows the road
        const geometry = createCurvedArrowGeometry(
            segment,
            maneuverPoint.type,
            maneuverPoint.modifier
        );

        if (!geometry) {
            console.warn(`Failed to create arrow for ${maneuverPoint.type} at`, maneuverPoint.coordinate);
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
            {/* White outline for shaft - for better visibility */}
            <Mapbox.ShapeSource
                id={`${sourceId}-shaft-outline`}
                shape={arrowGeometry.shaft}
            >
                <Mapbox.LineLayer
                    id={`${sourceId}-shaft-outline-layer`}
                    style={{
                        lineColor: 'white',
                        lineWidth: finalWidth + 3,
                        lineCap: 'round',
                        lineJoin: 'round',
                        lineOpacity: opacity * 0.8
                    }}
                />
            </Mapbox.ShapeSource>

            {/* Arrow shaft (curved line following the road) */}
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

            {/* Arrow head (triangle) - white outline */}
            <Mapbox.ShapeSource
                id={`${sourceId}-head-outline`}
                shape={arrowGeometry.head}
            >
                <Mapbox.FillLayer
                    id={`${sourceId}-head-outline-fill-layer`}
                    style={{
                        fillColor: 'white',
                        fillOpacity: opacity * 0.8
                    }}
                />
                <Mapbox.LineLayer
                    id={`${sourceId}-head-outline-line-layer`}
                    style={{
                        lineColor: 'white',
                        lineWidth: 3,
                        lineOpacity: opacity * 0.8
                    }}
                />
            </Mapbox.ShapeSource>

            {/* Arrow head (triangle) - colored fill */}
            <Mapbox.ShapeSource
                id={`${sourceId}-head`}
                shape={arrowGeometry.head}
            >
                <Mapbox.FillLayer
                    id={`${sourceId}-head-fill-layer`}
                    style={{
                        fillColor: arrowColor,
                        fillOpacity: opacity
                    }}
                />
                <Mapbox.LineLayer
                    id={`${sourceId}-head-line-layer`}
                    style={{
                        lineColor: arrowColor,
                        lineWidth: 1,
                        lineOpacity: opacity
                    }}
                />
            </Mapbox.ShapeSource>
        </>
    );
};

export default RoadFittedArrow;