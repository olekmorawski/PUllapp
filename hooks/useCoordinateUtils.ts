import { useCallback } from 'react';

export const useCoordinateUtils = () => {
    const isValidNumber = useCallback((value: any): value is number => {
        return typeof value === 'number' && !isNaN(value) && isFinite(value);
    }, []);

    const isValidCoordinateObject = useCallback((coord: any): coord is { latitude: number; longitude: number } => {
        return coord &&
            isValidNumber(coord.latitude) &&
            isValidNumber(coord.longitude) &&
            coord.latitude >= -90 && coord.latitude <= 90 &&
            coord.longitude >= -180 && coord.longitude <= 180;
    }, [isValidNumber]);

    const isValidCoordinateArray = useCallback((coord: any): coord is [number, number] => {
        return Array.isArray(coord) &&
            coord.length === 2 &&
            isValidNumber(coord[0]) &&
            isValidNumber(coord[1]) &&
            coord[1] >= -90 && coord[1] <= 90 &&
            coord[0] >= -180 && coord[0] <= 180;
    }, [isValidNumber]);

    const coordObjectToArray = useCallback((coord: { latitude: number; longitude: number }): [number, number] => {
        return [coord.longitude, coord.latitude];
    }, []);

    const coordArrayToObject = useCallback((coord: [number, number]): { latitude: number; longitude: number } => {
        return { longitude: coord[0], latitude: coord[1] };
    }, []);

    return {
        isValidNumber,
        isValidCoordinateObject,
        isValidCoordinateArray,
        coordObjectToArray,
        coordArrayToObject,
    };
};