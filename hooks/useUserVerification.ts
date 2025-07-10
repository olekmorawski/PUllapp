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

    // Track if we've already processed this user to prevent infinite loops
    const processedUser = useRef<string | null>(null);
    const isProcessing = useRef(false);

    // Individual hooks
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
                        updateUser.mutate({ email, walletAddress });
                    } else {
                        setBackendUser(existingUser);
                        setVerificationStatus('verified');
                        isProcessing.current = false;
                    }
                } else {
                    console.log('🆕 Creating new user in backend');
                    createUser.mutate({ email, walletAddress });
                }

                // Mark this user as processed
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
        checkUserQuery.data?.exists, // Only depend on exists flag
        createUser,
        updateUser,
    ]);

    // Update verification status based on query state
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
        // Expose individual hook methods for manual operations if needed
        createUserManually: createUser.mutate,
        updateUserManually: updateUser.mutate,
    };
};