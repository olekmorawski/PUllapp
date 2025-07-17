import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: (failureCount, error) => {
                // Don't retry on 4xx errors or if backend is down
                if (error instanceof Error && error.message.includes('Failed to')) {
                    return false;
                }
                return failureCount < 2;
            },
        },
        mutations: {
            retry: 1,
        },
    },
});