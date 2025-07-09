// hooks/useUserVerification.ts
import { useEffect, useState } from 'react';
import { useCheckUser, useCreateUser, useUpdateUser, BackendUser } from './api/useUserAPI';

interface UseUserVerificationProps {
    email: string;
    walletAddress: string;
    enabled: boolean;
}

export const useUserVerification = ({ email, walletAddress, enabled }: UseUserVerificationProps) => {
    const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'checking' | 'verified' | 'failed'>('idle');

    // Queries and mutations
    const checkUserQuery = useCheckUser(email, enabled);
    const createUserMutation = useCreateUser();
    const updateUserMutation = useUpdateUser();

    // Handle user verification logic
    useEffect(() => {
        if (!enabled || !email || !checkUserQuery.data) return;

        const handleVerification = async () => {
            setVerificationStatus('checking');

            try {
                if (checkUserQuery.data.exists && checkUserQuery.data.user) {
                    console.log('✅ User exists in backend');
                    const existingUser = checkUserQuery.data.user;

                    // Update wallet address if different
                    if (walletAddress && existingUser.walletAddress !== walletAddress) {
                        console.log('🔄 Updating wallet address in backend');

                        const result = await updateUserMutation.mutateAsync({
                            email,
                            walletAddress,
                        });

                        setBackendUser(result.user);
                    } else {
                        setBackendUser(existingUser);
                    }

                    setVerificationStatus('verified');
                } else {
                    console.log('🆕 Creating new user in backend');

                    const result = await createUserMutation.mutateAsync({
                        email,
                        walletAddress,
                    });

                    setBackendUser(result.user);
                    setVerificationStatus('verified');
                }
            } catch (error) {
                console.log('⚠️ Backend verification failed:', error);
                setVerificationStatus('failed');
                setBackendUser(null);
            }
        };

        handleVerification();
    }, [
        enabled,
        email,
        walletAddress,
        checkUserQuery.data,
        createUserMutation,
        updateUserMutation,
    ]);

    // Update verification status based on query state
    useEffect(() => {
        if (checkUserQuery.isLoading) {
            setVerificationStatus('checking');
        } else if (checkUserQuery.isError) {
            setVerificationStatus('failed');
        }
    }, [checkUserQuery.isLoading, checkUserQuery.isError]);

    const isVerified = verificationStatus === 'verified' && !!backendUser;
    const isLoading = verificationStatus === 'checking' || checkUserQuery.isLoading;
    const hasError = verificationStatus === 'failed' || checkUserQuery.isError;

    return {
        backendUser,
        isVerified,
        isLoading,
        hasError,
        verificationStatus,
        // Expose mutations for manual operations if needed
        createUser: createUserMutation.mutateAsync,
        updateUser: updateUserMutation.mutateAsync,
    };
};