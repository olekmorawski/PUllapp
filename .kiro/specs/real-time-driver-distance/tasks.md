# Implementation Plan

- [x] 1. Extend backend API for driver assignment and location tracking
  - Add driver assignment field to ride model in backend
  - Create endpoint to assign driver to ride when driver accepts
  - Add endpoint to get assigned driver details for a ride
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 2. Create distance calculation utilities using geolib
  - Install and configure geolib library for accurate distance calculations
  - Create utility functions to calculate distance using geolib.getDistance()
  - Create utility functions to format distance in appropriate units (km/m or mi/ft)
  - Add coordinate validation functions
  - Write unit tests for distance calculation accuracy using geolib
  - _Requirements: 1.2, 1.3_

- [x] 3. Implement driver location API service
  - Create API service to fetch driver location by driver ID
  - Add error handling for failed location requests
  - Implement retry mechanism with exponential backoff
  - Write unit tests for API service error scenarios
  - _Requirements: 1.1, 6.2, 6.3_

- [x] 4. Create real-time driver tracking hook
  - Implement useRealTimeDriverTracking hook to manage driver location state
  - Add polling mechanism to fetch driver location updates at regular intervals
  - Integrate distance calculation with location updates
  - Handle loading states and error conditions
  - _Requirements: 2.1, 2.2, 1.4_

- [x] 5. Implement ride status management hook
  - Create useRideStatus hook to track ride state and driver assignment
  - Add logic to detect when driver is assigned to transition from waiting screen
  - Implement ride status polling to detect status changes
  - Handle driver assignment notifications
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 6. Update TripInfo component to display real distance
  - Modify TripInfo component to accept and display real distance data
  - Add ETA display based on route calculations
  - Implement loading states for distance calculations
  - Add error handling for failed distance updates
  - _Requirements: 1.3, 3.2, 6.4_

- [x] 7. Integrate OSRM routing for accurate ETA calculations
  - Add OSRM API integration to calculate routes between driver and passenger
  - Implement route geometry parsing for map display
  - Add fallback to straight-line distance when routing fails
  - Cache route calculations to reduce API calls
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 8. Update trip screen to use real-time data
  - Replace mock driver coordinates with real driver location from API
  - Integrate useRealTimeDriverTracking hook in trip screen
  - Remove hardcoded MOCK_DRIVER_START coordinates
  - Update map display to show real driver position
  - _Requirements: 1.1, 2.3_

- [x] 9. Implement WebSocket integration for live updates
  - Add WebSocket connection to receive real-time driver location updates
  - Implement message parsing for location update events
  - Add connection management with automatic reconnection
  - Optimize update frequency to balance accuracy and battery usage
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 10. Add trip phase handling and status transitions
  - Implement logic to handle different trip phases (approaching, arrived, en route)
  - Update distance calculations based on current trip phase
  - Add automatic status transitions based on driver proximity
  - Display appropriate information for each trip phase
  - _Requirements: 5.1, 5.2, 5.3, 5.4_
