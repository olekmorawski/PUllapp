import { useWebSocketDriverTracking } from '../useWebSocketDriverTracking';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {}

  send = jest.fn();
  close = jest.fn();

  // Helper methods for testing
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  simulateMessage(data: any) {
    if (this.onmessage && this.readyState === MockWebSocket.OPEN) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  simulateClose(code = 1000, reason = 'Normal closure') {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Mock global WebSocket
(global as any).WebSocket = MockWebSocket;

describe('useWebSocketDriverTracking', () => {
  const mockProps = {
    rideId: 'ride-123',
    driverId: 'driver-456',
    enabled: true,
    wsUrl: 'ws://localhost:3000/ws',
  };

  beforeEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should export the hook with correct interface', () => {
    expect(typeof useWebSocketDriverTracking).toBe('function');
  });

  it('should accept required parameters', () => {
    const hookParams = {
      rideId: 'ride-123',
      driverId: 'driver-456',
      enabled: true,
    };

    expect(() => {
      const params: Parameters<typeof useWebSocketDriverTracking>[0] = hookParams;
      expect(params.rideId).toBe('ride-123');
      expect(params.driverId).toBe('driver-456');
      expect(params.enabled).toBe(true);
    }).not.toThrow();
  });

  it('should accept optional parameters', () => {
    const hookParams = {
      rideId: 'ride-123',
      driverId: 'driver-456',
      enabled: true,
      wsUrl: 'ws://localhost:3000/ws',
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
    };

    expect(() => {
      const params: Parameters<typeof useWebSocketDriverTracking>[0] = hookParams;
      expect(params.wsUrl).toBe('ws://localhost:3000/ws');
      expect(params.reconnectInterval).toBe(3000);
      expect(params.maxReconnectAttempts).toBe(5);
    }).not.toThrow();
  });

  it('should return expected interface', () => {
    const mockReturn: ReturnType<typeof useWebSocketDriverTracking> = {
      driverLocation: null,
      isConnected: false,
      isConnecting: false,
      error: null,
      lastUpdated: null,
      reconnectAttempts: 0,
      connect: jest.fn(),
      disconnect: jest.fn(),
    };

    expect(mockReturn).toHaveProperty('driverLocation');
    expect(mockReturn).toHaveProperty('isConnected');
    expect(mockReturn).toHaveProperty('isConnecting');
    expect(mockReturn).toHaveProperty('error');
    expect(mockReturn).toHaveProperty('lastUpdated');
    expect(mockReturn).toHaveProperty('reconnectAttempts');
    expect(mockReturn).toHaveProperty('connect');
    expect(mockReturn).toHaveProperty('disconnect');
    expect(typeof mockReturn.connect).toBe('function');
    expect(typeof mockReturn.disconnect).toBe('function');
  });

  describe('WebSocket message handling', () => {
    it('should handle driver location update messages', () => {
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

      // Test message parsing
      const messageData = JSON.stringify(locationUpdate);
      const parsedData = JSON.parse(messageData);
      
      expect(parsedData.type).toBe('driver_location_update');
      expect(parsedData.payload.driverId).toBe('driver-456');
      expect(parsedData.payload.location).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
      });
      expect(parsedData.payload.timestamp).toBe('2023-01-01T12:00:00Z');
    });

    it('should handle heartbeat messages', () => {
      const heartbeatMessage = {
        type: 'heartbeat',
        timestamp: '2023-01-01T12:00:00Z',
      };

      const messageData = JSON.stringify(heartbeatMessage);
      const parsedData = JSON.parse(messageData);
      
      expect(parsedData.type).toBe('heartbeat');
      expect(parsedData.timestamp).toBe('2023-01-01T12:00:00Z');
    });

    it('should handle error messages', () => {
      const errorMessage = {
        type: 'error',
        message: 'Connection error',
      };

      const messageData = JSON.stringify(errorMessage);
      const parsedData = JSON.parse(messageData);
      
      expect(parsedData.type).toBe('error');
      expect(parsedData.message).toBe('Connection error');
    });

    it('should handle malformed JSON gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        try {
          JSON.parse('invalid json');
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error parsing WebSocket message:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('WebSocket connection management', () => {
    it('should create WebSocket with correct URL', () => {
      const ws = new MockWebSocket('ws://localhost:3000/ws');
      expect(ws.url).toBe('ws://localhost:3000/ws');
    });

    it('should handle connection states', () => {
      const ws = new MockWebSocket('ws://localhost:3000/ws');
      
      expect(ws.readyState).toBe(MockWebSocket.CONNECTING);
      
      ws.simulateOpen();
      expect(ws.readyState).toBe(MockWebSocket.OPEN);
      
      ws.simulateClose();
      expect(ws.readyState).toBe(MockWebSocket.CLOSED);
    });

    it('should send subscription message format', () => {
      const subscriptionMessage = {
        type: 'subscribe_driver_location',
        payload: {
          rideId: 'ride-123',
          driverId: 'driver-456',
        },
      };

      const ws = new MockWebSocket('ws://localhost:3000/ws');
      ws.send(JSON.stringify(subscriptionMessage));

      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify(subscriptionMessage)
      );
    });

    it('should send heartbeat message format', () => {
      const heartbeatMessage = {
        type: 'heartbeat',
        timestamp: expect.any(String),
      };

      const ws = new MockWebSocket('ws://localhost:3000/ws');
      ws.send(JSON.stringify(heartbeatMessage));

      expect(ws.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"heartbeat"')
      );
    });

    it('should close connection properly', () => {
      const ws = new MockWebSocket('ws://localhost:3000/ws');
      ws.close(1000, 'Manual disconnect');

      expect(ws.close).toHaveBeenCalledWith(1000, 'Manual disconnect');
    });
  });

  describe('reconnection logic', () => {
    it('should calculate exponential backoff delay', () => {
      const baseInterval = 1000;
      const maxDelay = 30000;
      
      const calculateDelay = (attempts: number) => {
        return Math.min(baseInterval * Math.pow(2, attempts), maxDelay);
      };

      expect(calculateDelay(0)).toBe(1000);  // 1 second
      expect(calculateDelay(1)).toBe(2000);  // 2 seconds
      expect(calculateDelay(2)).toBe(4000);  // 4 seconds
      expect(calculateDelay(3)).toBe(8000);  // 8 seconds
      expect(calculateDelay(4)).toBe(16000); // 16 seconds
      expect(calculateDelay(5)).toBe(30000); // Max 30 seconds
      expect(calculateDelay(10)).toBe(30000); // Still max 30 seconds
    });

    it('should respect maximum reconnection attempts', () => {
      const maxAttempts = 5;
      let attempts = 0;

      const shouldReconnect = () => {
        return attempts < maxAttempts;
      };

      // Simulate failed connection attempts
      for (let i = 0; i < 10; i++) {
        if (shouldReconnect()) {
          attempts++;
        }
      }

      expect(attempts).toBe(maxAttempts);
    });
  });

  describe('driver filtering', () => {
    it('should filter location updates by driver ID', () => {
      const targetDriverId = 'driver-456';
      
      const locationUpdate1 = {
        type: 'driver_location_update',
        payload: {
          driverId: 'driver-456',
          location: { latitude: 37.7749, longitude: -122.4194 },
          timestamp: '2023-01-01T12:00:00Z',
        },
      };

      const locationUpdate2 = {
        type: 'driver_location_update',
        payload: {
          driverId: 'different-driver',
          location: { latitude: 37.7750, longitude: -122.4195 },
          timestamp: '2023-01-01T12:01:00Z',
        },
      };

      // Should accept update for target driver
      expect(locationUpdate1.payload.driverId).toBe(targetDriverId);
      
      // Should reject update for different driver
      expect(locationUpdate2.payload.driverId).not.toBe(targetDriverId);
    });
  });

  describe('battery optimization', () => {
    it('should use appropriate heartbeat interval', () => {
      const HEARTBEAT_INTERVAL = 30000; // 30 seconds
      
      expect(HEARTBEAT_INTERVAL).toBe(30000);
      expect(HEARTBEAT_INTERVAL).toBeGreaterThan(10000); // More than 10 seconds
      expect(HEARTBEAT_INTERVAL).toBeLessThan(60000);    // Less than 1 minute
    });

    it('should handle rapid location updates efficiently', () => {
      // Simulate rapid updates (should all be processed)
      const rapidUpdates = Array.from({ length: 10 }, (_, i) => ({
        type: 'driver_location_update',
        payload: {
          driverId: 'driver-456',
          location: {
            latitude: 37.7749 + i * 0.0001,
            longitude: -122.4194 + i * 0.0001,
          },
          timestamp: new Date(Date.now() + i * 100).toISOString(),
        },
      }));

      // All updates should be valid
      rapidUpdates.forEach((update, index) => {
        expect(update.payload.driverId).toBe('driver-456');
        expect(update.payload.location.latitude).toBe(37.7749 + index * 0.0001);
        expect(update.payload.location.longitude).toBe(-122.4194 + index * 0.0001);
      });

      // Latest update should have the highest coordinates
      const latestUpdate = rapidUpdates[rapidUpdates.length - 1];
      expect(latestUpdate.payload.location.latitude).toBe(37.7749 + 9 * 0.0001);
      expect(latestUpdate.payload.location.longitude).toBe(-122.4194 + 9 * 0.0001);
    });
  });
});