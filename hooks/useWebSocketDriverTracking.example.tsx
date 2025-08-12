import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useWebSocketDriverTracking } from './useWebSocketDriverTracking';

interface WebSocketDriverTrackingExampleProps {
  rideId: string;
  driverId: string;
}

export const WebSocketDriverTrackingExample: React.FC<WebSocketDriverTrackingExampleProps> = ({
  rideId,
  driverId,
}) => {
  const {
    driverLocation,
    isConnected,
    isConnecting,
    error,
    lastUpdated,
    reconnectAttempts,
    connect,
    disconnect,
  } = useWebSocketDriverTracking({
    rideId,
    driverId,
    enabled: true,
    wsUrl: 'ws://localhost:3000/ws',
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  const getConnectionStatus = () => {
    if (isConnecting) return 'Connecting...';
    if (isConnected) return 'Connected';
    if (error) return `Error: ${error}`;
    return 'Disconnected';
  };

  const getConnectionStatusColor = () => {
    if (isConnecting) return '#FFA500'; // Orange
    if (isConnected) return '#4CAF50'; // Green
    if (error) return '#F44336'; // Red
    return '#9E9E9E'; // Gray
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WebSocket Driver Tracking</Text>
      
      {/* Connection Status */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, { backgroundColor: getConnectionStatusColor() }]} />
        <Text style={styles.statusText}>{getConnectionStatus()}</Text>
      </View>

      {/* Connection Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoLabel}>Ride ID:</Text>
        <Text style={styles.infoValue}>{rideId}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoLabel}>Driver ID:</Text>
        <Text style={styles.infoValue}>{driverId}</Text>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoLabel}>Last Updated:</Text>
        <Text style={styles.infoValue}>{formatTimestamp(lastUpdated)}</Text>
      </View>

      {reconnectAttempts > 0 && (
        <View style={styles.infoContainer}>
          <Text style={styles.infoLabel}>Reconnect Attempts:</Text>
          <Text style={styles.infoValue}>{reconnectAttempts}</Text>
        </View>
      )}

      {/* Driver Location */}
      <View style={styles.locationContainer}>
        <Text style={styles.sectionTitle}>Driver Location</Text>
        {driverLocation ? (
          <View>
            <Text style={styles.locationText}>
              Latitude: {driverLocation.latitude.toFixed(6)}
            </Text>
            <Text style={styles.locationText}>
              Longitude: {driverLocation.longitude.toFixed(6)}
            </Text>
          </View>
        ) : (
          <Text style={styles.noLocationText}>No location data available</Text>
        )}
      </View>

      {/* Control Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.connectButton]}
          onPress={connect}
          disabled={isConnected || isConnecting}
        >
          <Text style={styles.buttonText}>Connect</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.disconnectButton]}
          onPress={disconnect}
          disabled={!isConnected && !isConnecting}
        >
          <Text style={styles.buttonText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Real-time Updates Indicator */}
      {isConnected && (
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    marginBottom: 4,
    borderRadius: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '400',
  },
  locationContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  noLocationText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  connectButton: {
    backgroundColor: '#4CAF50',
  },
  disconnectButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
  },
  liveIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

// Example usage in a trip screen
export const TripScreenWithWebSocket: React.FC = () => {
  const rideId = 'ride-123';
  const driverId = 'driver-456';

  return (
    <WebSocketDriverTrackingExample
      rideId={rideId}
      driverId={driverId}
    />
  );
};

// Example of integrating with existing real-time tracking
export const IntegratedTrackingExample: React.FC = () => {
  const rideId = 'ride-123';
  const driverId = 'driver-456';
  const passengerLocation = {
    latitude: 37.7749,
    longitude: -122.4194,
  };

  // Use both WebSocket and polling for maximum reliability
  const {
    driverLocation,
    distance,
    formattedDistance,
    eta,
    formattedEta,
    isWebSocketConnected,
    error,
  } = useRealTimeDriverTracking({
    rideId,
    driverId,
    passengerLocation,
    useWebSocket: true,
    wsUrl: 'ws://localhost:3000/ws',
    pollingInterval: 10000, // 10 seconds (slower when WebSocket is active)
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Integrated Real-time Tracking</Text>
      
      <View style={styles.statusContainer}>
        <View style={[
          styles.statusIndicator, 
          { backgroundColor: isWebSocketConnected ? '#4CAF50' : '#FFA500' }
        ]} />
        <Text style={styles.statusText}>
          {isWebSocketConnected ? 'WebSocket Connected' : 'Polling Mode'}
        </Text>
      </View>

      {driverLocation && (
        <View style={styles.locationContainer}>
          <Text style={styles.sectionTitle}>Driver Status</Text>
          <Text style={styles.locationText}>
            Location: {driverLocation.latitude.toFixed(6)}, {driverLocation.longitude.toFixed(6)}
          </Text>
          {formattedDistance && (
            <Text style={styles.locationText}>Distance: {formattedDistance}</Text>
          )}
          {formattedEta && (
            <Text style={styles.locationText}>ETA: {formattedEta}</Text>
          )}
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};