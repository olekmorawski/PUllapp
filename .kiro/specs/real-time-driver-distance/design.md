# Design Document

## Overview

This design implements real-time driver-to-passenger distance tracking by integrating with the existing backend API to fetch actual driver locations and calculate accurate distances. The solution replaces the current mock data implementation with live data from Redis-backed driver location updates.

## Architecture

### High-Level Flow
1. **Ride Creation**: Passenger creates a ride request
2. **Driver Assignment**: Backend assigns an available driver and updates ride status
3. **Real-time Tracking**: Frontend polls for driver location updates and calculates distances
4. **Trip Progression**: System handles different trip phases with appropriate distance calculations

### Integration Points
- **Backend API**: Existing Elysia server with Redis for driver location storage
- **WebSocket Connection**: Real-time updates for driver location changes
- **OSRM Routing**: Calculate routes and ETAs between driver and passenger locations
- **React Native Frontend**: Updated trip screen with real distance calculations

## Components and Interfaces

### API Integration Layer

#### RideAPI Service
```typescript
interface RideAPI {
  getRideById(rideId: string): Promise<Ride>;
  updateRideStatus(rideId: string, status: RideStatus): Promise<Ride>;
  getAssignedDriver(rideId: string): Promise<Driver | null>;
}
```

#### DriverAPI Service  
```typescript
interface DriverAPI {
  getDriverById(driverId: string): Promise<Driver>;
  getDriverLocation(driverId: string): Promise<DriverLocation>;
}
```

#### WebSocket Service
```typescript
interface WebSocketService {
  connect(): void;
  subscribe(channel: string, callback: (data: any) => void): void;
  sendLocationUpdate(location: LocationUpdate): void;
}
```

### Distance Calculation Service

#### DistanceCalculator
```typescript
interface DistanceCalculator {
  calculateStraightLineDistance(from: Coordinates, to: Coordinates): number;
  calculateRouteDistance(from: Coordinates, to: Coordinates): Promise<RouteInfo>;
  formatDistance(distanceInMeters: number): string;
}

interface RouteInfo {
  distance: number; // in meters
  duration: number; // in seconds
  geometry: GeoJSON.Feature;
}
```

### Updated React Hooks

#### useRealTimeDriverTracking
```typescript
interface UseRealTimeDriverTrackingProps {
  rideId: string;
  passengerLocation: Coordinates;
}

interface UseRealTimeDriverTrackingReturn {
  driverLocation: Coordinates | null;
  distance: number | null;
  eta: number | null;
  routeGeometry: GeoJSON.Feature | null;
  isLoading: boolean;
  error: string | null;
}
```

#### useRideStatus
```typescript
interface UseRideStatusProps {
  rideId: string;
}

interface UseRideStatusReturn {
  ride: Ride | null;
  assignedDriver: Driver | null;
  rideStatus: RideStatus;
  isWaitingForDriver: boolean;
  isDriverAssigned: boolean;
}
```

## Data Models

### Extended Ride Model
```typescript
interface Ride {
  id: string;
  userId: string;
  userEmail: string;
  walletAddress: string;
  originCoordinates: Coordinates;
  destinationCoordinates: Coordinates;
  originAddress: string;
  destinationAddress: string;
  estimatedPrice?: string;
  customPrice?: string;
  status: RideStatus;
  assignedDriverId?: string; // New field
  driverAcceptedAt?: string; // New field
  createdAt: string;
  updatedAt: string;
}

type RideStatus = 'pending' | 'accepted' | 'driver_assigned' | 'approaching_pickup' | 'driver_arrived' | 'in_progress' | 'completed' | 'cancelled';
```

### Driver Location Model
```typescript
interface DriverLocation {
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: string;
}
```

### Distance Display Model
```typescript
interface DistanceInfo {
  distance: number; // in meters
  formattedDistance: string; // "1.2 km" or "0.8 mi"
  eta: number; // in seconds
  formattedEta: string; // "5 min"
  lastUpdated: string;
}
```

## Error Handling

### Network Error Handling
- **Connection Loss**: Display last known location with timestamp
- **API Failures**: Implement exponential backoff retry mechanism
- **Timeout Handling**: 30-second timeout for location requests
- **Fallback Strategy**: Use straight-line distance when routing fails

### Data Validation
- **Location Validation**: Ensure coordinates are within valid ranges
- **Driver Assignment**: Verify driver exists and is available
- **Ride Status**: Validate status transitions are logical

### User Experience
- **Loading States**: Show loading indicators during API calls
- **Error Messages**: Display user-friendly error messages
- **Offline Mode**: Cache last known state for offline viewing

## Testing Strategy

### Unit Tests
- **Distance Calculations**: Test Haversine formula accuracy
- **API Integration**: Mock API responses and test error handling
- **Data Transformations**: Test coordinate conversions and formatting
- **WebSocket Handling**: Test connection management and message parsing

### Integration Tests
- **End-to-End Flow**: Test complete ride assignment and tracking flow
- **Real-time Updates**: Test WebSocket message handling
- **Error Scenarios**: Test network failures and recovery
- **Performance**: Test with multiple concurrent location updates

### Manual Testing
- **Device Testing**: Test on iOS and Android devices
- **Network Conditions**: Test with poor connectivity
- **Location Accuracy**: Test with GPS and network location providers
- **Battery Impact**: Monitor battery usage during real-time tracking

## Implementation Phases

### Phase 1: Backend API Extensions
- Add driver assignment to ride creation flow
- Implement driver location polling endpoints
- Add WebSocket support for real-time location updates

### Phase 2: Frontend Integration
- Replace mock data with real API calls
- Implement distance calculation utilities
- Add error handling and loading states

### Phase 3: Real-time Updates
- Implement WebSocket connection for live updates
- Add automatic retry mechanisms
- Optimize polling intervals for battery efficiency

### Phase 4: Enhanced UX
- Add smooth map animations for driver movement
- Implement predictive ETA calculations
- Add offline mode support