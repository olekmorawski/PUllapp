// hooks/api/useUserAPI.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Backend User interface
export interface BackendUser {
    id: string;
    email: string;
    username: string;
    walletAddress?: string;
    createdAt: string;
    updatedAt: string;
}

// API response types
interface CheckUserResponse {
    exists: boolean;
    user?: BackendUser;
}

interface CreateUserResponse {
    success: boolean;
    user: BackendUser;
}

interface UpdateUserResponse {
    success: boolean;
    user: BackendUser;
}

// Configure your backend URL
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// API functions
const userAPI = {
    checkUser: async (email: string): Promise<CheckUserResponse> => {
        const response = await fetch(`${BACKEND_URL}/api/users/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            throw new Error(`Failed to check user: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        return data;
    },

    createUser: async ({ email, walletAddress }: { email: string; walletAddress?: string }): Promise<CreateUserResponse> => {
        const response = await fetch(`${BACKEND_URL}/api/users/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, walletAddress }),
        });

        if (!response.ok) {
            throw new Error(`Failed to create user: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        return data;
    },

    updateUser: async ({ email, walletAddress }: { email: string; walletAddress?: string }): Promise<UpdateUserResponse> => {
        const response = await fetch(`${BACKEND_URL}/api/users/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, walletAddress }),
        });

        if (!response.ok) {
            throw new Error(`Failed to update user: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }

        return data;
    },
};

// Query keys
export const userQueryKeys = {
    all: ['users'] as const,
    check: (email: string) => [...userQueryKeys.all, 'check', email] as const,
    user: (id: string) => [...userQueryKeys.all, 'user', id] as const,
};

// Hooks
export const useCheckUser = (email: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: userQueryKeys.check(email),
        queryFn: () => userAPI.checkUser(email),
        enabled: enabled && !!email,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false, // Don't retry if backend is down
    });
};

export const useCreateUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: userAPI.createUser,
        onSuccess: (data, variables) => {
            // Update the check user cache
            queryClient.setQueryData(
                userQueryKeys.check(variables.email),
                { exists: true, user: data.user }
            );

            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
        },
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: userAPI.updateUser,
        onSuccess: (data, variables) => {
            // Update the check user cache
            queryClient.setQueryData(
                userQueryKeys.check(variables.email),
                { exists: true, user: data.user }
            );

            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
        },
    });
};