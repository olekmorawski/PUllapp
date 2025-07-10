// hooks/user/useCheckUser.ts
import { useQuery } from '@tanstack/react-query';
import { userAPI, userQueryKeys, CheckUserResponse } from '@/api/userAPI';

interface UseCheckUserOptions {
    enabled?: boolean;
    staleTime?: number;
    retry?: boolean | number;
}

export const useCheckUser = (
    email: string,
    options: UseCheckUserOptions = {}
) => {
    const {
        enabled = true,
        staleTime = 5 * 60 * 1000, // 5 minutes
        retry = false,
    } = options;

    return useQuery<CheckUserResponse>({
        queryKey: userQueryKeys.check(email),
        queryFn: () => userAPI.checkUser(email),
        enabled: enabled && !!email,
        staleTime,
        retry,
    });
};