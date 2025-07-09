import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { dynamicClient } from '@/lib/dynamicClient';
import { UserProfile } from "@dynamic-labs/types";

// Backend User interface (for verification)
export interface BackendUser {
  id: string;
  email: string;
  username: string;
  walletAddress?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  userEmail?: string;
  userName: string;
  walletAddress: string; // Always from Dynamic
  backendUser: BackendUser | null; // For verification/identity
  sendEmailOTP: (email: string) => Promise<void>;
  verifyEmailOTP: (otp: string) => Promise<void>;
  resendEmailOTP: () => Promise<void>;
  isLoading: boolean;
  showAuthFlow: () => void;
  hideAuthFlow: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configure your backend URL
const BACKEND_URL = 'http://localhost:3001';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [userName, setUserName] = useState<string>('User');
  const [walletAddress, setWalletAddress] = useState<string>(''); // From Dynamic
  const [backendUser, setBackendUser] = useState<BackendUser | null>(null); // For verification
  const [isLoading, setIsLoading] = useState(false);

  const createUsernameFromEmail = (email: string): string => {
    const username = email.split('@')[0];
    return username.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase();
  };

  // Backend functions (for verification only)
  const verifyUserInBackend = async (email: string, walletAddress?: string) => {
    try {
      console.log('🔍 Verifying user in backend:', email, 'wallet:', walletAddress);

      // Check if user exists
      const checkResponse = await fetch(`${BACKEND_URL}/api/users/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!checkResponse.ok) {
        console.log('⚠️ Backend not available, continuing without verification');
        return null;
      }

      const checkData = await checkResponse.json();

      if (checkData.exists && checkData.user) {
        console.log('✅ User exists in backend');

        // Update wallet address if different
        if (walletAddress && checkData.user.walletAddress !== walletAddress) {
          console.log('🔄 Updating wallet address in backend');
          const updateResponse = await fetch(`${BACKEND_URL}/api/users/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, walletAddress }),
          });

          if (updateResponse.ok) {
            const updateData = await updateResponse.json();
            return updateData.user;
          }
        }

        return checkData.user;
      } else {
        console.log('🆕 Creating new user in backend');
        // Create new user
        const createResponse = await fetch(`${BACKEND_URL}/api/users/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, walletAddress }),
        });

        if (createResponse.ok) {
          const createData = await createResponse.json();
          return createData.user;
        }
      }

      return null;
    } catch (error) {
      console.log('⚠️ Backend verification failed, continuing without it:', error);
      return null;
    }
  };

  const extractDynamicData = (authenticatedUser: UserProfile) => {
    console.log('🚀 Extracting user data from Dynamic');

    const email = authenticatedUser.email || '';
    const username = email ? createUsernameFromEmail(email) : 'User';

    // Get the most recently used wallet address from Dynamic
    let walletAddr = '';
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

        walletAddr = sortedWallets[0].address || '';
        console.log('💰 Using wallet address from Dynamic:', walletAddr);
      }
    }

    return { email, username, walletAddr };
  };

  const handleUserLogin = async (authenticatedUser: UserProfile) => {
    const { email, username, walletAddr } = extractDynamicData(authenticatedUser);

    // Set Dynamic data immediately (for UI)
    setUserEmail(email);
    setUserName(username);
    setWalletAddress(walletAddr);

    // Verify in backend (for identity confirmation) - don't block UI
    const backendUserData = await verifyUserInBackend(email, walletAddr);
    setBackendUser(backendUserData);

    if (backendUserData) {
      console.log('✅ User verified in backend:', backendUserData.id);
    } else {
      console.log('⚠️ Continuing without backend verification');
    }
  };

  // Monitor authentication state changes
  useEffect(() => {
    const handleAuthSuccess = async (authenticatedUser: UserProfile) => {
      console.log('🎉 Auth success event triggered');
      setIsAuthenticated(true);
      setUserEmail(undefined);

      await handleUserLogin(authenticatedUser);
    };

    const handleLogout = (user: UserProfile | null) => {
      console.log('👋 User logged out');
      setIsAuthenticated(false);
      setUserEmail(undefined);
      setUserName('User');
      setWalletAddress('');
      setBackendUser(null);
    };

    // Listen for authentication events from the Dynamic client
    dynamicClient.auth.on('authSuccess', handleAuthSuccess);
    dynamicClient.auth.on('loggedOut', handleLogout);

    // Check if user is already authenticated on app start
    const checkInitialAuth = async () => {
      console.log('🔍 Checking initial auth state...');
      const authenticatedUser = dynamicClient.auth.authenticatedUser;
      if (authenticatedUser) {
        console.log('✅ User already authenticated');
        setIsAuthenticated(true);
        await handleUserLogin(authenticatedUser);
      } else {
        console.log('❌ No authenticated user found');
      }
    };

    checkInitialAuth();

    return () => {
      dynamicClient.auth.off('authSuccess', handleAuthSuccess);
      dynamicClient.auth.off('loggedOut', handleLogout);
    };
  }, []);

  const sendEmailOTP = async (email: string) => {
    setIsLoading(true);
    try {
      await dynamicClient.auth.email.sendOTP(email);
      setUserEmail(email);
    } catch (error) {
      console.error('Failed to send OTP:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyEmailOTP = async (otp: string) => {
    setIsLoading(true);
    try {
      await dynamicClient.auth.email.verifyOTP(otp);
    } catch (error) {
      console.error('Failed to verify OTP:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resendEmailOTP = async () => {
    if (!userEmail) {
      throw new Error('No email set for resending OTP');
    }
    setIsLoading(true);
    try {
      await dynamicClient.auth.email.resendOTP();
    } catch (error) {
      console.error('Failed to resend OTP:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await dynamicClient.auth.logout();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const showAuthFlow = () => {
    dynamicClient.ui.auth.show();
  };

  const hideAuthFlow = () => {
    dynamicClient.ui.auth.hide();
  };

  // Debug: Log current state
  useEffect(() => {
    console.log('👤 Auth State - Wallet (Dynamic):', walletAddress, 'Backend User:', backendUser?.id);
  }, [walletAddress, backendUser]);

  const contextValue: AuthContextType = {
    isAuthenticated,
    setIsAuthenticated,
    userEmail,
    userName,
    walletAddress, // Always from Dynamic
    backendUser, // For verification
    sendEmailOTP,
    verifyEmailOTP,
    resendEmailOTP,
    isLoading,
    showAuthFlow,
    hideAuthFlow,
    signOut,
  };

  return (
      <AuthContext.Provider value={contextValue}>
        {children}
      </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}