import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useLocation } from '@/hooks/Location/useLocation';
import { useCoordinateUtils } from './useCoordinateUtils';

interface UsePickupGeocodingProps {
    pickupAddress: string;
    setUserPickupCoords: (coords: [number, number] | null) => void;
}

export const usePickupGeocoding = ({
                                       pickupAddress,
                                       setUserPickupCoords,
                                   }: UsePickupGeocodingProps) => {
    const { location: currentUserLocation } = useLocation({ autoStart: true });
    const { isValidNumber, isValidCoordinateObject } = useCoordinateUtils();

    useEffect(() => {
        const geocodePickup = async () => {
            if (pickupAddress === 'Current Location' && currentUserLocation && isValidCoordinateObject(currentUserLocation.coords)) {
                setUserPickupCoords([currentUserLocation.coords.longitude, currentUserLocation.coords.latitude]);
            } else if (typeof pickupAddress === 'string') {
                try {
                    // Try to parse coordinates from address string
                    if (pickupAddress.includes(',')) {
                        const parts = pickupAddress.split(',');
                        const lat = parseFloat(parts[0]);
                        const lon = parseFloat(parts[1]);
                        if (isValidNumber(lat) && isValidNumber(lon)) {
                            setUserPickupCoords([lon, lat]);
                            return;
                        }
                    }

                    console.warn("Cannot determine pickup coordinates for address:", pickupAddress);

                    // Use current location if available and valid
                    if (currentUserLocation && isValidCoordinateObject(currentUserLocation.coords)) {
                        setUserPickupCoords([currentUserLocation.coords.longitude, currentUserLocation.coords.latitude]);
                    } else {
                        // Safe fallback coordinates (San Francisco)
                        setUserPickupCoords([-122.4324, 37.78825]);
                        Alert.alert("Location Issue", "Could not determine exact pickup coordinates. Using a default location.");
                    }
                } catch (e) {
                    console.error("Error processing pickupAddress:", e);
                    if (currentUserLocation && isValidCoordinateObject(currentUserLocation.coords)) {
                        setUserPickupCoords([currentUserLocation.coords.longitude, currentUserLocation.coords.latitude]);
                    } else {
                        setUserPickupCoords([-122.4324, 37.78825]);
                    }
                }
            }
        };

        geocodePickup();
    }, [pickupAddress, currentUserLocation, setUserPickupCoords, isValidNumber, isValidCoordinateObject]);

    return {
        currentUserLocation,
    };
};