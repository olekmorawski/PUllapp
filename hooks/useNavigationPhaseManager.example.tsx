import React, { useState, useCallback } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { useNavigationPhaseManager } from './useNavigationPhaseManager';
import { NavigationPhase } from '@/hooks/navigation/types';

/**
 * Example usage of useNavigationPhaseManager hook
 * 
 * This example demonstrates how to integrate the navigation phase manager
 * with a driver navigation screen, including proper callback handling
 * for route management, geofencing, and voice guidance.
 */

interface ExampleNavigationScreenProps {
  rideId: string;
  pickupLocation: { latitude: number; longitude: number };
  destinationLocation: { latitude: number; longitude: number };
}

export const ExampleNavigationScreen: React.FC<ExampleNavigationScreenProps> = ({
  rideId,
  pickupLocation,
  destinationLocation,
}) => {
  // Mock driver location (in real app, this would come from location service)
  const [driverLocation, setDriverLocation] = useState({
    latitude: 40.7128,
    longitude: -74.0060,
  });

  // Mock navigation state
  const [hasActiveRoute, setHasActiveRoute] = useState(false);
  const [isNavigationActive, setIsNavigationActive] = useState(false);

  // Navigation integration callbacks
  const handleRouteCleared = useCallback(() => {
    console.log('🧹 Route cleared - stopping current navigation');
    setHasActiveRoute(false);
    setIsNavigationActive(false);
    // In real app: call navigation.clearRoute()
  }, []);

  const handleRouteCalculationRequested = useCallback(async (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ) => {
    console.log('🗺️ Calculating route from', origin, 'to', destination);
    // In real app: call navigation.calculateRoute(origin, destination)
    
    // Simulate async route calculation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setHasActiveRoute(true);
    console.log('✅ Route calculated successfully');
  }, []);

  const handleNavigationRestarted = useCallback(async (
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number }
  ) => {
    console.log('🚀 Restarting navigation from', origin, 'to', destination);
    // In real app: call navigation.restartNavigation(origin, destination)
    
    // Simulate async navigation restart
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsNavigationActive(true);
    console.log('✅ Navigation restarted successfully');
  }, []);

  const handleGeofenceUpdated = useCallback((showPickup: boolean, showDestination: boolean) => {
    console.log('🎯 Updating geofences - pickup:', showPickup, 'destination:', showDestination);
    // In real app: update map geofence visibility
  }, []);

  const handleCameraUpdated = useCallback((mode: 'center_on_driver' | 'show_full_route' | 'follow_navigation' | 'manual') => {
    console.log('📷 Updating camera mode to:', mode);
    // In real app: update map camera
  }, []);

  const handleVoiceGuidanceCleared = useCallback(() => {
    console.log('🔇 Clearing voice guidance');
    // In real app: stop current voice guidance
  }, []);

  const handleVoiceInstructionAnnounced = useCallback((message: string) => {
    console.log('🗣️ Announcing:', message);
    // In real app: use text-to-speech to announce message
    Alert.alert('Voice Guidance', message);
  }, []);

  // Phase change callbacks
  const handlePhaseChange = useCallback((fromPhase: NavigationPhase, toPhase: NavigationPhase) => {
    console.log(`📍 Phase changed: ${fromPhase} → ${toPhase}`);
    // In real app: update UI based on new phase
  }, []);

  const handleTransitionStart = useCallback((fromPhase: NavigationPhase, toPhase: NavigationPhase) => {
    console.log(`🔄 Starting transition: ${fromPhase} → ${toPhase}`);
    // In real app: show loading indicator
  }, []);

  const handleTransitionComplete = useCallback((result: any) => {
    console.log('✅ Transition completed:', result);
    // In real app: hide loading indicator, update UI
  }, []);

  const handleTransitionError = useCallback((error: string, result: any) => {
    console.error('❌ Transition failed:', error, result);
    Alert.alert('Navigation Error', error);
  }, []);

  // Initialize navigation phase manager
  const {
    currentPhase,
    previousPhase,
    isTransitioning,
    transitionProgress,
    error,
    transitionToPhase,
    retryLastTransition,
    forcePhaseChange,
    clearError,
    canTransitionTo,
    getValidNextPhases,
    getTransitionDescription,
  } = useNavigationPhaseManager({
    initialPhase: 'to-pickup',
    driverLocation,
    pickupLocation,
    destinationLocation,
    hasActiveRoute,
    isNavigationActive,
    // Navigation integration
    onRouteCleared: handleRouteCleared,
    onRouteCalculationRequested: handleRouteCalculationRequested,
    onNavigationRestarted: handleNavigationRestarted,
    onGeofenceUpdated: handleGeofenceUpdated,
    onCameraUpdated: handleCameraUpdated,
    onVoiceGuidanceCleared: handleVoiceGuidanceCleared,
    onVoiceInstructionAnnounced: handleVoiceInstructionAnnounced,
    // Phase change callbacks
    onPhaseChange: handlePhaseChange,
    onTransitionStart: handleTransitionStart,
    onTransitionComplete: handleTransitionComplete,
    onTransitionError: handleTransitionError,
  });

  const validNextPhases = getValidNextPhases();

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
        Navigation Phase Manager Example
      </Text>

      {/* Current State */}
      <View style={{ marginBottom: 20, padding: 15, backgroundColor: '#f0f0f0', borderRadius: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>Current State</Text>
        <Text>Phase: {currentPhase}</Text>
        <Text>Previous Phase: {previousPhase || 'None'}</Text>
        <Text>Transitioning: {isTransitioning ? 'Yes' : 'No'}</Text>
        {isTransitioning && <Text>Progress: {transitionProgress}%</Text>}
        <Text>Has Active Route: {hasActiveRoute ? 'Yes' : 'No'}</Text>
        <Text>Navigation Active: {isNavigationActive ? 'Yes' : 'No'}</Text>
      </View>

      {/* Error Display */}
      {error && (
        <View style={{ marginBottom: 20, padding: 15, backgroundColor: '#ffebee', borderRadius: 8 }}>
          <Text style={{ color: '#d32f2f', fontWeight: 'bold' }}>Error:</Text>
          <Text style={{ color: '#d32f2f' }}>{error}</Text>
          <Button title="Clear Error" onPress={clearError} />
        </View>
      )}

      {/* Phase Transition Buttons */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          Available Transitions
        </Text>
        {validNextPhases.map((phase) => (
          <View key={phase} style={{ marginBottom: 10 }}>
            <Button
              title={`Transition to ${phase}`}
              onPress={() => transitionToPhase(phase)}
              disabled={isTransitioning || !canTransitionTo(phase)}
            />
            <Text style={{ fontSize: 12, color: '#666', marginTop: 5 }}>
              {getTransitionDescription(phase)}
            </Text>
          </View>
        ))}
      </View>

      {/* Utility Buttons */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
          Utilities
        </Text>
        
        <View style={{ marginBottom: 10 }}>
          <Button
            title="Retry Last Transition"
            onPress={retryLastTransition}
            disabled={isTransitioning || !error}
          />
        </View>

        <View style={{ marginBottom: 10 }}>
          <Button
            title="Force Complete (Emergency)"
            onPress={() => forcePhaseChange('completed')}
            disabled={isTransitioning}
            color="#ff9800"
          />
        </View>

        <View style={{ marginBottom: 10 }}>
          <Button
            title="Simulate Driver Movement"
            onPress={() => {
              // Simulate driver moving closer to pickup
              setDriverLocation({
                latitude: pickupLocation.latitude + (Math.random() - 0.5) * 0.001,
                longitude: pickupLocation.longitude + (Math.random() - 0.5) * 0.001,
              });
            }}
            color="#4caf50"
          />
        </View>
      </View>

      {/* Phase Information */}
      <View style={{ padding: 15, backgroundColor: '#e3f2fd', borderRadius: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Phase Information
        </Text>
        <Text>Ride ID: {rideId}</Text>
        <Text>Pickup: {pickupLocation.latitude.toFixed(4)}, {pickupLocation.longitude.toFixed(4)}</Text>
        <Text>Destination: {destinationLocation.latitude.toFixed(4)}, {destinationLocation.longitude.toFixed(4)}</Text>
        <Text>Driver: {driverLocation.latitude.toFixed(4)}, {driverLocation.longitude.toFixed(4)}</Text>
      </View>
    </View>
  );
};

// Example usage in a parent component
export const ExampleApp: React.FC = () => {
  return (
    <ExampleNavigationScreen
      rideId="example-ride-123"
      pickupLocation={{ latitude: 40.7589, longitude: -73.9851 }}
      destinationLocation={{ latitude: 40.6892, longitude: -74.0445 }}
    />
  );
};

export default ExampleApp;