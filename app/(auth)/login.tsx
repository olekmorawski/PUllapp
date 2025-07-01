import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import StyledButton from '@/components/StyledButton';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const validateEmail = (text: string) => {
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
      router.push({ pathname: '/(auth)/otp', params: { email } });
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-3xl font-bold mb-8 text-gray-800">Welcome Back</Text>

          <View className="w-full mb-4">
            <TextInput
              className={`border ${emailError ? 'border-red-500' : 'border-gray-300'} p-4 rounded-lg text-base bg-white text-gray-700`}
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) validateEmail(text);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9CA3AF"
            />
            {emailError ? <Text className="text-red-500 mt-1 ml-1 text-sm">{emailError}</Text> : null}
          </View>

          <StyledButton
            title="Continue"
            onPress={handleLogin}
            variant="primary"
            className="w-full" // Use className for width instead of style prop for Tailwind consistency
          />

          <View className="mt-6">
            <Text className="text-sm text-gray-600">
              Don't have an account?{' '}
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text className="text-blue-500 font-semibold">
                  Sign Up
                </Text>
              </TouchableOpacity>
            </Text>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
