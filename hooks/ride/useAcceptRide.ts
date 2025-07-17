// hooks/ride/useAcceptRide.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rideAPI, rideQueryKeys, AcceptRideResponse } from '@/api/rideAPI';

export const useAcceptRide = () => {
    const queryClient = useQueryClient();

    return useMutation<AcceptRideResponse, Error, string>({
        mutationFn: (rideId: string) => rideAPI.acceptRide(rideId),
        onSuccess: () => {
            // Invalidate and refetch the available rides query
            queryClient.invalidateQueries({ queryKey: rideQueryKeys.available() });
        },
    });
};
