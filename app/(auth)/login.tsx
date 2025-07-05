import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthContext } from '@/context/AuthContext';
import StyledButton from '@/components/StyledButton';

export default function LoginScreen() {
  const router = useRouter();
  const { sendEmailOTP, isLoading, showAuthFlow } = useAuthContext();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (text: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!text.trim()) {
      setEmailError('Email is required.');
      return false;
    }

    if (!emailRegex.test(text.trim())) {
      setEmailError('Please enter a valid email address.');
      return false;
    }

    setEmailError('');
    return true;
  };

  const handleContinue = async () => {
    const trimmedEmail = email.trim();

    if (!validateEmail(trimmedEmail)) {
      return;
    }

    try {
      await sendEmailOTP(trimmedEmail);

      // Navigate to OTP verification screen
      router.push({
        pathname: '/(auth)/otp',
        params: { email: trimmedEmail }
      });

    } catch (error: any) {
      console.error('Error sending OTP:', error);
      Alert.alert(
          'Error',
          error?.message || 'Failed to send verification code. Please try again.'
      );
    }
  };

  const handleWalletLogin = () => {
    showAuthFlow();
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    // Clear error when user starts typing
    if (emailError) {
      setEmailError('');
    }
  };

  return (
      <SafeAreaView className="flex-1 bg-gray-100">
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
        >
          <View className="flex-1 justify-center items-center p-6">
            <Text className="text-3xl font-bold mb-8 text-gray-800">
              Welcome Back
            </Text>

            <Text className="text-base text-gray-600 mb-8 text-center">
              Enter your email to receive a verification code
            </Text>

            <View className="w-full mb-6">
              <TextInput
                  className={`border ${
                      emailError ? 'border-red-500' : 'border-gray-300'
                  } p-4 rounded-lg text-base bg-white text-gray-700`}
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  placeholderTextColor="#9CA3AF"
                  editable={!isLoading}
              />
              {emailError ? (
                  <Text className="text-red-500 mt-1 ml-1 text-sm">
                    {emailError}
                  </Text>
              ) : null}
            </View>

            <StyledButton
                title={isLoading ? 'Sending Code...' : 'Continue with Email'}
                onPress={handleContinue}
                variant="primary"
                className="w-full mb-4"
                disabled={isLoading || !email.trim()}
            />

            <StyledButton
                title="Connect Wallet"
                onPress={handleWalletLogin}
                variant="secondary"
                className="w-full"
                disabled={isLoading}
            />

            <Text className="text-sm text-gray-500 text-center mt-6 px-4">
              We'll send you a verification code to confirm your email address
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}