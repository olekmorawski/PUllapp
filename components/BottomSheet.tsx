import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    View,
    Dimensions,
    PanResponder,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Text,
    FlatList,
    ActivityIndicator
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    useSharedValue,
    interpolate,
    Extrapolation,
} from "react-native-reanimated";
import { RideOptionsList } from './RideOptionList';
import { ConfirmButton } from './ConfirmButton';
import { placesService, LocationService } from './LocationService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 380;
const MIN_TRANSLATE_Y = -200;

const AnimatedView = Animated.createAnimatedComponent(View);

interface RideOption {
    id: number;
    type: string;
    time: string;
    suggestedRange: string;
    icon: string;
}

interface PlaceResult {
    id: string;
    title: string;
    subtitle: string;
    fullAddress: string;
    coordinates?: { latitude: number; longitude: number };
    placeId?: string;
}

interface BottomSheetProps {
    rideOptions?: RideOption[];
    onRideSelect?: (ride: RideOption, customPrice: string) => void;
    onConfirmRide?: () => void;
    onLocationSelect?: (type: 'origin' | 'destination', location: any) => void;
    userLocation?: any;
    onSearchError?: (error: Error) => void; // Fixed: added proper type
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
                                                            rideOptions = [
                                                                { id: 1, type: 'RideX', time: '2 min', suggestedRange: '$8-12', icon: '🚗' },
                                                                { id: 2, type: 'RideXL', time: '3 min', suggestedRange: '$15-22', icon: '🚙' },
                                                                { id: 3, type: 'RidePremium', time: '5 min', suggestedRange: '$25-35', icon: '🖤' },
                                                            ],
                                                            onRideSelect,
                                                            onConfirmRide,
                                                            onLocationSelect,
                                                            userLocation,
                                                            onSearchError // Fixed: properly typed prop
                                                        }) => {
    const [currentLocation, setCurrentLocation] = useState('');
    const [destination, setDestination] = useState('');
    const [searchError, setSearchError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isScrollEnabled, setIsScrollEnabled] = useState(true);
    const [selectedRide, setSelectedRide] = useState<RideOption | null>(null);
    const [customPrices, setCustomPrices] = useState<{[key: number]: string}>({});

    // Search-related state
    const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeSearchType, setActiveSearchType] = useState<'origin' | 'destination' | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrigin, setSelectedOrigin] = useState<any>(null);
    const [selectedDestination, setSelectedDestination] = useState<any>(null);

    const translateY = useSharedValue(MIN_TRANSLATE_Y);
    const startY = useRef(0);

    // Fixed: Use number instead of NodeJS.Timeout for React Native
    const searchTimeout = useRef<number>();

    // Auto-populate current location on mount
    useEffect(() => {
        if (userLocation && !currentLocation) {
            const address = `Current Location (${userLocation.coords?.latitude?.toFixed(4)}, ${userLocation.coords?.longitude?.toFixed(4)})`;
            setCurrentLocation(address);
            setSelectedOrigin({
                coordinates: {
                    latitude: userLocation.coords.latitude,
                    longitude: userLocation.coords.longitude
                },
                address: address,
                isCurrentLocation: true
            });
        }
    }, [userLocation, currentLocation]);

    // Debounced search function
    const performSearch = useCallback(async (query: string, type: 'origin' | 'destination') => {
        if (query.length < 2) {
            setSearchResults([]);
            setSearchError(null);
            return;
        }
        setIsSearching(true);
        setSearchError(null);

        try {
            const results = await placesService.searchPlaces(query, {
                location: userLocation?.coords,
                sessionId: `${type}-${Date.now()}`,
                language: 'en',
                types: 'establishment,address'
            });

            setSearchResults(results);
            if (results.length === 0 && query.length >= 2) {
                setSearchError("No places found matching your search.");
            }
        } catch (error: any) {
            console.error('Search error in BottomSheet:', error);
            let friendlyMessage = "Could not perform search. Please try again.";
            if (error.message) {
                if (error.message.includes('ZERO_RESULTS') || error.message.includes('No places found')) {
                    friendlyMessage = "No places found matching your search.";
                } else if (error.message.toLowerCase().includes('network') || error.message.includes('Failed to fetch')) {
                    friendlyMessage = "Network error during search. Please check your connection.";
                } else if (error.message.startsWith('Places API Error:')) {
                    friendlyMessage = `Search error: ${error.message.replace('Places API Error: ', '')}.`;
                }
            }
            setSearchError(friendlyMessage);
            setSearchResults([]);
            onSearchError?.(error);
        } finally {
            setIsSearching(false);
        }
    }, [userLocation, onSearchError]);

    // Handle search input changes with debouncing
    const handleSearchInputChange = useCallback((text: string, type: 'origin' | 'destination') => {
        setSearchQuery(text);

        if (type === 'origin') {
            setCurrentLocation(text);
        } else {
            setDestination(text);
        }

        // Clear previous timeout
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        // Fixed: Use window.setTimeout for React Native
        searchTimeout.current = window.setTimeout(() => {
            performSearch(text, type);
        }, 300);
    }, [performSearch]);

    // Handle place selection
    const handlePlaceSelect = async (place: PlaceResult, type: 'origin' | 'destination') => {
        try {
            let coordinates = place.coordinates;

            // If coordinates not available (Google Places), get place details
            if (!coordinates && place.placeId) {
                const details = await placesService.getPlaceDetails(place.placeId);
                coordinates = details?.coordinates;
            }

            const locationData = {
                ...place,
                coordinates
            };

            if (type === 'origin') {
                setCurrentLocation(place.fullAddress);
                setSelectedOrigin(locationData);
            } else {
                setDestination(place.fullAddress);
                setSelectedDestination(locationData);
            }

            // Notify parent component
            onLocationSelect?.(type, locationData);

            // Clear search
            setSearchResults([]);
            setActiveSearchType(null);
            setSearchQuery('');

        } catch (error) {
            console.error('Error selecting place:', error);
        }
    };

    // Use current location for origin
    const handleUseCurrentLocation = useCallback(async () => {
        try {
            // Fixed: Use LocationService class method
            const location = await LocationService.getCurrentLocationWithFallback();
            const address = `Current Location (${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)})`;

            const locationData = {
                coordinates: {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                },
                address: address,
                isCurrentLocation: true
            };

            setCurrentLocation(address);
            setSelectedOrigin(locationData);
            onLocationSelect?.('origin', locationData);

            setSearchResults([]);
            setActiveSearchType(null);
        } catch (error) {
            console.error('Error getting current location:', error);
            setSearchError('Could not get current location. Please try again.');
        }
    }, [onLocationSelect]);

    const expandSheet = () => {
        setIsExpanded(true);
        translateY.value = withSpring(MAX_TRANSLATE_Y, {
            damping: 50,
            stiffness: 300,
        });
    };

    const collapseSheet = () => {
        setIsExpanded(false);
        translateY.value = withSpring(MIN_TRANSLATE_Y, {
            damping: 50,
            stiffness: 300,
        });
        setActiveSearchType(null);
        setSearchResults([]);
        setSearchError(null); // Clear error when collapsing
    };

    const handleLocationInputFocus = (type: 'origin' | 'destination') => {
        setActiveSearchType(type);
        expandSheet();

        // Clear previous search results and errors
        setSearchResults([]);
        setSearchError(null);

        // Trigger search with current input
        const currentText = type === 'origin' ? currentLocation : destination;
        if (currentText.length > 2) {
            performSearch(currentText, type);
        }
    };

    const handleRidePress = (ride: RideOption) => {
        setSelectedRide(ride);
        const customPrice = customPrices[ride.id] || '';
        onRideSelect?.(ride, customPrice);
    };

    const handlePriceChange = (rideId: number, price: string) => {
        const cleanPrice = price.replace(/[^0-9.$]/g, '');
        setCustomPrices(prev => ({
            ...prev,
            [rideId]: cleanPrice
        }));

        if (selectedRide?.id === rideId) {
            onRideSelect?.(selectedRide, cleanPrice);
        }
    };

    const handleSuggestionPress = (rideId: number, suggestedRange: string) => {
        const numbers = suggestedRange.match(/\d+/g);
        if (numbers && numbers.length >= 2) {
            const min = parseInt(numbers[0]);
            const max = parseInt(numbers[1]);
            const middle = Math.round((min + max) / 2);
            const middlePrice = `$${middle}`;
            handlePriceChange(rideId, middlePrice);
        }
    };

    const handleConfirmPress = () => {
        if (selectedOrigin && selectedDestination && selectedRide) {
            onConfirmRide?.();
        }
    };

    // Pan responder for header
    const headerPanResponder = React.useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onMoveShouldSetPanResponder: (_, gestureState) =>
                    Math.abs(gestureState.dy) > Math.abs(gestureState.dx) + 15,
                onPanResponderGrant: () => {
                    startY.current = translateY.value;
                },
                onPanResponderMove: (_, gestureState) => {
                    if (Math.abs(gestureState.dy) > 10) {
                        setIsScrollEnabled(false);
                    }

                    const newValue = startY.current + gestureState.dy;
                    translateY.value = Math.max(
                        Math.min(newValue, MIN_TRANSLATE_Y),
                        MAX_TRANSLATE_Y
                    );
                },
                onPanResponderRelease: (_, gestureState) => {
                    setIsScrollEnabled(true);
                    const shouldExpand =
                        gestureState.vy < -0.5 ||
                        translateY.value < (MIN_TRANSLATE_Y + MAX_TRANSLATE_Y) / 2;

                    if (shouldExpand) {
                        expandSheet();
                    } else {
                        collapseSheet();
                    }
                }
            }),
        []
    );

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

    const renderSearchResults = () => {
        if (!activeSearchType) {
            return null;
        }

        // Show error message if there's an error and no results
        if (searchError && !isSearching && searchResults.length === 0) {
            return (
                <View style={{
                    backgroundColor: 'white',
                    marginTop: 8,
                    padding: 16,
                    alignItems: 'center'
                }}>
                    <Text style={{ color: '#FF4444', fontSize: 14, textAlign: 'center' }}>
                        {searchError}
                    </Text>
                </View>
            );
        }

        // Don't render if no results and no error
        if (searchResults.length === 0) {
            return null;
        }

        return (
            <View style={{ maxHeight: 200, backgroundColor: 'white', marginTop: 8 }}>
                {activeSearchType === 'origin' && (
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 12,
                            borderBottomWidth: 1,
                            borderBottomColor: '#E5E5E5'
                        }}
                        onPress={handleUseCurrentLocation}
                    >
                        <View style={{
                            width: 32,
                            height: 32,
                            borderRadius: 16,
                            backgroundColor: '#007AFF',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: 12
                        }}>
                            <Text style={{ color: 'white', fontSize: 16 }}>📍</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 16, fontWeight: '500' }}>Use Current Location</Text>
                            <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                                GPS location
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}

                <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                padding: 12,
                                borderBottomWidth: 1,
                                borderBottomColor: '#E5E5E5'
                            }}
                            onPress={() => handlePlaceSelect(item, activeSearchType)}
                        >
                            <View style={{
                                width: 32,
                                height: 32,
                                borderRadius: 16,
                                backgroundColor: '#F0F0F0',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12
                            }}>
                                <Text style={{ fontSize: 16 }}>📍</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 16, fontWeight: '500' }}>{item.title}</Text>
                                <Text style={{ fontSize: 14, color: '#666', marginTop: 2 }}>
                                    {item.subtitle}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                    nestedScrollEnabled={true}
                />
            </View>
        );
    };

    return (
        <AnimatedView
            style={[
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
                    elevation: 10,
                }
            ]}
        >
            {/* Enhanced Header with Search */}
            <View {...headerPanResponder.panHandlers} style={{ padding: 16 }}>
                <View style={{
                    width: 40,
                    height: 4,
                    backgroundColor: '#E0E0E0',
                    borderRadius: 2,
                    alignSelf: 'center',
                    marginBottom: 16
                }} />

                {/* Origin Input */}
                <View style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                            width: 12,
                            height: 12,
                            borderRadius: 6,
                            backgroundColor: '#00C851',
                            marginRight: 12
                        }} />
                        <TextInput
                            style={{
                                flex: 1,
                                fontSize: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: activeSearchType === 'origin' ? '#007AFF' : '#E0E0E0',
                                paddingVertical: 8
                            }}
                            placeholder="Where from?"
                            value={currentLocation}
                            onChangeText={(text) => handleSearchInputChange(text, 'origin')}
                            onFocus={() => handleLocationInputFocus('origin')}
                        />
                    </View>
                </View>

                {/* Destination Input */}
                <View style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{
                            width: 12,
                            height: 12,
                            borderRadius: 1,
                            backgroundColor: '#FF4444',
                            marginRight: 12
                        }} />
                        <TextInput
                            style={{
                                flex: 1,
                                fontSize: 16,
                                borderBottomWidth: 1,
                                borderBottomColor: activeSearchType === 'destination' ? '#007AFF' : '#E0E0E0',
                                paddingVertical: 8
                            }}
                            placeholder="Where to?"
                            value={destination}
                            onChangeText={(text) => handleSearchInputChange(text, 'destination')}
                            onFocus={() => handleLocationInputFocus('destination')}
                        />
                    </View>
                </View>

                {isSearching && (
                    <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                        <ActivityIndicator size="small" color="#007AFF" />
                        <Text style={{ marginTop: 4, color: '#666', fontSize: 12 }}>
                            Searching...
                        </Text>
                    </View>
                )}
            </View>

            {/* Search Results */}
            {renderSearchResults()}

            {/* Ride Options and Confirm Button */}
            {isExpanded && !activeSearchType && (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={{
                        paddingHorizontal: 24,
                        paddingTop: 8,
                    }}
                    scrollEnabled={isScrollEnabled}
                    showsVerticalScrollIndicator={true}
                    bounces={true}
                    scrollEventThrottle={16}
                    nestedScrollEnabled={true}
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
                        isEnabled={Boolean(selectedOrigin && selectedDestination && selectedRide)}
                        onPress={handleConfirmPress}
                    />
                </ScrollView>
            )}
        </AnimatedView>
    );
};