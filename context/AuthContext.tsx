import React, { createContext, useContext, ReactNode } from 'react';
import { useDynamicAuth, DynamicUserData } from '@/hooks/useDynamicAuth';
import { useUserVerification } from '@/hooks/useUserVerification';
import {BackendUser} from "@/api/userAPI";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  dynamicUser: DynamicUserData | null;
  backendUser: BackendUser | null;
  isVerified: boolean;
  isDriver: boolean;
  verificationStatus: 'idle' | 'checking' | 'verified' | 'failed';
  sendEmailOTP: (email: string) => Promise<void>;
  verifyEmailOTP: (otp: string) => Promise<void>;
  resendEmailOTP: () => Promise<void>;
  signOut: () => Promise<void>;
  showAuthFlow: () => void;
  hideAuthFlow: () => void;
  userEmail?: string;
  userName: string;
  walletAddress: string;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const dynamicAuth = useDynamicAuth();

  const userVerification = useUserVerification({
    email: dynamicAuth.dynamicUser?.email || '',
    walletAddress: dynamicAuth.dynamicUser?.walletAddress || '',
    enabled: dynamicAuth.isAuthenticated && !!dynamicAuth.dynamicUser,
  });

  const isLoading = dynamicAuth.isLoading || userVerification.isLoading;

  const userEmail = dynamicAuth.dynamicUser?.email;

  const userName = userVerification.backendUser?.username ||
      'User';

  const walletAddress = dynamicAuth.dynamicUser?.walletAddress || '';

  const contextValue: AuthContextType = {
    isAuthenticated: dynamicAuth.isAuthenticated,
    isLoading,
    dynamicUser: dynamicAuth.dynamicUser,
    backendUser: userVerification.backendUser,
    isVerified: userVerification.isVerified,
    verificationStatus: userVerification.verificationStatus,
    sendEmailOTP: dynamicAuth.sendEmailOTP,
    verifyEmailOTP: dynamicAuth.verifyEmailOTP,
    resendEmailOTP: dynamicAuth.resendEmailOTP,
    signOut: dynamicAuth.signOut,
    showAuthFlow: dynamicAuth.showAuthFlow,
    hideAuthFlow: dynamicAuth.hideAuthFlow,

    // Legacy compatibility - now using backend username as priority
    userEmail,
    userName,
    walletAddress,
    setIsAuthenticated: () => {
      console.warn('setIsAuthenticated is deprecated, authentication is now managed automatically');
    },
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