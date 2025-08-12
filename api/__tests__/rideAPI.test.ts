import { AvailableRide, Driver, DriverLocation, rideQueryKeys } from '../rideAPI';

describe('RideAPI Types and Structure', () => {
  
  describe('AvailableRide interface', () => {
    it('should have all required fields including driver assignment fields', () => {
      const mockRide: AvailableRide = {
        id: 'ride-123',
        userId: 'user-456',
        userEmail: 'test@example.com',
        walletAddress: '0x123',
        originCoordinates: { latitude: 40.7128, longitude: -74.0060 },
        destinationCoordinates: { latitude: 40.7589, longitude: -73.9851 },
        originAddress: '123 Main St',
        destinationAddress: '456 Broadway',
        status: 'driver_assigned',
        assignedDriverId: 'driver-789',
        driverAcceptedAt: '2025-01-08T12:00:00Z',
        createdAt: '2025-01-08T11:00:00Z',
        updatedAt: '2025-01-08T12:00:00Z',
      };

      expect(mockRide.id).toBe('ride-123');
      expect(mockRide.assignedDriverId).toBe('driver-789');
      expect(mockRide.driverAcceptedAt).toBe('2025-01-08T12:00:00Z');
      expect(mockRide.status).toBe('driver_assigned');
    });

    it('should support all ride statuses including new driver assignment statuses', () => {
      const statuses: AvailableRide['status'][] = [
        'pending',
        'accepted', 
        'driver_assigned',
        'approaching_pickup',
        'driver_arrived',
        'in_progress',
        'completed',
        'cancelled'
      ];

      statuses.forEach(status => {
        const mockRide: Partial<AvailableRide> = { status };
        expect(mockRide.status).toBe(status);
      });
    });
  });

  describe('Driver interface', () => {
    it('should have all required driver fields', () => {
      const mockDriver: Driver = {
        id: 'driver-789',
        email: 'driver@example.com',
        username: 'testdriver',
        isDriver: true,
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-08T12:00:00Z',
      };

      expect(mockDriver.id).toBe('driver-789');
      expect(mockDriver.isDriver).toBe(true);
      expect(mockDriver.email).toBe('driver@example.com');
    });
  });

  describe('DriverLocation interface', () => {
    it('should have all required location fields', () => {
      const mockLocation: DriverLocation = {
        driverId: 'driver-789',
        latitude: 40.7128,
        longitude: -74.0060,
        heading: 45,
        speed: 25,
        accuracy: 5,
        timestamp: '2025-01-08T12:00:00Z',
      };

      expect(mockLocation.driverId).toBe('driver-789');
      expect(mockLocation.latitude).toBe(40.7128);
      expect(mockLocation.longitude).toBe(-74.0060);
      expect(mockLocation.timestamp).toBe('2025-01-08T12:00:00Z');
    });

    it('should support optional fields', () => {
      const mockLocation: DriverLocation = {
        driverId: 'driver-789',
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: '2025-01-08T12:00:00Z',
      };

      expect(mockLocation.heading).toBeUndefined();
      expect(mockLocation.speed).toBeUndefined();
      expect(mockLocation.accuracy).toBeUndefined();
    });
  });

  describe('Query keys', () => {
    it('should have all required query keys', () => {
      expect(rideQueryKeys.all).toEqual(['rides']);
      expect(rideQueryKeys.available()).toEqual(['rides', 'available']);
      expect(rideQueryKeys.ride('ride-123')).toEqual(['rides', 'ride', 'ride-123']);
      expect(rideQueryKeys.assignedDriver('ride-123')).toEqual(['rides', 'assigned-driver', 'ride-123']);
      expect(rideQueryKeys.driverLocation('driver-789')).toEqual(['drivers', 'location', 'driver-789']);
    });
  });
});