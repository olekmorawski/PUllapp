import * as Location from 'expo-location';

export interface RideOption {
    name: string;
    price: string;
    id: number;
    type: string;
    time: string;
    suggestedRange: string;
    icon: string;
}

export interface PlaceResult {
    id: string;
    title: string;
    subtitle: string;
    fullAddress: string;
    coordinates?: { latitude: number; longitude: number };
    placeId?: string;
}

export interface LocationData {
    coordinates: {
        latitude: number;
        longitude: number;
    };
    address: string;
    isCurrentLocation?: boolean;
}

export interface BottomSheetProps {
    rideOptions?: RideOption[];
    onRideSelect?: (ride: RideOption, customPrice: string) => void;
    onConfirmRide?: () => void;
    onLocationSelect?: (type: 'origin' | 'destination', location: LocationData) => void;
    userLocation?: Location.LocationObject | null;
    onSearchError?: (error: Error) => void;
}

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export interface SearchOptions {
    location?: Coordinates;
    sessionId?: string;
    language?: string;
    types?: string;
    limit?: number;
}

// Hook-specific types
export interface LocationHookOptions {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
    autoStart?: boolean;
}

export interface SearchHookOptions {
    debounceDelay?: number;
    minSearchLength?: number;
    limit?: number;
    proximity?: Coordinates | null;
}

export interface StorageHookOptions {
    maxItems?: number;
    storageKey?: string;
}

export interface FavoriteHookOptions {
    storageKey?: string;
    defaultFavorites?: string[];
}