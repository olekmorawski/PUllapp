// hooks/user/useDeleteUser.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI, userQueryKeys } from '@/api/userAPI';

interface UseDeleteUserOptions {
    onSuccess?: (data: { success: boolean; message: string }, userId: string) => void;
    onError?: (error: Error, userId: string) => void;
}

export const useDeleteUser = (options: UseDeleteUserOptions = {}) => {
    const queryClient = useQueryClient();

    return useMutation<{ success: boolean; message: string }, Error, string>({
        mutationFn: userAPI.deleteUser,
        onSuccess: (data, userId) => {
            // Remove user from all caches
            queryClient.removeQueries({ queryKey: userQueryKeys.user(userId) });

            // Invalidate all user queries to refetch fresh data
            queryClient.invalidateQueries({ queryKey: userQueryKeys.all });

            // Call custom onSuccess if provided
            options.onSuccess?.(data, userId);
        },
        onError: (error, userId) => {
            console.error('Failed to delete user:', error);

            // Call custom onError if provided
            options.onError?.(error, userId);
        },
    });
};