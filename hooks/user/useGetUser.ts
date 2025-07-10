// hooks/user/useGetUser.ts
import { useQuery } from '@tanstack/react-query';
import { userAPI, userQueryKeys, BackendUser } from '@/api/userAPI';

interface UseGetUserOptions {
    enabled?: boolean;
    staleTime?: number;
    retry?: boolean | number;
}

// Get user by ID
export const useGetUserById = (
    id: string,
    options: UseGetUserOptions = {}
) => {
    const {
        enabled = true,
        staleTime = 5 * 60 * 1000, // 5 minutes
        retry = 2,
    } = options;

    return useQuery<{ user: BackendUser }>({
        queryKey: userQueryKeys.user(id),
        queryFn: () => userAPI.getUserById(id),
        enabled: enabled && !!id,
        staleTime,
        retry,
    });
};

// Get user by email
export const useGetUserByEmail = (
    email: string,
    options: UseGetUserOptions = {}
) => {
    const {
        enabled = true,
        staleTime = 5 * 60 * 1000, // 5 minutes
        retry = 2,
    } = options;

    return useQuery<{ user: BackendUser }>({
        queryKey: userQueryKeys.userByEmail(email),
        queryFn: () => userAPI.getUserByEmail(email),
        enabled: enabled && !!email,
        staleTime,
        retry,
    });
};