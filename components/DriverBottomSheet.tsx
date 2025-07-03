import React from 'react';
import { View, Text } from 'react-native';
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
}

export const DriverBottomSheet: React.FC<DriverBottomSheetProps> = ({ rideDetails, isVisible }) => {
    if (!isVisible) {
        return null; // Don't render anything if not visible
    }

    // Using Tailwind CSS classes via NativeWind
    // Base container style: absolute positioning at the bottom, white background, shadow, rounded top corners.
    // Height will be content-driven for now, up to a certain max if needed, or a fixed percentage.
    // Let's aim for roughly 40% of screen height as a starting point for content.
    // A direct vh like h-[40vh] might not work in React Native NativeWind as easily as web.
    // Instead, we often use padding or fixed heights for components.
    // For simplicity, I'll use padding and let content define height for now.
    // If a fixed height like 40% of screen is strictly needed, we might need Dimensions API + inline style for height.

    return (
        <View className="absolute bottom-0 left-0 right-0 bg-white p-5 rounded-t-2xl shadow-lg"
              style={{
                  // Elevation for Android shadow (shadow-lg might provide some via NativeWind config)
                  elevation: 10,
                  // Min height can be set if content is too small, max height if too large
                  // For now, let content dictate, or set a specific height e.g. minHeight: 200
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
                    {/* Handle Bar - purely visual if not draggable */}
                    <View className="items-center mb-4">
                        <View className="w-10 h-1.5 bg-gray-300 rounded-full" />
                    </View>

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
                        <View className="flex-row items-center ml-[36px] mb-2"> {/* Align with address text */}
                            <Ionicons name="time-outline" size={20} color="#FF9500" className="mr-2" />
                            <Text className="text-sm text-orange-500">Time to client: {rideDetails.timeToClient}</Text>
                        </View>
                    </View>

                    <View className="flex-row items-start">
                        <Ionicons name="flag-outline" size={24} color="#AF52DE" className="mr-3 mt-0.5" />
                        <View className="flex-1">
                            <Text className="text-sm text-gray-500">Destination:</Text>
                            <Text className="text-base text-gray-800">{rideDetails.destinationAddress}</Text>
                        </View>
                    </View>
                    {/* Add more details or actions here if needed */}
                </View>
            )}
        </View>
    );
};

export default DriverBottomSheet;
