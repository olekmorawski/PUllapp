// hooks/ride/useGetAvailableRides.ts
import { useQuery } from '@tanstack/react-query';
import { rideAPI, rideQueryKeys, GetAvailableRidesResponse } from '@/api/rideAPI';

interface UseGetAvailableRidesOptions {
    enabled?: boolean;
    staleTime?: number;
    retry?: boolean | number;
}

export const useGetAvailableRides = (
    options: UseGetAvailableRidesOptions = {}
) => {
    const {
        enabled = true,
        staleTime = 30 * 1000, // 30 seconds
        retry = 2,
    } = options;

    return useQuery<GetAvailableRidesResponse>({
        queryKey: rideQueryKeys.available(),
        queryFn: () => rideAPI.getAvailableRides(),
        enabled,
        staleTime,
        retry,
    });
};
