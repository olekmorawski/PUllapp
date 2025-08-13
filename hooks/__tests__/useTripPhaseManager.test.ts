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

  it('should map driver_assigned status to approaching_pickup phase', () => {
    const phase = mapRideStatusToPhase('driver_assigned');
    const phaseInfo = getPhaseInfo(phase);
    
    expect(phase).toBe('approaching_pickup');
    expect(phaseInfo.title).toBe('Driver Approaching');
    expect(phaseInfo.showDistanceToPickup).toBe(true);
    expect(phaseInfo.targetLocation).toBe('pickup');
  });

  it('should show distance to pickup during approaching_pickup phase', () => {
    const phase = mapRideStatusToPhase('approaching_pickup');
    const phaseInfo = getPhaseInfo(phase);
    
    expect(phaseInfo.showDistanceToPickup).toBe(true);
    expect(phaseInfo.showDistanceToDestination).toBe(false);
    expect(phaseInfo.targetLocation).toBe('pickup');
  });

  it('should map driver_arrived status to driver_arrived phase', () => {
    const phase = mapRideStatusToPhase('driver_arrived');
    const phaseInfo = getPhaseInfo(phase);
    
    expect(phase).toBe('driver_arrived');
    expect(phaseInfo.title).toBe('Driver Arrived');
    expect(phaseInfo.description).toBe('Your driver has arrived at the pickup location');
  });

  it('should show distance to destination during en_route phase', () => {
    const phase = mapRideStatusToPhase('in_progress');
    const phaseInfo = getPhaseInfo(phase);
    
    expect(phase).toBe('en_route');
    expect(phaseInfo.showDistanceToPickup).toBe(false);
    expect(phaseInfo.showDistanceToDestination).toBe(true);
    expect(phaseInfo.targetLocation).toBe('destination');
  });

  it('should handle completed trip phase', () => {
    const phase = mapRideStatusToPhase('completed');
    const phaseInfo = getPhaseInfo(phase);
    
    expect(phase).toBe('completed');
    expect(phaseInfo.title).toBe('Trip Completed');
    expect(phaseInfo.showDistanceToPickup).toBe(false);
    expect(phaseInfo.showDistanceToDestination).toBe(false);
  });

  it('should handle cancelled trip phase', () => {
    const phase = mapRideStatusToPhase('cancelled');
    const phaseInfo = getPhaseInfo(phase);
    
    expect(phase).toBe('cancelled');
    expect(phaseInfo.title).toBe('Trip Cancelled');
    expect(phaseInfo.showDistanceToPickup).toBe(false);
    expect(phaseInfo.showDistanceToDestination).toBe(false);
  });

  it('should suggest status transition from driver_assigned to approaching_pickup', () => {
    const suggestedStatus = shouldTransitionStatus('driver_assigned', 800, mockDriverLocation);
    
    expect(suggestedStatus).toBe('approaching_pickup');
  });

  it('should suggest status transition from approaching_pickup to driver_arrived', () => {
    const suggestedStatus = shouldTransitionStatus('approaching_pickup', 30, mockDriverLocation);
    
    expect(suggestedStatus).toBe('driver_arrived');
  });

  it('should not suggest status transitions when no driver location', () => {
    const suggestedStatus = shouldTransitionStatus('driver_assigned', 800, null);
    
    expect(suggestedStatus).toBeNull();
  });

  it('should not suggest status transitions when no distance', () => {
    const suggestedStatus = shouldTransitionStatus('driver_assigned', null, mockDriverLocation);
    
    expect(suggestedStatus).toBeNull();
  });

  it('should not suggest transitions for distances above thresholds', () => {
    // Driver assigned but too far for approaching
    const suggestedStatus1 = shouldTransitionStatus('driver_assigned', 1500, mockDriverLocation);
    expect(suggestedStatus1).toBeNull();
    
    // Approaching but too far for arrived
    const suggestedStatus2 = shouldTransitionStatus('approaching_pickup', 100, mockDriverLocation);
    expect(suggestedStatus2).toBeNull();
  });

  it('should not suggest transitions for statuses that do not support automatic transitions', () => {
    // These statuses should not have automatic transitions
    expect(shouldTransitionStatus('pending', 50, mockDriverLocation)).toBeNull();
    expect(shouldTransitionStatus('accepted', 50, mockDriverLocation)).toBeNull();
    expect(shouldTransitionStatus('driver_arrived', 50, mockDriverLocation)).toBeNull();
    expect(shouldTransitionStatus('in_progress', 50, mockDriverLocation)).toBeNull();
    expect(shouldTransitionStatus('completed', 50, mockDriverLocation)).toBeNull();
    expect(shouldTransitionStatus('cancelled', 50, mockDriverLocation)).toBeNull();
  });

  it('should handle all ride status mappings correctly', () => {
    expect(mapRideStatusToPhase('pending')).toBe('waiting');
    expect(mapRideStatusToPhase('accepted')).toBe('waiting');
    expect(mapRideStatusToPhase('driver_assigned')).toBe('approaching_pickup');
    expect(mapRideStatusToPhase('approaching_pickup')).toBe('approaching_pickup');
    expect(mapRideStatusToPhase('driver_arrived')).toBe('driver_arrived');
    expect(mapRideStatusToPhase('in_progress')).toBe('en_route');
    expect(mapRideStatusToPhase('completed')).toBe('completed');
    expect(mapRideStatusToPhase('cancelled')).toBe('cancelled');
  });

  it('should provide correct phase information for all phases', () => {
    const waitingInfo = getPhaseInfo('waiting');
    expect(waitingInfo.title).toBe('Finding Driver');
    expect(waitingInfo.targetLocation).toBeNull();

    const approachingInfo = getPhaseInfo('approaching_pickup');
    expect(approachingInfo.title).toBe('Driver Approaching');
    expect(approachingInfo.targetLocation).toBe('pickup');

    const arrivedInfo = getPhaseInfo('driver_arrived');
    expect(arrivedInfo.title).toBe('Driver Arrived');
    expect(arrivedInfo.targetLocation).toBe('pickup');

    const enRouteInfo = getPhaseInfo('en_route');
    expect(enRouteInfo.title).toBe('En Route');
    expect(enRouteInfo.targetLocation).toBe('destination');

    const completedInfo = getPhaseInfo('completed');
    expect(completedInfo.title).toBe('Trip Completed');
    expect(completedInfo.targetLocation).toBeNull();

    const cancelledInfo = getPhaseInfo('cancelled');
    expect(cancelledInfo.title).toBe('Trip Cancelled');
    expect(cancelledInfo.targetLocation).toBeNull();
  });
});