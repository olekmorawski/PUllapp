export interface RideNavigationData {
    id: string;
    pickupLat: number;
    pickupLng: number;
    pickupAddress: string;
    destLat: number;
    destLng: number;
    destAddress: string;
    passengerName: string;
    estimatedPrice: string;
}

export type NavigationPhase = 'to-pickup' | 'at-pickup' | 'picking-up' | 'to-destination' | 'at-destination' | 'completed';

export const GEOFENCE_RADIUS_METERS = 500;
export const GEOFENCE_CHECK_INTERVAL = 20000;

export const VOICE_OPTIONS = {
    language: 'en-US',
    pitch: 1,
    rate: 0.9,
};
