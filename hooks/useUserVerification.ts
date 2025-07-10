import { useEffect, useState, useRef } from 'react';
import { useCheckUser} from "@/hooks/user/useCheckUser";
import {useCreateUser} from "@/hooks/user/useCreateUser";
import {useUpdateUser} from "@/hooks/user/useUpdateUser";
import {CreateUserResponse, UpdateUserResponse, BackendUser} from "@/api/userAPI";

interface UseUserVerificationProps {
    email: string;
    walletAddress: string;
    enabled: boolean;
}

export const useUserVerification = ({ email, walletAddress, enabled }: UseUserVerificationProps) => {
    const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'checking' | 'verified' | 'failed'>('idle');

    const processedUser = useRef<string | null>(null);
    const isProcessing = useRef(false);

    const checkUserQuery = useCheckUser(email, { enabled });

    const createUser = useCreateUser({
        onSuccess: (data: CreateUserResponse) => {
            console.log('✅ User created successfully:', data.user.id);
            setBackendUser(data.user);
            setVerificationStatus('verified');
            isProcessing.current = false;
        },
        onError: (error: Error) => {
            console.error('❌ Failed to create user:', error);
            setVerificationStatus('failed');
            setBackendUser(null);
            isProcessing.current = false;
        },
    });

    const updateUser = useUpdateUser({
        onSuccess: (data: UpdateUserResponse) => {
            console.log('✅ User updated successfully:', data.user.id);
            setBackendUser(data.user);
            setVerificationStatus('verified');
            isProcessing.current = false;
        },
        onError: (error: Error) => {
            console.error('❌ Failed to update user:', error);
            setVerificationStatus('failed');
            isProcessing.current = false;
        },
    });

    useEffect(() => {
        if (!enabled || !email || !checkUserQuery.data || isProcessing.current) return;

        const userKey = `${email}-${walletAddress}`;

        const handleVerification = async () => {

            if (processedUser.current === userKey && backendUser === checkUserQuery.data.user) {
            }

            isProcessing.current = true;
            setVerificationStatus('checking');

            try {
                if (checkUserQuery.data.exists && checkUserQuery.data.user) {
                    console.log('✅ User exists in backend (Effect re-run due to data change)');
                    const existingUser = checkUserQuery.data.user;

                    if (backendUser?.username !== existingUser.username || backendUser?.walletAddress !== existingUser.walletAddress) {
                        setBackendUser(existingUser);
                    } else if (!backendUser) {
                        setBackendUser(existingUser);
                    }

                    if (walletAddress && existingUser.walletAddress !== walletAddress) {
                        console.log('🔄 Updating wallet address in backend');
                        updateUser.mutate({ email, walletAddress, username: existingUser.username });
                    } else {
                        setVerificationStatus('verified');
                        isProcessing.current = false;
                    }
                } else {
                    console.log('🆕 Creating new user in backend');
                    createUser.mutate({ email, walletAddress });
                }

                processedUser.current = userKey;
            } catch (error) {
                console.log('⚠️ Backend verification failed:', error);
                setVerificationStatus('failed');
                setBackendUser(null);
                isProcessing.current = false;
            }
        };

        handleVerification();
    }, [
        enabled,
        email,
        walletAddress,
        checkUserQuery.data,
        createUser,
        updateUser,
        backendUser
    ]);

    useEffect(() => {
        if (checkUserQuery.isLoading) {
            setVerificationStatus('checking');
        } else if (checkUserQuery.isError) {
            setVerificationStatus('failed');
            isProcessing.current = false;
        }
    }, [checkUserQuery.isLoading, checkUserQuery.isError]);

    const isVerified = verificationStatus === 'verified' && !!backendUser;
    const isLoading = verificationStatus === 'checking' || checkUserQuery.isLoading || createUser.isPending || updateUser.isPending;
    const hasError = verificationStatus === 'failed' || checkUserQuery.isError;

    return {
        backendUser,
        isVerified,
        isLoading,
        hasError,
        verificationStatus,
    };
};