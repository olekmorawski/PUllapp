import { useAuthContext } from '@/context/AuthContext';
import { useUpdateUser } from '@/hooks/user/useUpdateUser';
import { useQueryClient } from '@tanstack/react-query';
import { userQueryKeys } from '@/api/userAPI';

interface UpdateUsernameParams {
    newUsername: string;
}

interface UseUsernameUpdateOptions {
    onSuccess?: (username: string) => void;
    onError?: (error: Error) => void;
}

export const useUsernameUpdate = (options: UseUsernameUpdateOptions = {}) => {
    const { dynamicUser, backendUser } = useAuthContext();
    const queryClient = useQueryClient();

    const updateUser = useUpdateUser({
        onSuccess: (data, variables) => {
            console.log('Username updated successfully:', data.user.username);

            // CRITICAL: Invalidate the useCheckUser query that useUserVerification depends on
            if (dynamicUser?.email) {
                // This is the key - invalidate the check user query
                queryClient.invalidateQueries({
                    queryKey: userQueryKeys.check(dynamicUser.email)
                });

                // Also invalidate other user queries for good measure
                queryClient.invalidateQueries({
                    queryKey: userQueryKeys.userByEmail(dynamicUser.email)
                });

                if (backendUser?.id) {
                    queryClient.invalidateQueries({
                        queryKey: userQueryKeys.user(backendUser.id)
                    });
                }
            }

            // Force refetch after a small delay to ensure invalidation is processed
            setTimeout(() => {
                if (dynamicUser?.email) {
                    queryClient.refetchQueries({
                        queryKey: userQueryKeys.check(dynamicUser.email)
                    });
                }
            }, 100);

            options.onSuccess?.(variables.username || '');
        },
        onError: (error, variables) => {
            console.error('Username update failed:', error);
            options.onError?.(error);
        }
    });

    const updateUsername = async ({ newUsername }: UpdateUsernameParams) => {
        if (!dynamicUser?.email) {
            throw new Error('No email found - please log in again');
        }

        return updateUser.mutateAsync({
            email: dynamicUser.email,
            username: newUsername,
            walletAddress: dynamicUser.walletAddress || backendUser?.walletAddress
        });
    };

    return {
        updateUsername,
        isLoading: updateUser.isPending,
        isSuccess: updateUser.isSuccess,
        isError: updateUser.isError,
        error: updateUser.error,
        data: updateUser.data,
        mutateAsync: updateUsername,
        mutate: (params: UpdateUsernameParams) => {
            updateUsername(params).catch(console.error);
        }
    };
};

export const useUsernameValidation = () => {
    const validateUsername = (username: string): { isValid: boolean; error?: string } => {
        if (!username || username.trim().length === 0) {
            return { isValid: false, error: 'Username is required' };
        }

        const trimmedUsername = username.trim();

        if (trimmedUsername.length < 3) {
            return { isValid: false, error: 'Username must be at least 3 characters' };
        }

        if (trimmedUsername.length > 20) {
            return { isValid: false, error: 'Username must be less than 20 characters' };
        }

        if (!/^[a-zA-Z0-9._]+$/.test(trimmedUsername)) {
            return { isValid: false, error: 'Username can only contain letters, numbers, dots, and underscores' };
        }

        if (trimmedUsername.startsWith('.') || trimmedUsername.endsWith('.')) {
            return { isValid: false, error: 'Username cannot start or end with a dot' };
        }

        if (trimmedUsername.includes('..')) {
            return { isValid: false, error: 'Username cannot contain consecutive dots' };
        }

        const reservedUsernames = ['admin', 'root', 'user', 'guest', 'null', 'undefined'];
        if (reservedUsernames.includes(trimmedUsername.toLowerCase())) {
            return { isValid: false, error: 'This username is reserved' };
        }

        return { isValid: true };
    };

    return { validateUsername };
};