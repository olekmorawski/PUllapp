import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Alert, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import StyledButton from '@/components/StyledButton';
import { useAuthContext } from '@/context/AuthContext';

const OTP_LENGTH = 6;

export default function OTPScreen() {
  const params = useLocalSearchParams();
  const { email } = params;
  const { verifyEmailOTP, resendEmailOTP, isLoading } = useAuthContext();

  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setOtpError('');

    if (text && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleConfirmOTP = async () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== OTP_LENGTH) {
      setOtpError(`OTP must be ${OTP_LENGTH} digits.`);
      return;
    }

    try {
      await verifyEmailOTP(enteredOtp);
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      setOtpError('Invalid OTP. Please try again.');
    }
  };

  const handleResendOtp = async () => {
    try {
      await resendEmailOTP();
      Alert.alert("OTP Resent", `A new OTP has been sent to ${email}.`);
      setOtp(new Array(OTP_LENGTH).fill(''));
      setOtpError('');
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      console.error('Error resending OTP:', error);
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    }
  };

  return (
      <SafeAreaView className="flex-1 bg-gray-100">
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
        >
          <View className="flex-1 justify-center items-center p-6">
            <Text className="text-2xl font-bold mb-4 text-gray-800">Enter OTP</Text>
            <Text className="text-base text-gray-600 mb-8 text-center">
              A {OTP_LENGTH}-digit code has been sent to{'\n'}{typeof email === 'string' ? email : 'your email'}.
            </Text>

            <View className="flex-row justify-between w-full max-w-xs mb-4">
              {otp.map((digit, index) => (
                  <TextInput
                      key={index}
                      ref={(ref) => (inputRefs.current[index] = ref)}
                      className={`border ${otpError ? 'border-red-500' : 'border-gray-300'} w-12 h-14 rounded-lg text-center text-xl bg-white text-gray-700`}
                      value={digit}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      textContentType="oneTimeCode"
                      editable={!isLoading}
                  />
              ))}
            </View>

            {otpError ? <Text className="text-red-500 mb-4 text-sm">{otpError}</Text> : null}

            <StyledButton
                title={isLoading ? 'Verifying...' : 'Confirm OTP'}
                onPress={handleConfirmOTP}
                variant="primary"
                className="w-full max-w-[320px]"
                disabled={isLoading}
            />

            <Pressable onPress={handleResendOtp} className="mt-6" disabled={isLoading}>
              <Text className="text-sm text-blue-500 font-semibold">
                Didnt receive code? Resend OTP
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}