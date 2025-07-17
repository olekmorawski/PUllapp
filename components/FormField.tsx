import React from "react";
import {Text, TextInput, View} from "react-native";

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

export const FormField: React.FC<FormFieldProps> = ({
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