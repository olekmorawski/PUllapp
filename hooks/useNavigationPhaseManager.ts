import { useState, useEffect, useCallback, useRef } from 'react';
import { NavigationPhase } from '@/hooks/navigation/types';
import {
  TransitionAction,
  TransitionResult,
  TransitionContext,
  PhaseTransitionConfig,
  isValidTransition,
  getTransitionConfig,
  validateTransitionContext,
  createTransitionContext,
  getTransitionDescription,
} from '@/utils/navigationPhaseTransitions';
import {
  NavigationTransitionExecutor,
  createDefaultTransitionExecutor,
  ActionExecutor,
} from '@/utils/navigationTransitionExecutor';

/**
 * Navigation Phase Manager Hook
 * 
 * Manages driver navigation phase transitions with proper state management,
 * async handling, validation, and rollback mechanisms. This hook is specifically
 * designed for the driver navigation screen to handle transitions between
 * pickup and destination phases with proper route clearing and recalculation.
 * 
 * Requirements addressed: 1.1, 1.2, 1.4, 5.4
 */

export interface NavigationPhaseManagerProps {
  initialPhase?: NavigationPhase;
  driverLocation?: { latitude: number; longitude: number };
  pickupLocation?: { latitude: number; longitude: number };
  destinationLocation?: { latitude: number; longitude: number };
  hasActiveRoute?: boolean;
  isNavigationActive?: boolean;
  // Navigation integration callbacks
  onRouteCleared?: () => void;
  onRouteCalculationRequested?: (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) => Promise<void>;
  onNavigationRestarted?: (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) => Promise<void>;
  onGeofenceUpdated?: (showPickup: boolean, showDestination: boolean) => void;
  onCameraUpdated?: (mode: 'center_on_driver' | 'show_full_route' | 'follow_navigation' | 'manual') => void;
  onVoiceGuidanceCleared?: () => void;
  onVoiceInstructionAnnounced?: (message: string) => void;
  // Phase change callbacks
  onPhaseChange?: (fromPhase: NavigationPhase, toPhase: NavigationPhase) => void;
  onTransitionStart?: (fromPhase: NavigationPhase, toPhase: NavigationPhase) => void;
  onTransitionComplete?: (result: TransitionResult) => void;
  onTransitionError?: (error: string, result: TransitionResult) => void;
  // Custom action executor (optional)
  actionExecutor?: ActionExecutor;
}

export interface NavigationPhaseManagerReturn {
  // Current state
  currentPhase: NavigationPhase;
  previousPhase: NavigationPhase | null;
  isTransitioning: boolean;
  transitionProgress: number;
  lastTransitionResult: TransitionResult | null;
  error: string | null;
  
  // Actions
  transitionToPhase: (newPhase: NavigationPhase) => Promise<TransitionResult>;
  retryLastTransition: () => Promise<TransitionResult>;
  forcePhaseChange: (newPhase: NavigationPhase) => void;
  clearError: () => void;
  
  // Utilities
  canTransitionTo: (targetPhase: NavigationPhase) => boolean;
  getValidNextPhases: () => NavigationPhase[];
  getTransitionDescription: (targetPhase: NavigationPhase) => string;
  
  // Cleanup
  cleanup: () => void;
}

// Default action executor that integrates with navigation system callbacks
const createNavigationActionExecutor = (callbacks: {
  onRouteCleared?: () => void;
  onRouteCalculationRequested?: (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) => Promise<void>;
  onNavigationRestarted?: (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) => Promise<void>;
  onGeofenceUpdated?: (showPickup: boolean, showDestination: boolean) => void;
  onCameraUpdated?: (mode: 'center_on_driver' | 'show_full_route' | 'follow_navigation' | 'manual') => void;
  onVoiceGuidanceCleared?: () => void;
  onVoiceInstructionAnnounced?: (message: string) => void;
}): ActionExecutor => {
  return async (action: TransitionAction, context: TransitionContext) => {
    console.log(`🔧 Executing navigation action: ${action.type}`, action.payload);
    
    switch (action.type) {
      case 'CLEAR_ROUTE':
        console.log('📍 Clearing route for phase transition');
        callbacks.onRouteCleared?.();
        break;
        
      case 'CALCULATE_ROUTE':
        console.log('🗺️ Calculating route for phase transition');
        if (action.payload?.type === 'pickup_to_destination' && context.pickupLocation && context.destinationLocation) {
          await callbacks.onRouteCalculationRequested?.(context.pickupLocation, context.destinationLocation);
        } else if (context.driverLocation && context.pickupLocation && action.payload?.type !== 'pickup_to_destination') {
          await callbacks.onRouteCalculationRequested?.(context.driverLocation, context.pickupLocation);
        } else {
          console.warn('⚠️ Cannot calculate route: missing location data');
        }
        break;
        
      case 'UPDATE_GEOFENCES':
        console.log('🎯 Updating geofences for phase transition', action.payload);
        const { hidePickup, showDestination } = action.payload || {};
        callbacks.onGeofenceUpdated?.(!hidePickup, !!showDestination);
        break;
        
      case 'UPDATE_CAMERA':
        console.log('� Updatinug camera for phase transition', action.payload);
        const { mode } = action.payload || {};
        callbacks.onCameraUpdated?.(mode || 'follow_navigation');
        break;
        
      case 'RESTART_NAVIGATION':
        console.log('🚀 Restarting navigation for phase transition');
        if (context.pickupLocation && context.destinationLocation) {
          await callbacks.onNavigationRestarted?.(context.pickupLocation, context.destinationLocation);
        } else {
          console.warn('⚠️ Cannot restart navigation: missing location data');
        }
        break;
        
      case 'CLEAR_VOICE_GUIDANCE':
        console.log('🔇 Clearing voice guidance for phase transition');
        callbacks.onVoiceGuidanceCleared?.();
        break;
        
      case 'ANNOUNCE_INSTRUCTION':
        console.log('🗣️ Announcing voice instruction:', action.payload?.message);
        const { message } = action.payload || {};
        if (message) {
          callbacks.onVoiceInstructionAnnounced?.(message);
        }
        break;
        
      default:
        console.warn(`⚠️ Unknown action type: ${action.type}`);
    }
  };
};

export const useNavigationPhaseManager = ({
  initialPhase = 'to-pickup',
  driverLocation,
  pickupLocation,
  destinationLocation,
  hasActiveRoute = false,
  isNavigationActive = false,
  // Navigation integration callbacks
  onRouteCleared,
  onRouteCalculationRequested,
  onNavigationRestarted,
  onGeofenceUpdated,
  onCameraUpdated,
  onVoiceGuidanceCleared,
  onVoiceInstructionAnnounced,
  // Phase change callbacks
  onPhaseChange,
  onTransitionStart,
  onTransitionComplete,
  onTransitionError,
  // Custom action executor
  actionExecutor,
}: NavigationPhaseManagerProps): NavigationPhaseManagerReturn => {
  
  // State management
  const [currentPhase, setCurrentPhase] = useState<NavigationPhase>(initialPhase);
  const [previousPhase, setPreviousPhase] = useState<NavigationPhase | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [transitionProgress, setTransitionProgress] = useState<number>(0);
  const [lastTransitionResult, setLastTransitionResult] = useState<TransitionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cleanup and preventing concurrent transitions
  const transitionExecutorRef = useRef<NavigationTransitionExecutor | null>(null);
  const lastTransitionConfigRef = useRef<PhaseTransitionConfig | null>(null);
  const lastTransitionContextRef = useRef<TransitionContext | null>(null);
  const isCleanedUpRef = useRef<boolean>(false);
  
  // Initialize transition executor
  useEffect(() => {
    if (isCleanedUpRef.current) return;
    
    const executor = actionExecutor || createNavigationActionExecutor({
      onRouteCleared,
      onRouteCalculationRequested,
      onNavigationRestarted,
      onGeofenceUpdated,
      onCameraUpdated,
      onVoiceGuidanceCleared,
      onVoiceInstructionAnnounced,
    });
    
    transitionExecutorRef.current = createDefaultTransitionExecutor(executor, {
      timeout: 30000, // 30 seconds timeout
      retryAttempts: 2, // 2 retry attempts
      retryDelay: 1000, // 1 second delay between retries
      onTransitionProgress: (progress, total) => {
        setTransitionProgress(Math.round((progress / total) * 100));
      },
    });
    
    return () => {
      transitionExecutorRef.current = null;
    };
  }, [
    actionExecutor,
    onRouteCleared,
    onRouteCalculationRequested,
    onNavigationRestarted,
    onGeofenceUpdated,
    onCameraUpdated,
    onVoiceGuidanceCleared,
    onVoiceInstructionAnnounced,
  ]);
  
  // Clear error when phase changes
  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [currentPhase]);
  
  // Main transition function
  const transitionToPhase = useCallback(async (newPhase: NavigationPhase): Promise<TransitionResult> => {
    if (isCleanedUpRef.current) {
      throw new Error('Navigation phase manager has been cleaned up');
    }
    
    if (isTransitioning) {
      throw new Error('Another transition is already in progress');
    }
    
    if (currentPhase === newPhase) {
      console.log(`Already in phase ${newPhase}, skipping transition`);
      const result: TransitionResult = {
        success: true,
        fromPhase: currentPhase,
        toPhase: newPhase,
        executedActions: [],
      };
      return result;
    }
    
    // Validate transition
    if (!isValidTransition(currentPhase, newPhase)) {
      const errorMessage = `Invalid transition from ${currentPhase} to ${newPhase}`;
      setError(errorMessage);
      const result: TransitionResult = {
        success: false,
        fromPhase: currentPhase,
        toPhase: newPhase,
        executedActions: [],
        error: errorMessage,
      };
      setLastTransitionResult(result);
      return result;
    }
    
    // Get transition configuration
    const config = getTransitionConfig(currentPhase, newPhase);
    if (!config) {
      const errorMessage = `No transition configuration found for ${currentPhase} to ${newPhase}`;
      setError(errorMessage);
      const result: TransitionResult = {
        success: false,
        fromPhase: currentPhase,
        toPhase: newPhase,
        executedActions: [],
        error: errorMessage,
      };
      setLastTransitionResult(result);
      return result;
    }
    
    // Create transition context
    const context = createTransitionContext(currentPhase, newPhase, {
      driverLocation,
      pickupLocation,
      destinationLocation,
      hasActiveRoute,
      isNavigationActive,
    });
    
    // Validate context
    const validation = validateTransitionContext(config, context);
    if (!validation.valid) {
      const errorMessage = validation.error || 'Context validation failed';
      setError(errorMessage);
      const result: TransitionResult = {
        success: false,
        fromPhase: currentPhase,
        toPhase: newPhase,
        executedActions: [],
        error: errorMessage,
      };
      setLastTransitionResult(result);
      return result;
    }
    
    // Store for potential retry
    lastTransitionConfigRef.current = config;
    lastTransitionContextRef.current = context;
    
    // Start transition
    setIsTransitioning(true);
    setTransitionProgress(0);
    setError(null);
    
    console.log(`🔄 Starting phase transition: ${currentPhase} -> ${newPhase}`);
    console.log(`📝 Transition description: ${getTransitionDescription(currentPhase, newPhase)}`);
    
    onTransitionStart?.(currentPhase, newPhase);
    
    try {
      if (!transitionExecutorRef.current) {
        throw new Error('Transition executor not initialized');
      }
      
      // Execute the transition
      const result = await transitionExecutorRef.current.executeTransition(config, context);
      
      setLastTransitionResult(result);
      
      if (result.success) {
        // Update phase state
        setPreviousPhase(currentPhase);
        setCurrentPhase(newPhase);
        
        console.log(`✅ Phase transition completed: ${currentPhase} -> ${newPhase}`);
        onPhaseChange?.(currentPhase, newPhase);
        onTransitionComplete?.(result);
      } else {
        // Transition failed
        const errorMessage = result.error || 'Transition failed';
        setError(errorMessage);
        console.error(`❌ Phase transition failed: ${currentPhase} -> ${newPhase}`, errorMessage);
        onTransitionError?.(errorMessage, result);
      }
      
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown transition error';
      setError(errorMessage);
      
      const result: TransitionResult = {
        success: false,
        fromPhase: currentPhase,
        toPhase: newPhase,
        executedActions: [],
        error: errorMessage,
      };
      
      setLastTransitionResult(result);
      console.error(`❌ Phase transition error: ${currentPhase} -> ${newPhase}`, error);
      onTransitionError?.(errorMessage, result);
      
      return result;
      
    } finally {
      setIsTransitioning(false);
      setTransitionProgress(0);
    }
  }, [
    currentPhase,
    isTransitioning,
    driverLocation,
    pickupLocation,
    destinationLocation,
    hasActiveRoute,
    isNavigationActive,
    onPhaseChange,
    onTransitionStart,
    onTransitionComplete,
    onTransitionError,
  ]);
  
  // Retry last failed transition
  const retryLastTransition = useCallback(async (): Promise<TransitionResult> => {
    if (isCleanedUpRef.current) {
      throw new Error('Navigation phase manager has been cleaned up');
    }
    
    if (!lastTransitionConfigRef.current || !lastTransitionContextRef.current) {
      throw new Error('No previous transition to retry');
    }
    
    if (isTransitioning) {
      throw new Error('Another transition is already in progress');
    }
    
    console.log('🔄 Retrying last transition');
    
    const config = lastTransitionConfigRef.current;
    const context = lastTransitionContextRef.current;
    
    // Update context with current state
    const updatedContext = createTransitionContext(context.currentPhase, context.targetPhase, {
      driverLocation,
      pickupLocation,
      destinationLocation,
      hasActiveRoute,
      isNavigationActive,
    });
    
    return transitionToPhase(context.targetPhase);
  }, [
    isTransitioning,
    driverLocation,
    pickupLocation,
    destinationLocation,
    hasActiveRoute,
    isNavigationActive,
    transitionToPhase,
  ]);
  
  // Force phase change without transition (emergency use)
  const forcePhaseChange = useCallback((newPhase: NavigationPhase): void => {
    if (isCleanedUpRef.current) return;
    
    console.warn(`⚠️ Force changing phase from ${currentPhase} to ${newPhase} without transition`);
    setPreviousPhase(currentPhase);
    setCurrentPhase(newPhase);
    setError(null);
    onPhaseChange?.(currentPhase, newPhase);
  }, [currentPhase, onPhaseChange]);
  
  // Clear error state
  const clearError = useCallback((): void => {
    setError(null);
  }, []);
  
  // Check if transition to target phase is valid
  const canTransitionTo = useCallback((targetPhase: NavigationPhase): boolean => {
    return isValidTransition(currentPhase, targetPhase);
  }, [currentPhase]);
  
  // Get all valid next phases
  const getValidNextPhases = useCallback((): NavigationPhase[] => {
    const validTransitions: Record<NavigationPhase, NavigationPhase[]> = {
      'to-pickup': ['at-pickup', 'completed'],
      'at-pickup': ['picking-up', 'completed'],
      'picking-up': ['to-destination', 'completed'],
      'to-destination': ['at-destination', 'completed'],
      'at-destination': ['completed'],
      'completed': [],
    };
    
    return validTransitions[currentPhase] || [];
  }, [currentPhase]);
  
  // Get transition description
  const getTransitionDescriptionForPhase = useCallback((targetPhase: NavigationPhase): string => {
    return getTransitionDescription(currentPhase, targetPhase);
  }, [currentPhase]);
  
  // Cleanup function
  const cleanup = useCallback((): void => {
    console.log('🧹 Cleaning up navigation phase manager');
    
    isCleanedUpRef.current = true;
    
    // Stop any ongoing transitions
    if (isTransitioning) {
      setIsTransitioning(false);
      setTransitionProgress(0);
    }
    
    // Clear refs
    transitionExecutorRef.current = null;
    lastTransitionConfigRef.current = null;
    lastTransitionContextRef.current = null;
    
    // Reset state
    setError(null);
    setLastTransitionResult(null);
  }, [isTransitioning]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);
  
  return {
    // Current state
    currentPhase,
    previousPhase,
    isTransitioning,
    transitionProgress,
    lastTransitionResult,
    error,
    
    // Actions
    transitionToPhase,
    retryLastTransition,
    forcePhaseChange,
    clearError,
    
    // Utilities
    canTransitionTo,
    getValidNextPhases,
    getTransitionDescription: getTransitionDescriptionForPhase,
    
    // Cleanup
    cleanup,
  };
};