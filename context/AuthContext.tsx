import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { dynamicClient } from '@/lib/dynamicClient';
import { UserProfile } from "@dynamic-labs/types";

// Backend User interface
export interface User {
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
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Backend API functions
  const checkUserExists = async (email: string): Promise<{ exists: boolean; user?: User }> => {
    console.log('🔍 Checking if user exists for email:', email);

    const response = await fetch(`${BACKEND_URL}/api/users/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error('Failed to check user');
    }

    const data = await response.json();
    console.log('✅ User check response:', data);

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  };

  const createUser = async (email: string, walletAddress?: string): Promise<User> => {
    console.log('🆕 Creating user with email:', email, 'wallet:', walletAddress);

    const response = await fetch(`${BACKEND_URL}/api/users/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, walletAddress }),
    });

    if (!response.ok) {
      throw new Error('Failed to create user');
    }

    const data = await response.json();
    console.log('✅ User created:', data);

    if (data.error) {
      throw new Error(data.error);
    }

    return data.user;
  };

  const updateUser = async (email: string, walletAddress?: string): Promise<User> => {
    console.log('🔄 Updating user with email:', email, 'wallet:', walletAddress);

    const response = await fetch(`${BACKEND_URL}/api/users/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, walletAddress }),
    });

    if (!response.ok) {
      throw new Error('Failed to update user');
    }

    const data = await response.json();
    console.log('✅ User updated:', data);

    if (data.error) {
      throw new Error(data.error);
    }

    return data.user;
  };

  const handleUserLogin = async (authenticatedUser: UserProfile) => {
    try {
      console.log('🚀 Handling user login for:', authenticatedUser);

      const email = authenticatedUser.email;
      if (!email) {
        console.log('❌ No email found in authenticated user');
        return;
      }

      console.log('📧 User email:', email);

      // Get wallet address from Dynamic if available
      let walletAddress;
      console.log('🔍 Checking for verified credentials:', authenticatedUser.verifiedCredentials);

      if (authenticatedUser.verifiedCredentials) {
        console.log('📋 All verified credentials:', authenticatedUser.verifiedCredentials);

        const walletCredential = authenticatedUser.verifiedCredentials.find(
            credential => {
              console.log('🔍 Checking credential:', credential);
              return credential.format === 'blockchain' && credential.address;
            }
        );

        if (walletCredential) {
          walletAddress = walletCredential.address;
          console.log('💰 Found wallet address:', walletAddress);
        } else {
          console.log('❌ No wallet credential found');
        }
      } else {
        console.log('❌ No verified credentials found');
      }

      // Check if user exists in backend
      const { exists, user: existingUser } = await checkUserExists(email);

      if (exists && existingUser) {
        console.log('👤 User exists, checking wallet address...');
        console.log('🔍 Existing wallet:', existingUser.walletAddress);
        console.log('🔍 New wallet:', walletAddress);

        // User exists, update wallet address if needed
        if (walletAddress && existingUser.walletAddress !== walletAddress) {
          console.log('🔄 Wallet address changed, updating...');
          const updatedUser = await updateUser(email, walletAddress);
          setUser(updatedUser);
        } else {
          console.log('✅ Using existing user data');
          setUser(existingUser);
        }
      } else {
        console.log('🆕 User doesn\'t exist, creating new user...');
        // User doesn't exist, create new user
        const newUser = await createUser(email, walletAddress);
        setUser(newUser);
      }

    } catch (error) {
      console.error('❌ Error handling user login:', error);
      // Don't throw here to avoid breaking the auth flow
    }
  };

  // Monitor authentication state changes
  useEffect(() => {
    const handleAuthSuccess = async (authenticatedUser: UserProfile) => {
      console.log('🎉 Auth success event triggered');
      setIsAuthenticated(true);
      setUserEmail(undefined); // Clear OTP email if any

      // Handle user creation/update in backend
      await handleUserLogin(authenticatedUser);
    };

    const handleLogout = (user: UserProfile | null) => {
      console.log('👋 User logged out');
      setIsAuthenticated(false);
      setUserEmail(undefined);
      setUser(null); // Clear user data
    };

    // Listen for authentication events from the Dynamic client
    dynamicClient.auth.on('authSuccess', handleAuthSuccess);
    dynamicClient.auth.on('loggedOut', handleLogout);

    // Check if user is already authenticated on app start
    const checkInitialAuth = async () => {
      console.log('🔍 Checking initial auth state...');
      const authenticatedUser = dynamicClient.auth.authenticatedUser;
      if (authenticatedUser) {
        console.log('✅ User already authenticated:', authenticatedUser);
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
      // Use Dynamic's email OTP system
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
      // Use Dynamic's email OTP verification
      await dynamicClient.auth.email.verifyOTP(otp);
      // Authentication success will be handled by the event listener above
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
      // The logout event listener will handle state cleanup
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

  // Debug: Log current user state
  useEffect(() => {
    console.log('👤 Current user state:', user);
    if (user) {
      console.log('💰 Current wallet address:', user.walletAddress);
    }
  }, [user]);

  const contextValue: AuthContextType = {
    isAuthenticated,
    setIsAuthenticated,
    userEmail,
    user,
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
};