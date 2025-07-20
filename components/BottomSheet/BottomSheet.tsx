// Update your BottomSheet component to integrate the useCreateRide hook

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Dimensions,
    PanResponder,
    ScrollView,
    Alert
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import {useLocation} from "@/hooks/Location/useLocation";
import {usePlacesSearch} from "@/hooks/Location/usePlacesSearch";
import {useRecentSearches} from "@/hooks/Location/useRecentSearches";
import {useFavoriteLocations} from "@/hooks/Location/useFavouriteLocations";
import {useReverseGeocode} from "@/hooks/Location/useReverseGeocode";
import {useCreateRide} from "@/hooks/useCreateRide";
import {BottomSheetHeader} from "@/components/BottomSheet/components/BottomSheetHeader";
import {LocationInputs} from "@/components/BottomSheet/components/LocationInputs";
import {SearchResults} from "@/components/BottomSheet/components/SearchResults";
import {RideOptionsList} from "@/components/BottomSheet/components/RideOptionList";
import {ConfirmButton} from "@/components/BottomSheet/components/ConfirmButton";

import { BottomSheetProps, LocationData, PlaceResult, RideOption } from './types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 380;
const MIN_TRANSLATE_Y = -200;

const AnimatedView = Animated.createAnimatedComponent(View);

export const BottomSheet: React.FC<BottomSheetProps> = ({
                                                            rideOptions = [],
                                                            onRideSelect,
                                                            onConfirmRide,
                                                            onLocationSelect,
                                                            userLocation,
                                                            onSearchError
                                                        }) => {
    // UI + animation state
    const [currentLocation, setCurrentLocation] = useState('');
    const [destination, setDestination] = useState('');
    const [selectedOrigin, setSelectedOrigin] = useState<LocationData | null>(null);
    const [selectedDestination, setSelectedDestination] = useState<LocationData | null>(null);
    const [activeSearchType, setActiveSearchType] = useState<'origin' | 'destination' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [isScrollEnabled, setIsScrollEnabled] = useState(true);
    const [selectedRide, setSelectedRide] = useState<RideOption | null>(null);
    const [customPrices, setCustomPrices] = useState<{ [key: number]: string }>({});

    // ✅ OPTIMIZATION - Rate limiting for search inputs
    const [lastSearchTime, setLastSearchTime] = useState<Record<string, number>>({});
    const [lastReverseGeocodedLocation, setLastReverseGeocodedLocation] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);

    // Animation refs
    const translateY = useSharedValue(MIN_TRANSLATE_Y);
    const startY = useRef(0);

    // Constants for optimization
    const MIN_SEARCH_INTERVAL = 500; // Minimum 500ms between searches
    const MIN_REVERSE_GEOCODE_DISTANCE = 100; // 100 meters minimum for reverse geocoding

    // Hooks
    const {
        location,
        error: locationError,
        isLoading: isGettingLocation,
        getCurrentLocation
    } = useLocation({ autoStart: true });

    // ✅ OPTIMIZATION - Stabilize proximity to prevent micro-changes from triggering searches
    const stableProximity = useMemo(() => {
        const coords = location?.coords || userLocation?.coords;
        if (!coords) return null;

        // Round to 4 decimal places (~11 meters precision)
        return {
            latitude: Math.round(coords.latitude * 10000) / 10000,
            longitude: Math.round(coords.longitude * 10000) / 10000
        };
    }, [location?.coords?.latitude, location?.coords?.longitude, userLocation?.coords?.latitude, userLocation?.coords?.longitude]);

    const {
        searchResults,
        isSearching,
        searchError,
        search,
        clearResults
    } = usePlacesSearch({
        proximity: stableProximity, // ✅ Use stabilized proximity
        debounceDelay: 300,
        minSearchLength: 2
    });

    const {
        recentSearches,
        addRecentSearch
    } = useRecentSearches();

    const {
        favoriteLocations,
        addFavorite
    } = useFavoriteLocations();

    const { reverseGeocode } = useReverseGeocode();

    // Add the create ride hook
    const createRide = useCreateRide({
        onSuccess: (data) => {
            Alert.alert(
                'Ride Created!',
                `Your ride has been created successfully. Ride ID: ${data.ride.id}`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            // Reset the form
                            setCurrentLocation('');
                            setDestination('');
                            setSelectedOrigin(null);
                            setSelectedDestination(null);
                            setSelectedRide(null);
                            setCustomPrices({});
                            collapseSheet();

                            // Call the original onConfirmRide callback if provided
                            onConfirmRide?.();
                        }
                    }
                ]
            );
        },
        onError: (error) => {
            Alert.alert(
                'Error Creating Ride',
                error.message || 'Failed to create ride. Please try again.',
                [{ text: 'OK' }]
            );
        }
    });

    // ✅ OPTIMIZATION - Helper function to calculate distance
    const getDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }, []);

    // ✅ OPTIMIZATION - Check if reverse geocoding should be performed
    const shouldReverseGeocode = useCallback((coords: { latitude: number; longitude: number }): boolean => {
        if (!lastReverseGeocodedLocation) return true;

        const distance = getDistance(
            lastReverseGeocodedLocation.latitude,
            lastReverseGeocodedLocation.longitude,
            coords.latitude,
            coords.longitude
        );

        return distance > MIN_REVERSE_GEOCODE_DISTANCE;
    }, [lastReverseGeocodedLocation, getDistance]);

    // Initial location fetch
    useEffect(() => {
        if (!currentLocation && !selectedOrigin && location) {
            handleGetCurrentLocation();
        }
    }, [location]);

    useEffect(() => {
        if (locationError) {
            console.warn('Location error:', locationError);
        }
    }, [locationError]);

    const handleGetCurrentLocation = useCallback(async () => {
        try {
            await getCurrentLocation();
            if (location && shouldReverseGeocode(location.coords)) {
                const address = await reverseGeocode(location.coords);
                const locData: LocationData = {
                    coordinates: location.coords,
                    address,
                    isCurrentLocation: true
                };
                setCurrentLocation(address);
                setSelectedOrigin(locData);
                onLocationSelect?.('origin', locData);

                // ✅ Update last reverse geocoded location
                setLastReverseGeocodedLocation({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });
            } else if (location) {
                // Use coordinate string if reverse geocoding is skipped
                const address = `Current Location (${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)})`;
                const locData: LocationData = {
                    coordinates: location.coords,
                    address,
                    isCurrentLocation: true
                };
                setCurrentLocation(address);
                setSelectedOrigin(locData);
                onLocationSelect?.('origin', locData);
            }
        } catch (error) {
            Alert.alert('Location Error', 'Could not retrieve current location.');
        }
    }, [location, reverseGeocode, shouldReverseGeocode, onLocationSelect]);

    // ✅ OPTIMIZATION - Add rate limiting to search input changes
    const handleSearchInputChange = useCallback((text: string, type: 'origin' | 'destination') => {
        setSearchQuery(text);
        if (type === 'origin') setCurrentLocation(text);
        else setDestination(text);

        // Rate limiting check
        const now = Date.now();
        const lastSearch = lastSearchTime[type] || 0;

        if (now - lastSearch < MIN_SEARCH_INTERVAL && text.length > 0) {
            // Too soon, skip this search
            return;
        }

        setLastSearchTime(prev => ({ ...prev, [type]: now }));
        search(text);
    }, [search, lastSearchTime]);

    const handlePlaceSelect = useCallback(async (place: PlaceResult) => {
        if (!activeSearchType) return;

        const locationData: LocationData = {
            coordinates: place.coordinates!,
            address: place.fullAddress || place.title
        };

        if (activeSearchType === 'origin') {
            setCurrentLocation(locationData.address);
            setSelectedOrigin(locationData);
        } else {
            setDestination(locationData.address);
            setSelectedDestination(locationData);
        }

        await addRecentSearch(place);
        onLocationSelect?.(activeSearchType, locationData);
        clearResults();
        setActiveSearchType(null);
    }, [activeSearchType, addRecentSearch, clearResults, onLocationSelect]);

    const saveFavoriteLocation = useCallback(async (key: string) => {
        const location = activeSearchType === 'origin' ? selectedOrigin : selectedDestination;
        if (!location) {
            Alert.alert('No Location', `Please select a ${activeSearchType} location first.`);
            return;
        }

        const placeResult: PlaceResult = {
            id: key,
            title: key.charAt(0).toUpperCase() + key.slice(1),
            subtitle: location.address,
            fullAddress: location.address,
            coordinates: location.coordinates
        };

        await addFavorite(key, placeResult);
        Alert.alert('Saved', `${key} location saved successfully`);
    }, [activeSearchType, selectedOrigin, selectedDestination, addFavorite]);

    const expandSheet = () => {
        setIsExpanded(true);
        translateY.value = withSpring(MAX_TRANSLATE_Y);
    };

    const collapseSheet = () => {
        setIsExpanded(false);
        translateY.value = withSpring(MIN_TRANSLATE_Y);
        setActiveSearchType(null);
        clearResults();
    };

    const handleLocationInputFocus = (type: 'origin' | 'destination') => {
        setActiveSearchType(type);
        expandSheet();
        clearResults();
        const currentText = type === 'origin' ? currentLocation : destination;
        if (currentText.length >= 2) search(currentText);
    };

    const handleRidePress = (ride: RideOption) => {
        setSelectedRide(ride);
        const customPrice = customPrices[ride.id] || '';
        onRideSelect?.(ride, customPrice);
    };

    const handlePriceChange = (rideId: number, price: string) => {
        const clean = price.replace(/[^0-9.$]/g, '');
        setCustomPrices(prev => ({ ...prev, [rideId]: clean }));
        if (selectedRide?.id === rideId) onRideSelect?.(selectedRide, clean);
    };

    const handleSuggestionPress = (rideId: number, range: string) => {
        const numbers = range.match(/\d+/g);
        if (numbers && numbers.length >= 2) {
            const middle = Math.round((+numbers[0] + +numbers[1]) / 2);
            handlePriceChange(rideId, `$${middle}`);
        }
    };

    const handleConfirmPress = () => {
        if (!selectedOrigin || !selectedDestination || !selectedRide) {
            Alert.alert('Missing Information', 'Please select origin, destination, and ride type.');
            return;
        }

        // Create the ride using the hook
        const customPrice = customPrices[selectedRide.id];

        createRide.mutate({
            originCoordinates: selectedOrigin.coordinates,
            destinationCoordinates: selectedDestination.coordinates,
            originAddress: selectedOrigin.address,
            destinationAddress: selectedDestination.address,
            rideType: selectedRide.type || selectedRide.name.toLowerCase(),
            estimatedPrice: selectedRide.price,
            customPrice: customPrice || undefined,
            notes: `Ride from ${selectedOrigin.address} to ${selectedDestination.address}`,
        });
    };

    const headerPanResponder = React.useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > Math.abs(gesture.dx) + 15,
        onPanResponderGrant: () => { startY.current = translateY.value; },
        onPanResponderMove: (_, gesture) => {
            if (Math.abs(gesture.dy) > 10) setIsScrollEnabled(false);
            const newY = startY.current + gesture.dy;
            translateY.value = Math.max(Math.min(newY, MIN_TRANSLATE_Y), MAX_TRANSLATE_Y);
        },
        onPanResponderRelease: (_, gesture) => {
            setIsScrollEnabled(true);
            const shouldExpand = gesture.vy < -0.5 || translateY.value < (MIN_TRANSLATE_Y + MAX_TRANSLATE_Y) / 2;
            shouldExpand ? expandSheet() : collapseSheet();
        }
    }), []);

    const rBottomSheetStyle = useAnimatedStyle(() => {
        const borderRadius = interpolate(
            translateY.value,
            [MAX_TRANSLATE_Y, MIN_TRANSLATE_Y],
            [0, 24],
            Extrapolation.CLAMP
        );
        return {
            transform: [{ translateY: translateY.value }],
            borderTopLeftRadius: borderRadius,
            borderTopRightRadius: borderRadius
        };
    });

    return (
        <AnimatedView style={[
            rBottomSheetStyle,
            {
                position: "absolute",
                left: 0,
                right: 0,
                bottom: -SCREEN_HEIGHT,
                backgroundColor: "white",
                height: SCREEN_HEIGHT,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 10
            }
        ]}>
            <BottomSheetHeader panHandlers={headerPanResponder.panHandlers} />

            <View style={{ paddingHorizontal: 16 }}>
                <LocationInputs
                    currentLocation={currentLocation}
                    destination={destination}
                    activeSearchType={activeSearchType}
                    isGettingLocation={isGettingLocation}
                    onOriginChange={(text: string) => handleSearchInputChange(text, 'origin')}
                    onDestinationChange={(text: string) => handleSearchInputChange(text, 'destination')}
                    onOriginFocus={() => handleLocationInputFocus('origin')}
                    onDestinationFocus={() => handleLocationInputFocus('destination')}
                    onGetLocation={handleGetCurrentLocation}
                />
            </View>

            <SearchResults
                activeSearchType={activeSearchType}
                searchQuery={searchQuery}
                searchResults={searchResults}
                recentSearches={recentSearches}
                favoriteLocations={favoriteLocations}
                isSearching={isSearching}
                isGettingLocation={isGettingLocation}
                searchError={searchError}
                onUseCurrentLocation={handleGetCurrentLocation}
                onSelectPlace={handlePlaceSelect}
                onAddFavorite={saveFavoriteLocation}
            />

            {isExpanded && !activeSearchType && (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8 }}
                    scrollEnabled={isScrollEnabled}
                    keyboardShouldPersistTaps="handled"
                >
                    <RideOptionsList
                        rideOptions={rideOptions}
                        selectedRide={selectedRide}
                        customPrices={customPrices}
                        onRidePress={handleRidePress}
                        onPriceChange={handlePriceChange}
                        onSuggestionPress={handleSuggestionPress}
                    />

                    <ConfirmButton
                        isEnabled={!!(selectedOrigin && selectedDestination && selectedRide) && !createRide.isPending}
                        onPress={handleConfirmPress}
                    />
                </ScrollView>
            )}
        </AnimatedView>
    );
};