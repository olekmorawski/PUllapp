import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Alert, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import StyledButton from '@/components/StyledButton';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledPressable = styled(Pressable);

const OTP_LENGTH = 6; // Define OTP length

export default function OTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { email } = params; // Get email from navigation params

  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const [otpError, setOtpError] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Mock OTP, in a real app this would be sent to the user's email/phone
  const MOCK_OTP = "123456";

  useEffect(() => {
    // Focus the first input on mount
    inputRefs.current[0]?.focus();
    // For demonstration, log the mock OTP (remove in production)
    console.log(`Mock OTP for ${email}: ${MOCK_OTP}`);
    Alert.alert("OTP Sent (Mock)", `For testing, the OTP is ${MOCK_OTP}`);
  }, [email]);

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    setOtpError(''); // Clear error on change

    // If text is entered and not the last input, focus next
    if (text && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // If backspace is pressed on an empty input, focus previous
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleConfirmOTP = () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== OTP_LENGTH) {
      setOtpError(`OTP must be ${OTP_LENGTH} digits.`);
      return;
    }

    // SIMULATE OTP VERIFICATION
    if (enteredOtp === MOCK_OTP) { // Replace with actual OTP verification logic
      Alert.alert('OTP Verified', 'Login Successful!');
      // In a real app, you would set isAuthenticated to true here
      // For now, we'll navigate to the main app.
      // The RootLayout's useEffect will need its useAuth to change isAuthenticated
      // For now, let's assume a successful OTP means we can redirect.
      // This is a simplification. Proper auth state management is key.

      // TODO: Update actual authentication state here.
      // For now, we directly navigate. If useAuth in _layout is not updated,
      // it might redirect back to login. This needs to be handled by global auth state.
      router.replace('/(tabs)');
    } else {
      setOtpError('Invalid OTP. Please try again.');
    }
  };

  const handleResendOtp = () => {
    // Implement resend OTP logic here
    console.log(`Resending OTP to ${email}`);
    Alert.alert("OTP Resent (Mock)", `A new OTP has been sent to ${email}. (It's still ${MOCK_OTP})`);
    setOtp(new Array(OTP_LENGTH).fill(''));
    setOtpError('');
    inputRefs.current[0]?.focus();
  };


  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <StyledView className="flex-1 justify-center items-center p-6">
          <StyledText className="text-2xl font-bold mb-4 text-gray-800">Enter OTP</StyledText>
          <StyledText className="text-base text-gray-600 mb-8 text-center">
            A {OTP_LENGTH}-digit code has been sent to{'\n'}{typeof email === 'string' ? email : 'your email'}.
          </StyledText>

          <StyledView className="flex-row justify-between w-full max-w-xs mb-4">
            {otp.map((digit, index) => (
              <StyledTextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                className={`border ${otpError ? 'border-red-500' : 'border-gray-300'} w-12 h-14 rounded-lg text-center text-xl bg-white text-gray-700`}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                textContentType="oneTimeCode" // Helps with autofill if OS supports
              />
            ))}
          </StyledView>

          {otpError ? <StyledText className="text-red-500 mb-4 text-sm">{otpError}</StyledText> : null}

          <StyledButton
            title="Confirm OTP"
            onPress={handleConfirmOTP}
            variant="primary"
            style={{ width: '100%', maxWidth: 320 }}
          />

          <StyledPressable onPress={handleResendOtp} className="mt-6">
            <StyledText className="text-sm text-blue-500 font-semibold">
              Didn't receive code? Resend OTP
            </StyledText>
          </StyledPressable>

        </StyledView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
