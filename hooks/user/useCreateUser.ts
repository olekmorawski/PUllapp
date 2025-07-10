// hooks/user/useCreateUser.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { userAPI, userQueryKeys, CreateUserResponse } from '@/api/userAPI';

interface CreateUserParams {
    email: string;
    walletAddress?: string;
}

interface UseCreateUserOptions {
    onSuccess?: (data: CreateUserResponse, variables: CreateUserParams) => void;
    onError?: (error: Error, variables: CreateUserParams) => void;
}

export const useCreateUser = (options: UseCreateUserOptions = {}) => {
    const queryClient = useQueryClient();

    return useMutation<CreateUserResponse, Error, CreateUserParams>({
        mutationFn: userAPI.createUser,
        onSuccess: (data, variables) => {
            // Update the check user cache
            queryClient.setQueryData(
                userQueryKeys.check(variables.email),
                { exists: true, user: data.user }
            );

            // Invalidate related queries to refetch fresh data
            queryClient.invalidateQueries({ queryKey: userQueryKeys.all });

            // Call custom onSuccess if provided
            options.onSuccess?.(data, variables);
        },
        onError: (error, variables) => {
            console.error('Failed to create user:', error);

            // Call custom onError if provided
            options.onError?.(error, variables);
        },
    });
};