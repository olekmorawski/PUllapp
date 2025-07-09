import { useState, useEffect, useCallback } from 'react';
import { dynamicClient } from '@/lib/dynamicClient';
import { UserProfile } from "@dynamic-labs/types";

// Types
export interface DynamicUserData {
    email: string;
    username: string;
    walletAddress: string;
}

const createUsernameFromEmail = (email: string): string => {
    const username = email.split('@')[0];
    return username.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase();
};

const extractDynamicData = (authenticatedUser: UserProfile): DynamicUserData => {
    console.log('🚀 Extracting user data from Dynamic');

    const email = authenticatedUser.email || '';
    const username = email ? createUsernameFromEmail(email) : 'User';

    // Get the most recently used wallet address from Dynamic
    let walletAddress = '';
    if (authenticatedUser.verifiedCredentials) {
        const walletCredentials = authenticatedUser.verifiedCredentials.filter(
            credential => credential.format === 'blockchain' && credential.address
        );

        if (walletCredentials.length > 0) {
            // Sort by lastSelectedAt to get the most recent
            const sortedWallets = walletCredentials.sort((a, b) => {
                const dateA = new Date(a.lastSelectedAt || 0).getTime();
                const dateB = new Date(b.lastSelectedAt || 0).getTime();
                return dateB - dateA;
            });

            walletAddress = sortedWallets[0].address || '';
            console.log('💰 Using wallet address from Dynamic:', walletAddress);
        }
    }

    return { email, username, walletAddress };
};

export const useDynamicAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [dynamicUser, setDynamicUser] = useState<DynamicUserData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Extract user data from authenticated user
    const updateDynamicUser = useCallback((authenticatedUser: UserProfile | null) => {
        if (authenticatedUser) {
            const userData = extractDynamicData(authenticatedUser);
            setDynamicUser(userData);
            setIsAuthenticated(true);
        } else {
            setDynamicUser(null);
            setIsAuthenticated(false);
        }
    }, []);

    // Check initial auth state
    useEffect(() => {
        console.log('🔍 Checking initial Dynamic auth state...');
        const authenticatedUser = dynamicClient.auth.authenticatedUser;
        updateDynamicUser(authenticatedUser);
    }, [updateDynamicUser]);

    // Listen for auth events
    useEffect(() => {
        const handleAuthSuccess = (authenticatedUser: UserProfile) => {
            console.log('🎉 Dynamic auth success');
            updateDynamicUser(authenticatedUser);
        };

        const handleLogout = () => {
            console.log('👋 Dynamic logout');
            updateDynamicUser(null);
        };

        dynamicClient.auth.on('authSuccess', handleAuthSuccess);
        dynamicClient.auth.on('loggedOut', handleLogout);

        return () => {
            dynamicClient.auth.off('authSuccess', handleAuthSuccess);
            dynamicClient.auth.off('loggedOut', handleLogout);
        };
    }, [updateDynamicUser]);

    // Auth methods
    const sendEmailOTP = useCallback(async (email: string) => {
        setIsLoading(true);
        try {
            await dynamicClient.auth.email.sendOTP(email);
        } catch (error) {
            console.error('Failed to send OTP:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const verifyEmailOTP = useCallback(async (otp: string) => {
        setIsLoading(true);
        try {
            await dynamicClient.auth.email.verifyOTP(otp);
        } catch (error) {
            console.error('Failed to verify OTP:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const resendEmailOTP = useCallback(async () => {
        setIsLoading(true);
        try {
            await dynamicClient.auth.email.resendOTP();
        } catch (error) {
            console.error('Failed to resend OTP:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const signOut = useCallback(async () => {
        setIsLoading(true);
        try {
            await dynamicClient.auth.logout();
        } catch (error) {
            console.error('Error signing out:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const showAuthFlow = useCallback(() => {
        dynamicClient.ui.auth.show();
    }, []);

    const hideAuthFlow = useCallback(() => {
        dynamicClient.ui.auth.hide();
    }, []);

    return {
        // State
        isAuthenticated,
        dynamicUser,
        isLoading,

        // Methods
        sendEmailOTP,
        verifyEmailOTP,
        resendEmailOTP,
        signOut,
        showAuthFlow,
        hideAuthFlow,
    };
};