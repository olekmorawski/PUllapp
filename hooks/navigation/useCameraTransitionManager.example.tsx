// hooks/navigation/useCameraTransitionManager.example.tsx - Example usage of camera transition manager
import React, { useRef, useCallback } from 'react';
import { View, Button, Alert } from 'react-native';
import { NavigationMapboxMapRef } from '@/components/NavigationMapboxMap';
import { useCameraTransitionManager } from './useCameraTransitionManager';
import { NavigationPhase } from './types';

export const CameraTransitionExample: React.FC = () => {
  const mapRef = useRef<NavigationMapboxMapRef>(null);
  const [isMapReady, setIsMapReady] = React.useState(false);

  // Sample coordinates
  const driverLocation: [number, number] = [-122.4194, 37.7749]; // San Francisco
  const pickupLocation: [number, number] = [-122.4000, 37.7500]; // Near SF
  const destinationLocation: [number, number] = [-122.0822, 37.4220]; // Palo Alto

  // Initialize camera transition manager
  const cameraManager = useCameraTransitionManager({
    mapRef,
    isMapReady,
    onTransitionStart: (config) => {
      console.log('🎬 Camera transition started:', config.type);
    },
    onTransitionComplete: (result) => {
      console.log('✅ Camera transition completed:', result);
      if (!result.success) {
        Alert.alert('Transition Error', result.error || 'Unknown error');
      }
    },
    onTransitionError: (error, config) => {
      console.error('❌ Camera transition error:', error);
      Alert.alert('Camera Error', `Failed to execute ${config.type}: ${error}`);
    }
  });

  // Example: Transition to route overview (pickup to destination)
  const handleRouteOverview = useCallback(async () => {
    try {
      const result = await cameraManager.transitionToRouteOverview({
        pickupCoordinate: pickupLocation,
        destinationCoordinate: destinationLocation,
        duration: 2000,
        padding: { top: 100, bottom: 200, left: 50, right: 50 }
      });
      
      if (result.success) {
        console.log('Route overview transition completed in', result.duration, 'ms');
      }
    } catch (error) {
      console.error('Route overview failed:', error);
    }
  }, [cameraManager]);

  // Example: Transition to follow mode
  const handleFollowMode = useCallback(async () => {
    try {
      const result = await cameraManager.transitionToFollowMode(
        driverLocation,
        45 // bearing in degrees
      );
      
      if (result.success) {
        console.log('Follow mode transition completed');
      }
    } catch (error) {
      console.error('Follow mode failed:', error);
    }
  }, [cameraManager]);

  // Example: Phase-based camera transition
  const handlePhaseTransition = useCallback(async (phase: NavigationPhase) => {
    try {
      const result = await cameraManager.transitionToPhaseCamera(phase, {
        type: 'CENTER_ON_DRIVER',
        centerCoordinate: driverLocation,
        zoom: 18,
        duration: 1000
      });
      
      if (result.success) {
        console.log(`Phase transition to ${phase} completed`);
      }
    } catch (error) {
      console.error(`Phase transition to ${phase} failed:`, error);
    }
  }, [cameraManager]);

  // Example: Handle transition errors with retry
  const handleTransitionWithRetry = useCallback(async () => {
    try {
      // First attempt
      const result = await cameraManager.transitionToRouteOverview({
        pickupCoordinate: pickupLocation,
        destinationCoordinate: destinationLocation
      });
      
      if (!result.success) {
        // Handle error with fallback
        const fallbackResult = await cameraManager.handleTransitionError(
          new Error(result.error || 'Unknown error'),
          {
            type: 'ROUTE_OVERVIEW',
            coordinates: [pickupLocation, destinationLocation],
            centerCoordinate: driverLocation
          }
        );
        
        if (fallbackResult.success) {
          console.log('Fallback transition succeeded');
        } else {
          Alert.alert('Camera Error', 'All transition attempts failed');
        }
      }
    } catch (error) {
      console.error('Transition with retry failed:', error);
    }
  }, [cameraManager]);

  return (
    <View style={{ flex: 1 }}>
      {/* Your NavigationMapboxMap component would go here */}
      {/* <NavigationMapboxMap
        ref={mapRef}
        driverLocation={{ latitude: driverLocation[1], longitude: driverLocation[0] }}
        pickup={{ latitude: pickupLocation[1], longitude: pickupLocation[0] }}
        destination={{ latitude: destinationLocation[1], longitude: destinationLocation[0] }}
        onMapReady={() => setIsMapReady(true)}
      /> */}
      
      <View style={{ position: 'absolute', bottom: 50, left: 20, right: 20 }}>
        <Button
          title="Route Overview"
          onPress={handleRouteOverview}
          disabled={cameraManager.isTransitioning}
        />
        
        <Button
          title="Follow Mode"
          onPress={handleFollowMode}
          disabled={cameraManager.isTransitioning}
        />
        
        <Button
          title="To Pickup Phase"
          onPress={() => handlePhaseTransition('to-pickup')}
          disabled={cameraManager.isTransitioning}
        />
        
        <Button
          title="To Destination Phase"
          onPress={() => handlePhaseTransition('to-destination')}
          disabled={cameraManager.isTransitioning}
        />
        
        <Button
          title="Transition with Retry"
          onPress={handleTransitionWithRetry}
          disabled={cameraManager.isTransitioning}
        />
        
        {cameraManager.isTransitioning && (
          <View style={{ 
            backgroundColor: 'rgba(0,0,0,0.7)', 
            padding: 10, 
            borderRadius: 5, 
            marginTop: 10 
          }}>
            <Text style={{ color: 'white', textAlign: 'center' }}>
              Transitioning: {cameraManager.currentTransition}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Example: Integration with navigation phase manager
export const useNavigationWithCameraTransitions = () => {
  const mapRef = useRef<NavigationMapboxMapRef>(null);
  const [isMapReady, setIsMapReady] = React.useState(false);
  const [currentPhase, setCurrentPhase] = React.useState<NavigationPhase>('to-pickup');

  const cameraManager = useCameraTransitionManager({
    mapRef,
    isMapReady,
    onTransitionComplete: (result) => {
      if (result.success) {
        console.log('Phase camera transition completed');
      }
    }
  });

  // Handle phase transitions with automatic camera updates
  const transitionToPhase = useCallback(async (
    newPhase: NavigationPhase,
    pickupCoordinate?: [number, number],
    destinationCoordinate?: [number, number],
    driverLocation?: [number, number]
  ) => {
    try {
      // Update phase state
      setCurrentPhase(newPhase);

      // Determine camera transition based on phase
      let cameraConfig;
      
      switch (newPhase) {
        case 'to-destination':
          if (pickupCoordinate && destinationCoordinate) {
            // Show route overview for destination navigation
            await cameraManager.transitionToRouteOverview({
              pickupCoordinate,
              destinationCoordinate,
              duration: 2000
            });
            
            // After overview, transition to follow mode
            setTimeout(async () => {
              if (driverLocation) {
                await cameraManager.transitionToFollowMode(driverLocation);
              }
            }, 3000);
          }
          break;
          
        case 'at-pickup':
        case 'at-destination':
          // Center on driver with close zoom
          if (driverLocation) {
            await cameraManager.transitionToPhaseCamera(newPhase, {
              type: 'CENTER_ON_DRIVER',
              centerCoordinate: driverLocation,
              zoom: 19,
              pitch: 45
            });
          }
          break;
          
        case 'completed':
          // Reset to overview
          if (driverLocation) {
            await cameraManager.transitionToPhaseCamera(newPhase, {
              type: 'CENTER_ON_DRIVER',
              centerCoordinate: driverLocation,
              zoom: 16,
              pitch: 0
            });
          }
          break;
          
        default:
          // Default follow mode
          if (driverLocation) {
            await cameraManager.transitionToFollowMode(driverLocation);
          }
      }
      
    } catch (error) {
      console.error('Phase transition with camera failed:', error);
    }
  }, [cameraManager]);

  return {
    mapRef,
    currentPhase,
    cameraManager,
    transitionToPhase,
    setIsMapReady
  };
};