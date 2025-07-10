// hooks/user/useUpdateUser.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI, userQueryKeys, UpdateUserResponse } from '@/api/userAPI';

interface UpdateUserParams {
    email: string;
    walletAddress?: string;
    username?: string;
}

interface UseUpdateUserOptions {
    onSuccess?: (data: UpdateUserResponse, variables: UpdateUserParams) => void;
    onError?: (error: Error, variables: UpdateUserParams) => void;
}

export const useUpdateUser = (options: UseUpdateUserOptions = {}) => {
    const queryClient = useQueryClient();

    return useMutation<UpdateUserResponse, Error, UpdateUserParams>({
        mutationFn: userAPI.updateUser,
        onSuccess: (data, variables) => {
            // Update the check user cache
            queryClient.setQueryData(
                userQueryKeys.check(variables.email),
                { exists: true, user: data.user }
            );

            // Update user by email cache if it exists
            queryClient.setQueryData(
                userQueryKeys.userByEmail(variables.email),
                { user: data.user }
            );

            // Update user by ID cache if it exists
            queryClient.setQueryData(
                userQueryKeys.user(data.user.id),
                { user: data.user }
            );

            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: userQueryKeys.all });

            // Call custom onSuccess if provided
            options.onSuccess?.(data, variables);
        },
        onError: (error, variables) => {
            console.error('Failed to update user:', error);

            // Call custom onError if provided
            options.onError?.(error, variables);
        },
    });
};