// hooks/useUserVerification.ts
import { useEffect, useState, useRef } from 'react';
import { useCheckUser, useCreateUser, useUpdateUser, BackendUser } from './api/useUserAPI';

interface UseUserVerificationProps {
    email: string;
    walletAddress: string;
    enabled: boolean;
}

export const useUserVerification = ({ email, walletAddress, enabled }: UseUserVerificationProps) => {
    const [backendUser, setBackendUser] = useState<BackendUser | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'checking' | 'verified' | 'failed'>('idle');

    // Track if we've already processed this user to prevent infinite loops
    const processedUser = useRef<string | null>(null);
    const isProcessing = useRef(false);

    // Queries and mutations
    const checkUserQuery = useCheckUser(email, enabled);
    const createUserMutation = useCreateUser();
    const updateUserMutation = useUpdateUser();

    // Handle user verification logic
    useEffect(() => {
        if (!enabled || !email || !checkUserQuery.data || isProcessing.current) return;

        // Prevent processing the same user multiple times
        const userKey = `${email}-${walletAddress}`;
        if (processedUser.current === userKey) return;

        const handleVerification = async () => {
            isProcessing.current = true;
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

                // Mark this user as processed
                processedUser.current = userKey;
            } catch (error) {
                console.log('⚠️ Backend verification failed:', error);
                setVerificationStatus('failed');
                setBackendUser(null);
            } finally {
                isProcessing.current = false;
            }
        };

        handleVerification();
    }, [
        enabled,
        email,
        walletAddress,
        checkUserQuery.data?.exists, // Only depend on exists flag, not the whole data object
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