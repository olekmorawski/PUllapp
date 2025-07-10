// hooks/ride/useCreateRide.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/context/AuthContext';

// Types for the ride data
interface Coordinates {
    latitude: number;
    longitude: number;
}

interface CreateRideParams {
    originCoordinates: Coordinates;
    destinationCoordinates: Coordinates;
    originAddress: string;
    destinationAddress: string;
    rideType: string; // e.g., 'standard', 'premium', 'shared'
    estimatedPrice?: string;
    customPrice?: string;
    scheduledTime?: string; // ISO string for scheduled rides
    notes?: string;
}

interface CreateRideResponse {
    success: boolean;
    ride: {
        id: string;
        userId: string;
        originCoordinates: Coordinates;
        destinationCoordinates: Coordinates;
        originAddress: string;
        destinationAddress: string;
        rideType: string;
        estimatedPrice?: string;
        customPrice?: string;
        status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
        scheduledTime?: string;
        notes?: string;
        createdAt: string;
        updatedAt: string;
    };
}

// Mock API function - replace with your actual API call
const createRideAPI = async (rideData: CreateRideParams): Promise<CreateRideResponse> => {
    // Replace this with your actual API endpoint
    const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

    const response = await fetch(`${BACKEND_URL}/api/rides/create`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(rideData),
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error);
    }

    return data;
};

interface UseCreateRideOptions {
    onSuccess?: (data: CreateRideResponse) => void;
    onError?: (error: Error) => void;
}

export const useCreateRide = (options: UseCreateRideOptions = {}) => {
    const queryClient = useQueryClient();
    const { backendUser, dynamicUser } = useAuthContext();

    return useMutation<CreateRideResponse, Error, CreateRideParams>({
        mutationFn: async (rideData: CreateRideParams) => {
            // Ensure user is authenticated
            if (!backendUser?.id && !dynamicUser?.email) {
                throw new Error('User must be authenticated to create a ride');
            }

            // Add user identification to the ride data
            const rideDataWithUser = {
                ...rideData,
                userId: backendUser?.id || dynamicUser?.email,
                userEmail: dynamicUser?.email,
            };

            return createRideAPI(rideDataWithUser);
        },
        onSuccess: (data, variables) => {
            console.log('✅ Ride created successfully:', data.ride.id);

            // Invalidate ride-related queries
            queryClient.invalidateQueries({ queryKey: ['rides'] });
            queryClient.invalidateQueries({ queryKey: ['user', 'rides'] });

            // Call custom onSuccess if provided
            options.onSuccess?.(data);
        },
        onError: (error, variables) => {
            console.error('❌ Failed to create ride:', error);

            // Call custom onError if provided
            options.onError?.(error);
        },
        // Optional: Add retry logic
        retry: (failureCount, error) => {
            // Retry up to 2 times for network errors
            if (failureCount < 2 && error.message.includes('network')) {
                return true;
            }
            return false;
        },
    });
};

// Query keys for ride-related queries
export const rideQueryKeys = {
    all: ['rides'] as const,
    user: (userId: string) => [...rideQueryKeys.all, 'user', userId] as const,
    ride: (rideId: string) => [...rideQueryKeys.all, 'ride', rideId] as const,
    status: (status: string) => [...rideQueryKeys.all, 'status', status] as const,
};