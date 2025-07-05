import React from 'react';
import { View } from 'react-native';
import { SearchInput } from './SearchInput';

interface LocationInputsProps {
    currentLocation: string;
    destination: string;
    activeSearchType: 'origin' | 'destination' | null;
    isGettingLocation: boolean;
    onOriginChange: (text: string) => void;
    onDestinationChange: (text: string) => void;
    onOriginFocus: () => void;
    onDestinationFocus: () => void;
    onGetLocation: () => void;
}

export const LocationInputs: React.FC<LocationInputsProps> = ({
    currentLocation,
    destination,
    activeSearchType,
    isGettingLocation,
    onOriginChange,
    onDestinationChange,
    onOriginFocus,
    onDestinationFocus,
    onGetLocation
}) => {
    return (
        <View>
            <SearchInput
                type="origin"
                value={currentLocation}
                placeholder="Where from?"
                isActive={activeSearchType === 'origin'}
                showLocationButton={true}
                isGettingLocation={isGettingLocation}
                onChange={onOriginChange}
                onFocus={onOriginFocus}
                onLocationPress={onGetLocation}
            />

            <SearchInput
                type="destination"
                value={destination}
                placeholder="Where to?"
                isActive={activeSearchType === 'destination'}
                onChange={onDestinationChange}
                onFocus={onDestinationFocus}
            />
        </View>
    );
};