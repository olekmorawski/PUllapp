import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BecomeDriverButtonProps {
    onPress: () => void;
}

export const BecomeDriverButton: React.FC<BecomeDriverButtonProps> = ({ onPress }) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={{
                marginHorizontal: 20,
                marginVertical: 8,
                backgroundColor: '#007AFF',
                borderRadius: 12,
                padding: 16,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#007AFF',
                shadowOffset: {
                    width: 0,
                    height: 2,
                },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
            }}
        >
            <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: 20,
                padding: 8,
                marginRight: 12,
            }}>
                <Ionicons name="car-outline" size={20} color="white" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{
                    color: 'white',
                    fontSize: 16,
                    fontWeight: '600',
                }}>
                    Become a Driver
                </Text>
                <Text style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: 12,
                    marginTop: 2,
                }}>
                    Start earning with your car
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="white" />
        </TouchableOpacity>
    );
};