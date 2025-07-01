import React, { useState } from 'react';
import { View, Text, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import StyledButton from '@/components/StyledButton'; // Assuming components are aliased with @
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (text: string) => {
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!text) {
      setEmailError('Email is required.');
      return false;
    }
    if (!emailRegex.test(text)) {
      setEmailError('Please enter a valid email address.');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleLogin = () => {
    if (validateEmail(email)) {
      // Navigate to OTP screen, passing email as a param
      // Ensure the path to otp is correct based on its future location
      router.push({ pathname: '/(auth)/otp', params: { email } });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <StyledView className="flex-1 justify-center items-center p-6">
          <StyledText className="text-3xl font-bold mb-8 text-gray-800">Welcome Back</StyledText>

          <StyledView className="w-full mb-4">
            <StyledTextInput
              className={`border ${emailError ? 'border-red-500' : 'border-gray-300'} p-4 rounded-lg text-base bg-white text-gray-700`}
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) validateEmail(text); // Clear error once user starts typing valid email
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9CA3AF" // gray-400
            />
            {emailError ? <StyledText className="text-red-500 mt-1 ml-1 text-sm">{emailError}</StyledText> : null}
          </StyledView>

          <StyledButton
            title="Continue"
            onPress={handleLogin}
            variant="primary"
            style={{ width: '100%' }} // Ensure button takes full width
          />

          <StyledView className="mt-6">
            <StyledText className="text-sm text-gray-600">
              Don't have an account?{' '}
              {/* Assuming signup will also be in (auth) group */}
              <StyledText onPress={() => router.push('/(auth)/signup')} className="text-blue-500 font-semibold">
                Sign Up
              </StyledText>
            </StyledText>
          </StyledView>

        </StyledView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
