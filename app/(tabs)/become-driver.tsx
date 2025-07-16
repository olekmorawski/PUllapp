import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import StyledButton from '@/components/StyledButton';

interface FormFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
  error?: string | null;
  multiline?: boolean;
  numberOfLines?: number;
}

const FormField: React.FC<FormFieldProps> = ({
                                               label,
                                               placeholder,
                                               value,
                                               onChangeText,
                                               keyboardType = 'default',
                                               secureTextEntry = false,
                                               error = null,
                                               multiline = false,
                                               numberOfLines = 1
                                             }) => (
    <View className="mb-4">
      <Text className="text-sm font-medium text-gray-700 mb-1 ml-1">{label}</Text>
      <TextInput
          className={`border ${error ? 'border-red-500' : 'border-gray-300'} p-3 rounded-lg text-base bg-white text-gray-700 ${multiline ? 'h-24' : ''}`}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          placeholderTextColor="#9CA3AF"
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          textAlignVertical={multiline ? 'top' : 'center'}
      />
      {error ? <Text className="text-red-500 mt-1 ml-1 text-xs">{error}</Text> : null}
    </View>
);

export default function BecomeDriverScreen() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    licenseNumber: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlate: '',
    motivation: '',
  });

  const [formErrors, setFormErrors] = useState<Record<keyof typeof formData, string | null>>({
    fullName: null,
    email: null,
    phoneNumber: null,
    address: null,
    licenseNumber: null,
    vehicleModel: null,
    vehicleYear: null,
    vehiclePlate: null,
    motivation: null,
  });

  const handleChange = (name: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    let valid = true;
    const newErrors: Record<keyof typeof formData, string | null> = {
      fullName: null, email: null, phoneNumber: null, address: null,
      licenseNumber: null, vehicleModel: null, vehicleYear: null,
      vehiclePlate: null, motivation: null
    }; // Initialize all to null

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required.';
      valid = false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.';
      valid = false;
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format.';
      valid = false;
    }
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required.';
      valid = false;
    }
    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber = 'Driver\'s license number is required.';
      valid = false;
    }
    if (!formData.vehicleModel.trim()) {
      newErrors.vehicleModel = 'Vehicle model is required.';
      valid = false;
    }
    if (!formData.vehiclePlate.trim()) {
      newErrors.vehiclePlate = 'Vehicle plate number is required.';
      valid = false;
    }

    setFormErrors(newErrors);
    return valid;
  };

  const submitDriverApplication = async () => {
    try {
      setIsSubmitting(true);

      // Replace with your actual API base URL
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

      const response = await fetch(`${API_BASE_URL}/api/drivers/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phoneNumber: formData.phoneNumber.trim(),
          address: formData.address.trim(),
          licenseNumber: formData.licenseNumber.trim(),
          vehicleModel: formData.vehicleModel.trim(),
          vehicleYear: formData.vehicleYear.trim(),
          vehiclePlate: formData.vehiclePlate.trim().toUpperCase(),
          motivation: formData.motivation.trim(),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Success - show confirmation and redirect
        Alert.alert(
            'Application Submitted Successfully! 🎉',
            `Thank you ${formData.fullName}! Your driver application has been submitted and is now under review. We will notify you via email at ${formData.email} once the review is complete.\n\nApplication ID: ${result.driver.id.slice(0, 8)}`,
            [
              {
                text: 'OK',
                onPress: () => {
                  // Reset form
                  setFormData({
                    fullName: '',
                    email: '',
                    phoneNumber: '',
                    address: '',
                    licenseNumber: '',
                    vehicleModel: '',
                    vehicleYear: '',
                    vehiclePlate: '',
                    motivation: '',
                  });
                  router.back();
                }
              }
            ]
        );
      } else {
        // Handle API errors
        const errorMessage = result.error || 'An unexpected error occurred. Please try again.';

        if (errorMessage.includes('already exists')) {
          Alert.alert(
              'Application Already Exists',
              'A driver application with this email or license number already exists. Please check your information or contact support if you believe this is an error.',
              [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Submission Error', errorMessage, [{ text: 'OK' }]);
        }
      }
    } catch (error) {
      console.error('Application submission error:', error);
      Alert.alert(
          'Network Error',
          'Unable to submit your application. Please check your internet connection and try again.',
          [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      // Check if driver already exists before submitting
      try {
        const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

        const checkResponse = await fetch(`${API_BASE_URL}/api/drivers/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
          }),
        });

        const checkResult = await checkResponse.json();

        if (checkResult.exists) {
          Alert.alert(
              'Application Already Exists',
              `A driver application already exists for ${formData.email}.\n\nStatus: ${checkResult.driver.status.charAt(0).toUpperCase() + checkResult.driver.status.slice(1)}\nApplication Date: ${new Date(checkResult.driver.applicationDate).toLocaleDateString()}`,
              [{ text: 'OK' }]
          );
          return;
        }

        // Proceed with submission if no existing application
        await submitDriverApplication();

      } catch (error) {
        console.error('Error checking existing application:', error);
        // If check fails, proceed with submission anyway
        await submitDriverApplication();
      }
    } else {
      Alert.alert('Validation Error', 'Please correct the errors in the form.');
    }
  };

  return (
      <SafeAreaView className="flex-1 bg-gray-100" edges={['top', 'left', 'right']}>
        <Stack.Screen
            options={{
              headerShown: true,
              title: 'Become a Driver',
              headerLeft: () => (
                  <TouchableOpacity
                      onPress={() => router.back()}
                      className="ml-4"
                      disabled={isSubmitting}
                  >
                    <Ionicons name="arrow-back" size={24} color={isSubmitting ? "#9CA3AF" : "black"} />
                  </TouchableOpacity>
              ),
            }}
        />

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
          <View className="p-5">
            <Text className="text-xl font-semibold text-gray-800 mb-2">Driver Application</Text>
            <Text className="text-sm text-gray-600 mb-6">
              Fill out the form below to apply to become a driver with us. All applications are reviewed within 24-48 hours.
            </Text>

            <FormField
                label="Full Name"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChangeText={text => handleChange('fullName', text)}
                error={formErrors.fullName}
            />

            <FormField
                label="Email Address"
                placeholder="your.email@example.com"
                value={formData.email}
                onChangeText={text => handleChange('email', text)}
                keyboardType="email-address"
                error={formErrors.email}
            />

            <FormField
                label="Phone Number"
                placeholder="(000) 000-0000"
                value={formData.phoneNumber}
                onChangeText={text => handleChange('phoneNumber', text)}
                keyboardType="phone-pad"
                error={formErrors.phoneNumber}
            />

            <FormField
                label="Home Address"
                placeholder="123 Main St, City, Country"
                value={formData.address}
                onChangeText={text => handleChange('address', text)}
                error={formErrors.address}
            />

            <Text className="text-lg font-semibold text-gray-700 mt-6 mb-3">License & Vehicle Information</Text>

            <FormField
                label="Driver's License Number"
                placeholder="Enter your license number"
                value={formData.licenseNumber}
                onChangeText={text => handleChange('licenseNumber', text)}
                error={formErrors.licenseNumber}
            />

            <FormField
                label="Vehicle Model"
                placeholder="e.g., Toyota Camry"
                value={formData.vehicleModel}
                onChangeText={text => handleChange('vehicleModel', text)}
                error={formErrors.vehicleModel}
            />

            <FormField
                label="Vehicle Year"
                placeholder="e.g., 2020"
                value={formData.vehicleYear}
                onChangeText={text => handleChange('vehicleYear', text)}
                keyboardType="numeric"
                error={formErrors.vehicleYear}
            />

            <FormField
                label="Vehicle License Plate"
                placeholder="e.g., ABC-123"
                value={formData.vehiclePlate}
                onChangeText={text => handleChange('vehiclePlate', text)}
                error={formErrors.vehiclePlate}
            />

            <Text className="text-lg font-semibold text-gray-700 mt-6 mb-3">Additional Information</Text>
            <FormField
                label="Why do you want to become a driver?"
                placeholder="Briefly explain your motivation..."
                value={formData.motivation}
                onChangeText={text => handleChange('motivation', text)}
                error={formErrors.motivation}
                multiline
                numberOfLines={4}
            />

            <View className="my-4 p-3 border border-dashed border-gray-400 rounded-lg items-center">
              <Ionicons name="cloud-upload-outline" size={32} color="#6B7280" />
              <Text className="text-gray-600 mt-1 text-sm">Document Upload (e.g., License, Insurance) - Coming Soon</Text>
            </View>

            <StyledButton
                title={isSubmitting ? "Submitting Application..." : "Submit Application"}
                onPress={handleSubmit}
                variant="primary"
                className="mt-6"
                disabled={isSubmitting}
            />

            {isSubmitting && (
                <View className="flex-row items-center justify-center mt-4">
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text className="ml-2 text-gray-600">Processing your application...</Text>
                </View>
            )}

            <Text className="text-xs text-gray-500 mt-4 text-center">
              By submitting this application, you agree to our terms of service and driver agreement.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
  );
}