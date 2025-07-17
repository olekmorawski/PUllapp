import React, { useState } from 'react';
import { Text, TextInput, View, TouchableOpacity } from 'react-native';

const SettingsScreen = () => {
    const [mode, setMode] = useState('driver'); // 'driver' or 'user'

    const [litersPerKm, setLitersPerKm] = useState('');
    const [pricePerKm, setPricePerKm] = useState('');
    const [reannounceIncrease, setReannounceIncrease] = useState('');

    const isDriver = mode === 'driver';

    return (
        <View className="flex-1 bg-gray-50 px-6 pt-12">

            {/* Mode Toggle */}
            <View className="flex-row justify-center mb-6">
                <TouchableOpacity
                    onPress={() => setMode('driver')}
                    className={`px-4 py-2 rounded-l-full ${
                        isDriver ? 'bg-gray-900' : 'bg-gray-200'
                    }`}
                >
                    <Text className={`text-sm ${isDriver ? 'text-white' : 'text-gray-800'}`}>
                        Driver
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => setMode('user')}
                    className={`px-4 py-2 rounded-r-full ${
                        !isDriver ? 'bg-gray-900' : 'bg-gray-200'
                    }`}
                >
                    <Text className={`text-sm ${!isDriver ? 'text-white' : 'text-gray-800'}`}>
                        User
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Driver Settings */}
            {isDriver && (
                <View className="space-y-5">
                    <View>
                        <Text className="text-gray-700 mb-2">Liters per kilometer</Text>
                        <TextInput
                            className="w-full h-12 bg-white rounded-lg px-4 text-gray-900 shadow-sm"
                            placeholder="e.g. 0.07"
                            keyboardType="numeric"
                            value={litersPerKm}
                            onChangeText={setLitersPerKm}
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    <View>
                        <Text className="text-gray-700 mb-2">$ per kilometer</Text>
                        <TextInput
                            className="w-full h-12 bg-white rounded-lg px-4 text-gray-900 shadow-sm"
                            placeholder="e.g. 0.50"
                            keyboardType="numeric"
                            value={pricePerKm}
                            onChangeText={setPricePerKm}
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>
                </View>
            )}

            {/* User Settings */}
            {!isDriver && (
                <View>
                    <Text className="text-gray-700 mb-2">$ increase on reannounce</Text>
                    <TextInput
                        className="w-full h-12 bg-white rounded-lg px-4 text-gray-900 shadow-sm"
                        placeholder="e.g. 1.00"
                        keyboardType="numeric"
                        value={reannounceIncrease}
                        onChangeText={setReannounceIncrease}
                        placeholderTextColor="#9CA3AF"
                    />
                </View>
            )}
        </View>
    );
};

export default SettingsScreen;
