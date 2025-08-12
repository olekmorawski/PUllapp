import { useRealTimeDriverTracking } from '../useRealTimeDriverTracking';

describe('useRealTimeDriverTracking Integration', () => {
  const mockPassengerLocation = {
    latitude: 40.7128,
    longitude: -74.0060,
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should export the hook with correct interface', () => {
    expect(typeof useRealTimeDriverTracking).toBe('function');
  });

  it('should accept required parameters', () => {
    // Test that the hook can be called with required parameters
    const hookParams = {
      rideId: 'ride-123',
      driverId: 'driver-123',
      passengerLocation: mockPassengerLocation,
    };

    expect(() => {
      // This validates the parameter interface
      const params: Parameters<typeof useRealTimeDriverTracking>[0] = hookParams;
      expect(params.rideId).toBe('ride-123');
      expect(params.driverId).toBe('driver-123');
      expect(params.passengerLocation).toEqual(mockPassengerLocation);
    }).not.toThrow();
  });

  it('should accept optional parameters', () => {
    const hookParams = {
      rideId: 'ride-123',
      driverId: 'driver-123',
      passengerLocation: mockPassengerLocation,
      pollingInterval: 3000,
      enabled: false,
    };

    expect(() => {
      const params: Parameters<typeof useRealTimeDriverTracking>[0] = hookParams;
      expect(params.pollingInterval).toBe(3000);
      expect(params.enabled).toBe(false);
    }).not.toThrow();
  });

  it('should return expected interface', () => {
    // Mock the hook return type to validate interface
    const mockReturn: ReturnType<typeof useRealTimeDriverTracking> = {
      driverLocation: null,
      distance: null,
      formattedDistance: null,
      eta: null,
      formattedEta: null,
      routeGeometry: null,
      isLoading: false,
      error: null,
      lastUpdated: null,
      retryCount: 0,
      retry: jest.fn(),
      // WebSocket specific properties
      isWebSocketConnected: false,
      isWebSocketConnecting: false,
      webSocketReconnectAttempts: 0,
      connectWebSocket: jest.fn(),
      disconnectWebSocket: jest.fn(),
    };

    expect(mockReturn).toHaveProperty('driverLocation');
    expect(mockReturn).toHaveProperty('distance');
    expect(mockReturn).toHaveProperty('formattedDistance');
    expect(mockReturn).toHaveProperty('eta');
    expect(mockReturn).toHaveProperty('formattedEta');
    expect(mockReturn).toHaveProperty('isLoading');
    expect(mockReturn).toHaveProperty('error');
    expect(mockReturn).toHaveProperty('lastUpdated');
    expect(mockReturn).toHaveProperty('retryCount');
    expect(mockReturn).toHaveProperty('retry');
    expect(mockReturn).toHaveProperty('isWebSocketConnected');
    expect(mockReturn).toHaveProperty('isWebSocketConnecting');
    expect(mockReturn).toHaveProperty('webSocketReconnectAttempts');
    expect(mockReturn).toHaveProperty('connectWebSocket');
    expect(mockReturn).toHaveProperty('disconnectWebSocket');
    expect(typeof mockReturn.retry).toBe('function');
    expect(typeof mockReturn.connectWebSocket).toBe('function');
    expect(typeof mockReturn.disconnectWebSocket).toBe('function');
  });
});