import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { dynamicClient } from '@/app/_layout';
import {UserProfile} from "@dynamic-labs/types";
interface AuthContextType {
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  userEmail?: string;
  sendEmailOTP: (email: string) => Promise<void>;
  verifyEmailOTP: (otp: string) => Promise<void>;
  resendEmailOTP: () => Promise<void>;
  isLoading: boolean;
  showAuthFlow: () => void;
  hideAuthFlow: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  // Monitor authentication state changes
  useEffect(() => {
    const handleAuthSuccess = (user: UserProfile) => {
      setIsAuthenticated(true);
      setUserEmail(undefined); // Clear OTP email if any
    };

    const handleLogout = (user: UserProfile | null) => {
      setIsAuthenticated(false);
      setUserEmail(undefined);
    };

    // Listen for authentication events from the Dynamic client
    dynamicClient.auth.on('authSuccess', handleAuthSuccess);
    dynamicClient.auth.on('loggedOut', handleLogout);

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

  const showAuthFlow = () => {
    dynamicClient.ui.auth.show();
  };

  const hideAuthFlow = () => {
    dynamicClient.ui.auth.hide();
  };

  const contextValue: AuthContextType = {
    isAuthenticated,
    setIsAuthenticated,
    userEmail,
    sendEmailOTP,
    verifyEmailOTP,
    resendEmailOTP,
    isLoading,
    showAuthFlow,
    hideAuthFlow,
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