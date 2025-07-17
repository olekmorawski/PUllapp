import React from 'react';
import { View, Text } from 'react-native';

interface TripInfoProps {
    tripStatus: string;
    driverName: string;
    driverVehicle: string;
    pickupAddress: string;
    price: string;
    isLoadingRoute: boolean;
}

export const TripInfo: React.FC<TripInfoProps> = ({
                                                      tripStatus,
                                                      driverName,
                                                      driverVehicle,
                                                      pickupAddress,
                                                      price,
                                                      isLoadingRoute,
                                                  }) => {
    const formatPrice = (priceString: string): string => {
        try {
            return `$${parseFloat(priceString).toFixed(2)}`;
        } catch {
            return 'N/A';
        }
    };

    return (
        <View className="flex-[0.3] p-4 bg-gray-50 border-t border-gray-200">
            <Text className="text-lg font-bold mb-2.5">{tripStatus}</Text>
            <Text className="text-base mb-2">
                Driver: {driverName || 'N/A'} ({driverVehicle || 'N/A'})
            </Text>
            <Text className="text-base mb-2">
                To: {pickupAddress || 'N/A'}
            </Text>
            <Text className="text-base mb-2">
                Est. Price: {formatPrice(price)}
            </Text>
            {isLoadingRoute && (
                <Text className="text-base mb-2">Updating route...</Text>
            )}
        </View>
    );
};