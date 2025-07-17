// Ride interface matching your backend
export interface AvailableRide {
    id: string;
    userId: string;
    userEmail: string;
    walletAddress: string;
    originCoordinates: { latitude: number; longitude: number };
    destinationCoordinates: { latitude: number; longitude: number };
    originAddress: string;
    destinationAddress: string;
    estimatedPrice?: string;
    customPrice?: string;
    status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
    createdAt: string;
    updatedAt: string;
}

// API response types
export interface GetAvailableRidesResponse {
    rides: AvailableRide[];
}

export interface AcceptRideResponse {
    success: boolean;
    ride: AvailableRide;
}

// Configure your backend URL
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Base API client
class RideAPIClient {
    private baseURL: string;

    constructor(baseURL: string) {
        this.baseURL = baseURL;
    }

    private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
        const response = await fetch(`${this.baseURL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        return data;
    }

    async getAvailableRides(): Promise<GetAvailableRidesResponse> {
        return this.request<GetAvailableRidesResponse>('/api/rides?status=pending', {
            method: 'GET',
        });
    }

    async acceptRide(rideId: string): Promise<AcceptRideResponse> {
        return this.request<AcceptRideResponse>(`/api/rides/${rideId}/status`, {
            method: 'PUT',
            body: JSON.stringify({
                status: 'accepted'
            }),
        });
    }
}

// Hidden API instance - not exported
const apiInstance = new RideAPIClient(BACKEND_URL);

// Export only the instance methods (hiding the class)
export const rideAPI = {
    getAvailableRides: () => apiInstance.getAvailableRides(),
    acceptRide: (rideId: string) => apiInstance.acceptRide(rideId),
};

// Query keys for React Query
export const rideQueryKeys = {
    all: ['rides'] as const,
    available: () => [...rideQueryKeys.all, 'available'] as const,
};
