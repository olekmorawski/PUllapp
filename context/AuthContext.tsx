// context/AuthContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useDynamicAuth, DynamicUserData } from '@/hooks/useDynamicAuth';
import { useUserVerification } from '@/hooks/useUserVerification';
import { BackendUser } from '@/hooks/api/useUserAPI';

interface AuthContextType {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;

  // User data
  dynamicUser: DynamicUserData | null;
  backendUser: BackendUser | null;

  // Verification status
  isVerified: boolean;
  verificationStatus: 'idle' | 'checking' | 'verified' | 'failed';

  // Auth methods
  sendEmailOTP: (email: string) => Promise<void>;
  verifyEmailOTP: (otp: string) => Promise<void>;
  resendEmailOTP: () => Promise<void>;
  signOut: () => Promise<void>;
  showAuthFlow: () => void;
  hideAuthFlow: () => void;

  // Legacy compatibility (for existing components)
  userEmail?: string;
  userName: string;
  walletAddress: string;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use custom hooks
  const dynamicAuth = useDynamicAuth();

  const userVerification = useUserVerification({
    email: dynamicAuth.dynamicUser?.email || '',
    walletAddress: dynamicAuth.dynamicUser?.walletAddress || '',
    enabled: dynamicAuth.isAuthenticated && !!dynamicAuth.dynamicUser,
  });

  // Combined loading state
  const isLoading = dynamicAuth.isLoading || userVerification.isLoading;

  // Legacy compatibility values
  const userEmail = dynamicAuth.dynamicUser?.email;
  const userName = dynamicAuth.dynamicUser?.username || 'User';
  const walletAddress = dynamicAuth.dynamicUser?.walletAddress || '';

  // Debug logging
  React.useEffect(() => {
    if (dynamicAuth.dynamicUser) {
      console.log('👤 Auth State Update:');
      console.log('📧 Email:', dynamicAuth.dynamicUser.email);
      console.log('👤 Username:', dynamicAuth.dynamicUser.username);
      console.log('💰 Wallet (Dynamic):', dynamicAuth.dynamicUser.walletAddress);
      console.log('🔐 Backend User ID:', userVerification.backendUser?.id);
      console.log('✅ Verified:', userVerification.isVerified);
      console.log('📊 Verification Status:', userVerification.verificationStatus);
    }
  }, [dynamicAuth.dynamicUser, userVerification.backendUser, userVerification.verificationStatus]);

  const contextValue: AuthContextType = {
    // Authentication state
    isAuthenticated: dynamicAuth.isAuthenticated,
    isLoading,

    // User data
    dynamicUser: dynamicAuth.dynamicUser,
    backendUser: userVerification.backendUser,

    // Verification status
    isVerified: userVerification.isVerified,
    verificationStatus: userVerification.verificationStatus,

    // Auth methods
    sendEmailOTP: dynamicAuth.sendEmailOTP,
    verifyEmailOTP: dynamicAuth.verifyEmailOTP,
    resendEmailOTP: dynamicAuth.resendEmailOTP,
    signOut: dynamicAuth.signOut,
    showAuthFlow: dynamicAuth.showAuthFlow,
    hideAuthFlow: dynamicAuth.hideAuthFlow,

    // Legacy compatibility
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