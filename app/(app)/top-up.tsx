import React, { useState } from 'react';
import { TextInput, Text, TouchableOpacity, View } from 'react-native';

const TopUpScreen = () => {
    const [amount, setAmount] = useState('');

    const handleTopUp = () => {
        console.log(`Top-up amount: ${amount}`);
    };

    return (
        <View className="flex-1 bg-gray-50 items-center justify-center px-6">
            <TextInput
                className="w-full h-14 bg-white rounded-xl px-5 text-lg text-gray-900 shadow-sm mb-5"
                placeholder="Enter amount"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
            />

            <TouchableOpacity
                onPress={handleTopUp}
                className="bg-gray-900 py-4 w-full rounded-xl items-center"
            >
                <Text className="text-white text-lg font-medium">Top Up</Text>
            </TouchableOpacity>
        </View>
    );
};

export default TopUpScreen;
