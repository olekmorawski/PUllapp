import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DriverRideDetails {
    earnings: string;
    pickupAddress: string;
    destinationAddress: string;
    timeToClient: string;
}

interface DriverBottomSheetProps {
    rideDetails: DriverRideDetails | null;
    isVisible: boolean;
    onAccept?: () => void;
    onReject?: () => void;
}

export const DriverBottomSheet: React.FC<DriverBottomSheetProps> = ({
                                                                        rideDetails,
                                                                        isVisible,
                                                                        onAccept,
                                                                        onReject,
                                                                    }) => {
    if (!isVisible) return null;

    return (
        <View
            className="bg-white p-5 rounded-2xl shadow-lg mb-8"
            style={{
                position: 'absolute',
                left: 16,
                right: 16,
                bottom: 16,
                elevation: 10,
            }}
        >
            {!rideDetails ? (
                <View className="items-center py-4">
                    <Ionicons name="information-circle-outline" size={40} color="#999999" />
                    <Text className="text-lg text-gray-600 mt-2">No active ride assigned.</Text>
                    <Text className="text-sm text-gray-400">Waiting for new requests...</Text>
                </View>
            ) : (
                <View>
                    <View className="flex-row items-center mb-3">
                        <Ionicons name="cash-outline" size={24} color="#4CAF50" className="mr-3" />
                        <Text className="text-base text-gray-700">Earnings for this trip:</Text>
                        <Text className="text-lg font-bold text-green-600 ml-auto">{rideDetails.earnings}</Text>
                    </View>

                    <View className="h-px bg-gray-200 my-3" />

                    <View className="mb-2">
                        <View className="flex-row items-start mb-1">
                            <Ionicons name="navigate-circle-outline" size={24} color="#007AFF" className="mr-3 mt-0.5" />
                            <View className="flex-1">
                                <Text className="text-sm text-gray-500">Pick up:</Text>
                                <Text className="text-base text-gray-800">{rideDetails.pickupAddress}</Text>
                            </View>
                        </View>
                        <View className="flex-row items-center ml-[36px] mb-2">
                            <Ionicons name="time-outline" size={20} color="#FF9500" className="mr-2" />
                            <Text className="text-sm text-orange-500">Time to client: {rideDetails.timeToClient}</Text>
                        </View>
                    </View>

                    <View className="flex-row items-start mb-4">
                        <Ionicons name="flag-outline" size={24} color="#AF52DE" className="mr-3 mt-0.5" />
                        <View className="flex-1">
                            <Text className="text-sm text-gray-500">Destination:</Text>
                            <Text className="text-base text-gray-800">{rideDetails.destinationAddress}</Text>
                        </View>
                    </View>

                    <View className="flex-row justify-between space-x-4 mt-2">
                        <TouchableOpacity
                            onPress={onReject}
                            className="flex-1 bg-red-500 rounded-xl py-3 items-center"
                        >
                            <Text className="text-white font-semibold">Reject</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

export default DriverBottomSheet;
