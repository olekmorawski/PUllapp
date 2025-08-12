# Requirements Document

## Introduction

The trip screen currently displays mock data and does not show the real distance from the driver to the passenger. This feature will integrate the existing backend API to fetch real driver locations and calculate accurate distances, providing users with real-time updates during their trip experience.

## Requirements

### Requirement 1

**User Story:** As a passenger, I want to see the real distance from my assigned driver to my pickup location, so that I can accurately estimate when the driver will arrive.

#### Acceptance Criteria

1. WHEN a trip is active THEN the system SHALL fetch the real driver location from the backend API
2. WHEN driver location is available THEN the system SHALL calculate the actual distance between driver and passenger pickup location
3. WHEN distance is calculated THEN the system SHALL display the distance in an appropriate unit (meters/kilometers or feet/miles)
4. WHEN driver location updates THEN the system SHALL automatically recalculate and update the displayed distance

### Requirement 2

**User Story:** As a passenger, I want to see real-time updates of the driver's location and distance, so that I can track the driver's progress toward my location.

#### Acceptance Criteria

1. WHEN a trip is in progress THEN the system SHALL poll for driver location updates at regular intervals
2. WHEN driver location changes THEN the system SHALL update the map display with the new driver position
3. WHEN driver location changes THEN the system SHALL recalculate the route and estimated time of arrival
4. IF location updates fail THEN the system SHALL display an appropriate error message and retry

### Requirement 3

**User Story:** As a passenger, I want to see the estimated time of arrival based on real routing data, so that I can plan accordingly.

#### Acceptance Criteria

1. WHEN driver location is available THEN the system SHALL calculate the route from driver to pickup location using a routing service
2. WHEN route is calculated THEN the system SHALL display the estimated time of arrival
3. WHEN traffic conditions change THEN the system SHALL update the ETA accordingly
4. IF routing service is unavailable THEN the system SHALL fall back to straight-line distance calculation

### Requirement 4

**User Story:** As a passenger, I want to see when a driver accepts my ride and transition from waiting to real-time tracking, so that I know my ride has been confirmed and can track the driver's approach.

#### Acceptance Criteria

1. WHEN a ride is created THEN the system SHALL show a waiting screen until a driver accepts
2. WHEN a driver accepts the ride THEN the system SHALL receive the driver assignment via the backend API
3. WHEN driver is assigned THEN the system SHALL transition from waiting screen to real-time tracking screen
4. WHEN driver is assigned THEN the system SHALL fetch the assigned driver's current location and details

### Requirement 5

**User Story:** As a passenger, I want the trip screen to handle different trip phases appropriately, so that I receive relevant information for each stage of my journey.

#### Acceptance Criteria

1. WHEN trip status is "approaching pickup" THEN the system SHALL show distance from driver to pickup location
2. WHEN trip status is "driver arrived" THEN the system SHALL show that the driver has arrived at pickup location
3. WHEN trip status is "en route to destination" THEN the system SHALL show distance and ETA to destination
4. WHEN trip status changes THEN the system SHALL update the display accordingly

### Requirement 6

**User Story:** As a passenger, I want the app to work gracefully when there are connectivity issues, so that I still have a functional experience even with poor network conditions.

#### Acceptance Criteria

1. WHEN network connectivity is lost THEN the system SHALL display the last known driver location
2. WHEN API calls fail THEN the system SHALL retry with exponential backoff
3. WHEN retries are exhausted THEN the system SHALL display an appropriate error message
4. WHEN connectivity is restored THEN the system SHALL resume real-time updates automatically