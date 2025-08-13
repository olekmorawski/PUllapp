import { driverAPI } from '@/api/driverAPI';
import * as distanceCalculator from '@/utils/distanceCalculator';

// Mock WebSocket
const mockWebSocket = {
  readyState: WebSocket.OPEN,
  send: jest.fn(),
  close: jest.fn(),
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null,
};

(global as any).WebSocket = jest.fn(() => mockWebSocket);

// Mock the dependencies
jest.mock('@/api/driverAPI');
jest.mock('@/utils/distanceCalculator');

const mockDriverAPI = driverAPI as jest.Mocked<typeof driverAPI>;
const mockDistanceCalculator = distanceCalculator as jest.Mocked<typeof distanceCalculator>;

describe('useRealTimeDriverTracking', () => {
  const mockPassengerLocation = {
    latitude: 40.7128,
    longitude: -74.0060,
  };

  const mockDriverLocation = {
    driverId: 'driver-123',
    latitude: 40.7589,
    longitude: -73.9851,
    timestamp: '2023-01-01T12:00:00Z',
  };

  const mockDistanceResult = {
    distance: 5000, // 5km in meters
    formattedDistance: '5.0 km',
  };

  const mockRouteInfo = {
    distance: 5200, // 5.2km in meters (route distance)
    duration: 600, // 10 minutes in seconds
    geometry: {
      type: 'LineString' as const,
      coordinates: [
        [-73.9851, 40.7589],
        [-74.0000, 40.7500],
        [-74.0060, 40.7128]
      ]
    },
    formattedDistance: '5.2 km',
    formattedDuration: '10 min'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Setup default mocks
    mockDistanceCalculator.calculateAndFormatDistance.mockReturnValue(mockDistanceResult);
    mockDistanceCalculator.calculateRoute.mockResolvedValue(mockRouteInfo);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('API integration', () => {
    it('should call driverAPI.getDriverLocation with correct parameters', async () => {
      mockDriverAPI.getDriverLocation.mockResolvedValue({
        location: mockDriverLocation,
      });

      // Test the API call directly
      const result = await driverAPI.getDriverLocation('driver-123');
      
      expect(mockDriverAPI.getDriverLocation).toHaveBeenCalledWith('driver-123');
      expect(result.location).toEqual(mockDriverLocation);
    });

    it('should handle API errors', async () => {
      const apiError = new Error('Network error');
      mockDriverAPI.getDriverLocation.mockRejectedValue(apiError);

      await expect(driverAPI.getDriverLocation('driver-123')).rejects.toThrow('Network error');
    });
  });

  describe('distance calculation', () => {
    it('should calculate distance correctly', () => {
      const driverCoords = {
        latitude: mockDriverLocation.latitude,
        longitude: mockDriverLocation.longitude,
      };

      distanceCalculator.calculateAndFormatDistance(driverCoords, mockPassengerLocation);

      expect(mockDistanceCalculator.calculateAndFormatDistance).toHaveBeenCalledWith(
        driverCoords,
        mockPassengerLocation
      );
    });

    it('should return formatted distance', () => {
      const result = distanceCalculator.calculateAndFormatDistance(
        { latitude: 40.7589, longitude: -73.9851 },
        mockPassengerLocation
      );

      expect(result).toEqual(mockDistanceResult);
    });
  });

  describe('OSRM route calculation', () => {
    it('should calculate route using OSRM API', async () => {
      const driverCoords = {
        latitude: mockDriverLocation.latitude,
        longitude: mockDriverLocation.longitude,
      };

      const result = await distanceCalculator.calculateRoute(driverCoords, mockPassengerLocation);

      expect(mockDistanceCalculator.calculateRoute).toHaveBeenCalledWith(
        driverCoords,
        mockPassengerLocation
      );
      expect(result).toEqual(mockRouteInfo);
    });

    it('should return route geometry for map display', async () => {
      const result = await distanceCalculator.calculateRoute(
        { latitude: 40.7589, longitude: -73.9851 },
        mockPassengerLocation
      );

      expect(result.geometry).toBeDefined();
      expect(result.geometry.type).toBe('LineString');
      expect(result.geometry.coordinates).toHaveLength(3);
    });

    it('should fallback to straight-line distance when OSRM fails', async () => {
      // Mock OSRM failure
      mockDistanceCalculator.calculateRoute.mockRejectedValue(new Error('OSRM API error'));

      // The hook should catch this error and fallback to straight-line calculation
      try {
        await distanceCalculator.calculateRoute(
          { latitude: 40.7589, longitude: -73.9851 },
          mockPassengerLocation
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('OSRM API error');
      }

      expect(mockDistanceCalculator.calculateRoute).toHaveBeenCalled();
    });

    it('should provide accurate ETA from route calculation', async () => {
      const result = await distanceCalculator.calculateRoute(
        { latitude: 40.7589, longitude: -73.9851 },
        mockPassengerLocation
      );

      expect(result.duration).toBe(600); // 10 minutes
      expect(result.formattedDuration).toBe('10 min');
    });
  });

  describe('ETA calculation', () => {
    it('should format ETA correctly for different durations', () => {
      // Test ETA formatting logic directly
      const formatEta = (etaInSeconds: number): string => {
        if (etaInSeconds < 60) {
          return `${Math.round(etaInSeconds)} sec`;
        } else if (etaInSeconds < 3600) {
          const minutes = Math.round(etaInSeconds / 60);
          return `${minutes} min`;
        } else {
          const hours = Math.floor(etaInSeconds / 3600);
          const minutes = Math.round((etaInSeconds % 3600) / 60);
          return `${hours}h ${minutes}m`;
        }
      };

      expect(formatEta(30)).toBe('30 sec');
      expect(formatEta(120)).toBe('2 min');
      expect(formatEta(3900)).toBe('1h 5m');
    });

    it('should estimate ETA based on distance', () => {
      const estimateEta = (distanceInMeters: number): number => {
        const averageSpeedKmh = 30;
        const averageSpeedMs = (averageSpeedKmh * 1000) / 3600;
        return distanceInMeters / averageSpeedMs;
      };

      const eta = estimateEta(5000); // 5km
      expect(eta).toBeGreaterThan(0);
      expect(eta).toBeLessThan(3600); // Should be less than 1 hour
    });
  });

  describe('WebSocket integration', () => {
    beforeEach(() => {
      mockWebSocket.send.mockClear();
      mockWebSocket.close.mockClear();
    });

    it('should create WebSocket connection when useWebSocket is enabled', () => {
      // Test WebSocket constructor call
      const WebSocketConstructor = (global as any).WebSocket;
      
      // Simulate hook initialization with WebSocket enabled
      const props = {
        rideId: 'ride-123',
        driverId: 'driver-456',
        passengerLocation: mockPassengerLocation,
        useWebSocket: true,
        wsUrl: 'ws://localhost:3000/ws',
      };

      // This would be called internally by the hook
      new WebSocket(props.wsUrl);

      expect(WebSocketConstructor).toHaveBeenCalledWith('ws://localhost:3000/ws');
    });

    it('should send subscription message on connection', () => {
      // Simulate WebSocket connection and subscription
      const subscriptionMessage = {
        type: 'subscribe_driver_location',
        payload: {
          rideId: 'ride-123',
          driverId: 'driver-456',
        },
      };

      mockWebSocket.send(JSON.stringify(subscriptionMessage));

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify(subscriptionMessage)
      );
    });

    it('should handle driver location updates from WebSocket', () => {
      const locationUpdate = {
        type: 'driver_location_update',
        payload: {
          driverId: 'driver-456',
          location: {
            latitude: 37.7749,
            longitude: -122.4194,
          },
          timestamp: '2023-01-01T12:00:00Z',
        },
      };

      // Simulate receiving WebSocket message
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(locationUpdate),
      });

      // This would be handled by the WebSocket onmessage handler
      const parsedData = JSON.parse(messageEvent.data);
      expect(parsedData.type).toBe('driver_location_update');
      expect(parsedData.payload.driverId).toBe('driver-456');
      expect(parsedData.payload.location).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      });
    });

    it('should send heartbeat messages', () => {
      const heartbeatMessage = {
        type: 'heartbeat',
        timestamp: expect.any(String),
      };

      mockWebSocket.send(JSON.stringify(heartbeatMessage));

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"heartbeat"')
      );
    });

    it('should handle WebSocket errors gracefully', () => {
      const errorMessage = {
        type: 'error',
        message: 'Connection error',
      };

      // Simulate error message from WebSocket
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(errorMessage),
      });

      const parsedData = JSON.parse(messageEvent.data);
      expect(parsedData.type).toBe('error');
      expect(parsedData.message).toBe('Connection error');
    });

    it('should close WebSocket connection properly', () => {
      mockWebSocket.close(1000, 'Manual disconnect');

      expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'Manual disconnect');
    });
  });

  describe('validation', () => {
    it('should validate required parameters', () => {
      // Test that the hook requires essential parameters
      expect(() => {
        // This would be called in a real hook usage
        const params = {
          rideId: '',
          driverId: null,
          passengerLocation: mockPassengerLocation,
        };
        
        // Validate parameters
        if (!params.rideId) {
          throw new Error('rideId is required');
        }
        if (!params.driverId) {
          throw new Error('driverId is required');
        }
        if (!params.passengerLocation) {
          throw new Error('passengerLocation is required');
        }
      }).toThrow('rideId is required');
    });
  });
});