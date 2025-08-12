import { AvailableRide } from '@/api/rideAPI';
import { Coordinates } from '@/utils/distanceCalculator';

// Mock the rideAPI
jest.mock('@/api/rideAPI', () => ({
  rideAPI: {
    updateRideStatus: jest.fn(),
  },
}));

const mockRideAPI = require('@/api/rideAPI').rideAPI;

// Import the functions we want to test directly
import { 
  TripPhase, 
  TripPhaseInfo,
  UseTripPhaseManagerProps,
  UseTripPhaseManagerReturn 
} from '../useTripPhaseManager';

// Helper functions to test the logic without React hooks
function mapRideStatusToPhase(rideStatus: AvailableRide['status']): TripPhase {
  switch (rideStatus) {
    case 'pending':
    case 'accepted':
      return 'waiting';
    case 'driver_assigned':
    case 'approaching_pickup':
      return 'approaching_pickup';
    case 'driver_arrived':
      return 'driver_arrived';
    case 'in_progress':
      return 'en_route';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'waiting';
  }
}

function getPhaseInfo(phase: TripPhase): TripPhaseInfo {
  switch (phase) {
    case 'waiting':
      return {
        phase,
        title: 'Finding Driver',
        description: 'Looking for a driver to accept your ride...',
        showDistanceToPickup: false,
        showDistanceToDestination: false,
        targetLocation: null,
      };
    case 'approaching_pickup':
      return {
        phase,
        title: 'Driver Approaching',
        description: 'Your driver is on the way to pick you up',
        showDistanceToPickup: true,
        showDistanceToDestination: false,
        targetLocation: 'pickup',
      };
    case 'driver_arrived':
      return {
        phase,
        title: 'Driver Arrived',
        description: 'Your driver has arrived at the pickup location',
        showDistanceToPickup: true,
        showDistanceToDestination: false,
        targetLocation: 'pickup',
      };
    case 'en_route':
      return {
        phase,
        title: 'En Route',
        description: 'On the way to your destination',
        showDistanceToPickup: false,
        showDistanceToDestination: true,
        targetLocation: 'destination',
      };
    case 'completed':
      return {
        phase,
        title: 'Trip Completed',
        description: 'You have arrived at your destination',
        showDistanceToPickup: false,
        showDistanceToDestination: false,
        targetLocation: null,
      };
    case 'cancelled':
      return {
        phase,
        title: 'Trip Cancelled',
        description: 'This trip has been cancelled',
        showDistanceToPickup: false,
        showDistanceToDestination: false,
        targetLocation: null,
      };
    default:
      return {
        phase: 'waiting',
        title: 'Loading',
        description: 'Loading trip information...',
        showDistanceToPickup: false,
        showDistanceToDestination: false,
        targetLocation: null,
      };
  }
}

function shouldTransitionStatus(
  currentStatus: AvailableRide['status'],
  distance: number | null,
  driverLocation: Coordinates | null
): AvailableRide['status'] | null {
  if (!distance || !driverLocation) {
    return null;
  }

  const ARRIVAL_THRESHOLD = 50;
  const APPROACHING_THRESHOLD = 1000;

  switch (currentStatus) {
    case 'driver_assigned':
      if (distance <= APPROACHING_THRESHOLD) {
        return 'approaching_pickup';
      }
      break;
    case 'approaching_pickup':
      if (distance <= ARRIVAL_THRESHOLD) {
        return 'driver_arrived';
      }
      break;
    default:
      break;
  }

  return null;
}

describe('useTripPhaseManager', () => {
  const mockPickupLocation: Coordinates = { latitude: 40.7589, longitude: -73.9851 };
  const mockDestinationLocation: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
  const mockDriverLocation: Coordinates = { latitude: 40.7600, longitude: -73.9800 };

  const createMockRide = (status: AvailableRide['status']): AvailableRide => ({
    id: 'test-ride-id',
    userId: 'test-user-id',
    userEmail: 'test@example.com',
    walletAddress: 'test-wallet',
    originCoordinates: mockPickupLocation,
    destinationCoordinates: mockDestinationLocation,
    originAddress: 'Test Pickup Address',
    destinationAddress: 'Test Destination Address',
    status,
    assignedDriverId: 'test-driver-id',
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2023-01-01T00:00:00Z',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRideAPI.updateRideStatus.mockResolvedValue({ success: true });
  });

  it('should map pending ride status to waiting phase', () => {
    const phase = mapRideStatusToPhase('pending');
    const phaseInfo = getPhaseInfo(phase);
    
    expect(phase).toBe('waiting');
    expect(phaseInfo.title).toBe('Finding Driver');
    expect(phaseInfo.showDistanceToPickup).toBe(false);
    expect(phaseInfo.showDistanceToDestination).toBe(false);
  });

  it('should transition to approaching_pickup phase for driver_assigned status', () => {
    const mockRide = createMockRide('driver_assigned');
    
    const { result } = renderHook(() =>
      useTripPhaseManager({
        ride: mockRide,
        driverLocation: mockDriverLocation,
        passengerPickupLocation: mockPickupLocation,
        passengerDestinationLocation: mockDestinationLocation,
        distance: 500, // 500 meters
        enabled: true,
      })
    );

    expect(result.current.currentPhase).toBe('approaching_pickup');
    expect(result.current.phaseInfo.title).toBe('Driver Approaching');
    expect(result.current.shouldCalculateDistance).toBe(true);
    expect(result.current.targetLocation).toEqual(mockPickupLocation);
  });

  it('should show distance to pickup during approaching_pickup phase', () => {
    const mockRide = createMockRide('approaching_pickup');
    
    const { result } = renderHook(() =>
      useTripPhaseManager({
        ride: mockRide,
        driverLocation: mockDriverLocation,
        passengerPickupLocation: mockPickupLocation,
        passengerDestinationLocation: mockDestinationLocation,
        distance: 800,
        enabled: true,
      })
    );

    expect(result.current.phaseInfo.showDistanceToPickup).toBe(true);
    expect(result.current.phaseInfo.showDistanceToDestination).toBe(false);
    expect(result.current.distanceLabel).toBe('Distance to pickup');
    expect(result.current.etaLabel).toBe('ETA to pickup');
  });

  it('should transition to driver_arrived phase', () => {
    const mockRide = createMockRide('driver_arrived');
    
    const { result } = renderHook(() =>
      useTripPhaseManager({
        ride: mockRide,
        driverLocation: mockDriverLocation,
        passengerPickupLocation: mockPickupLocation,
        passengerDestinationLocation: mockDestinationLocation,
        distance: 30, // Very close
        enabled: true,
      })
    );

    expect(result.current.currentPhase).toBe('driver_arrived');
    expect(result.current.phaseInfo.title).toBe('Driver Arrived');
    expect(result.current.statusMessage).toBe('Driver has arrived at pickup location');
  });

  it('should show distance to destination during en_route phase', () => {
    const mockRide = createMockRide('in_progress');
    
    const { result } = renderHook(() =>
      useTripPhaseManager({
        ride: mockRide,
        driverLocation: mockDriverLocation,
        passengerPickupLocation: mockPickupLocation,
        passengerDestinationLocation: mockDestinationLocation,
        distance: 2000,
        enabled: true,
      })
    );

    expect(result.current.currentPhase).toBe('en_route');
    expect(result.current.phaseInfo.showDistanceToPickup).toBe(false);
    expect(result.current.phaseInfo.showDistanceToDestination).toBe(true);
    expect(result.current.targetLocation).toEqual(mockDestinationLocation);
    expect(result.current.distanceLabel).toBe('Distance to destination');
  });

  it('should handle completed trip phase', () => {
    const mockRide = createMockRide('completed');
    
    const { result } = renderHook(() =>
      useTripPhaseManager({
        ride: mockRide,
        driverLocation: mockDriverLocation,
        passengerPickupLocation: mockPickupLocation,
        passengerDestinationLocation: mockDestinationLocation,
        distance: 0,
        enabled: true,
      })
    );

    expect(result.current.currentPhase).toBe('completed');
    expect(result.current.phaseInfo.title).toBe('Trip Completed');
    expect(result.current.shouldCalculateDistance).toBe(false);
  });

  it('should handle cancelled trip phase', () => {
    const mockRide = createMockRide('cancelled');
    
    const { result } = renderHook(() =>
      useTripPhaseManager({
        ride: mockRide,
        driverLocation: mockDriverLocation,
        passengerPickupLocation: mockPickupLocation,
        passengerDestinationLocation: mockDestinationLocation,
        distance: null,
        enabled: true,
      })
    );

    expect(result.current.currentPhase).toBe('cancelled');
    expect(result.current.phaseInfo.title).toBe('Trip Cancelled');
    expect(result.current.shouldCalculateDistance).toBe(false);
  });

  it('should suggest status transition from driver_assigned to approaching_pickup', async () => {
    const mockRide = createMockRide('driver_assigned');
    
    const { result, rerender } = renderHook(() =>
      useTripPhaseManager({
        ride: mockRide,
        driverLocation: mockDriverLocation,
        passengerPickupLocation: mockPickupLocation,
        passengerDestinationLocation: mockDestinationLocation,
        distance: 800, // Within approaching threshold (1000m)
        enabled: true,
      })
    );

    // Wait for the effect to run
    await act(async () => {
      // Trigger the effect by updating the distance
      rerender();
    });

    // Should call API to update status
    expect(mockRideAPI.updateRideStatus).toHaveBeenCalledWith('test-ride-id', 'approaching_pickup');
  });

  it('should suggest status transition from approaching_pickup to driver_arrived', async () => {
    const mockRide = createMockRide('approaching_pickup');
    
    const { result, rerender } = renderHook(() =>
      useTripPhaseManager({
        ride: mockRide,
        driverLocation: mockDriverLocation,
        passengerPickupLocation: mockPickupLocation,
        passengerDestinationLocation: mockDestinationLocation,
        distance: 30, // Within arrival threshold (50m)
        enabled: true,
      })
    );

    // Wait for the effect to run
    await act(async () => {
      rerender();
    });

    // Should call API to update status
    expect(mockRideAPI.updateRideStatus).toHaveBeenCalledWith('test-ride-id', 'driver_arrived');
  });

  it('should not suggest status transitions when disabled', async () => {
    const mockRide = createMockRide('driver_assigned');
    
    const { result } = renderHook(() =>
      useTripPhaseManager({
        ride: mockRide,
        driverLocation: mockDriverLocation,
        passengerPickupLocation: mockPickupLocation,
        passengerDestinationLocation: mockDestinationLocation,
        distance: 800,
        enabled: false, // Disabled
      })
    );

    await act(async () => {
      // Wait a bit to ensure no API calls are made
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(mockRideAPI.updateRideStatus).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockRideAPI.updateRideStatus.mockRejectedValue(new Error('API Error'));
    
    const mockRide = createMockRide('driver_assigned');
    
    const { result, rerender } = renderHook(() =>
      useTripPhaseManager({
        ride: mockRide,
        driverLocation: mockDriverLocation,
        passengerPickupLocation: mockPickupLocation,
        passengerDestinationLocation: mockDestinationLocation,
        distance: 800,
        enabled: true,
      })
    );

    await act(async () => {
      rerender();
    });

    expect(consoleSpy).toHaveBeenCalledWith('❌ Error updating ride status:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  it('should generate appropriate status messages based on distance', () => {
    const mockRide = createMockRide('approaching_pickup');
    
    const { result } = renderHook(() =>
      useTripPhaseManager({
        ride: mockRide,
        driverLocation: mockDriverLocation,
        passengerPickupLocation: mockPickupLocation,
        passengerDestinationLocation: mockDestinationLocation,
        distance: 150,
        enabled: true,
      })
    );

    expect(result.current.statusMessage).toBe('Driver is 150m away');
  });

  it('should return null target location when not calculating distance', () => {
    const mockRide = createMockRide('pending');
    
    const { result } = renderHook(() =>
      useTripPhaseManager({
        ride: mockRide,
        driverLocation: null,
        passengerPickupLocation: mockPickupLocation,
        passengerDestinationLocation: mockDestinationLocation,
        distance: null,
        enabled: true,
      })
    );

    expect(result.current.targetLocation).toBeNull();
    expect(result.current.shouldCalculateDistance).toBe(false);
  });
});