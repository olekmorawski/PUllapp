import {
  validateCoordinates,
  validateCoordinatesArray,
  calculateDistance,
  formatDistance,
  calculateAndFormatDistance,
  getPreferredUnit,
  calculateDistanceWithLocale,
  calculateRoute,
  calculateRouteWithLocale,
  formatDuration,
  clearRouteCache,
  getCacheStats,
  Coordinates,
  RouteInfo
} from '../distanceCalculator';

// Mock axios
import axios from 'axios';
jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('Distance Calculator Utilities', () => {
  // Test coordinates
  const validCoord1: Coordinates = { latitude: 40.7128, longitude: -74.0060 }; // New York City
  const validCoord2: Coordinates = { latitude: 34.0522, longitude: -118.2437 }; // Los Angeles
  const validCoord3: Coordinates = { latitude: 51.5074, longitude: -0.1278 }; // London
  const validCoord4: Coordinates = { latitude: 40.7589, longitude: -73.9851 }; // Times Square (close to NYC)

  const invalidCoord1: Coordinates = { latitude: 91, longitude: -74.0060 }; // Invalid latitude
  const invalidCoord2: Coordinates = { latitude: 40.7128, longitude: 181 }; // Invalid longitude
  const invalidCoord3: Coordinates = { latitude: -91, longitude: -74.0060 }; // Invalid latitude
  const invalidCoord4: Coordinates = { latitude: 40.7128, longitude: -181 }; // Invalid longitude

  describe('validateCoordinates', () => {
    it('should return true for valid coordinates', () => {
      expect(validateCoordinates(validCoord1)).toBe(true);
      expect(validateCoordinates(validCoord2)).toBe(true);
      expect(validateCoordinates(validCoord3)).toBe(true);
    });

    it('should return false for invalid coordinates', () => {
      expect(validateCoordinates(invalidCoord1)).toBe(false);
      expect(validateCoordinates(invalidCoord2)).toBe(false);
      expect(validateCoordinates(invalidCoord3)).toBe(false);
      expect(validateCoordinates(invalidCoord4)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateCoordinates({ latitude: 90, longitude: 180 })).toBe(true);
      expect(validateCoordinates({ latitude: -90, longitude: -180 })).toBe(true);
      expect(validateCoordinates({ latitude: 0, longitude: 0 })).toBe(true);
    });
  });

  describe('validateCoordinatesArray', () => {
    it('should return true for array of valid coordinates', () => {
      expect(validateCoordinatesArray([validCoord1, validCoord2, validCoord3])).toBe(true);
    });

    it('should return false if any coordinate is invalid', () => {
      expect(validateCoordinatesArray([validCoord1, invalidCoord1, validCoord2])).toBe(false);
    });

    it('should return true for empty array', () => {
      expect(validateCoordinatesArray([])).toBe(true);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between NYC and LA correctly', () => {
      const distance = calculateDistance(validCoord1, validCoord2);
      // Expected distance is approximately 3944 km (3,944,000 meters)
      expect(distance).toBeGreaterThan(3900000);
      expect(distance).toBeLessThan(4000000);
    });

    it('should calculate distance between close points correctly', () => {
      const distance = calculateDistance(validCoord1, validCoord4);
      // Distance between NYC and Times Square should be less than 10km
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(10000);
    });

    it('should return 0 for identical coordinates', () => {
      const distance = calculateDistance(validCoord1, validCoord1);
      expect(distance).toBe(0);
    });

    it('should throw error for invalid coordinates', () => {
      expect(() => calculateDistance(invalidCoord1, validCoord2)).toThrow('Invalid coordinates provided');
      expect(() => calculateDistance(validCoord1, invalidCoord2)).toThrow('Invalid coordinates provided');
    });

    it('should be symmetric (distance A to B equals distance B to A)', () => {
      const distanceAB = calculateDistance(validCoord1, validCoord2);
      const distanceBA = calculateDistance(validCoord2, validCoord1);
      expect(distanceAB).toBe(distanceBA);
    });
  });

  describe('formatDistance', () => {
    describe('metric system', () => {
      it('should format short distances in meters', () => {
        expect(formatDistance(500)).toBe('500 m');
        expect(formatDistance(999)).toBe('999 m');
        expect(formatDistance(0)).toBe('0 m');
      });

      it('should format long distances in kilometers', () => {
        expect(formatDistance(1000)).toBe('1.0 km');
        expect(formatDistance(1500)).toBe('1.5 km');
        expect(formatDistance(2500)).toBe('2.5 km');
        expect(formatDistance(10000)).toBe('10.0 km');
      });

      it('should respect precision parameter', () => {
        expect(formatDistance(1234, { precision: 0 })).toBe('1 km');
        expect(formatDistance(1234, { precision: 2 })).toBe('1.23 km');
        expect(formatDistance(1234, { precision: 3 })).toBe('1.234 km');
      });
    });

    describe('imperial system', () => {
      it('should format short distances in feet', () => {
        expect(formatDistance(152.4, { unit: 'imperial' })).toBe('500 ft'); // 152.4m = ~500ft
        expect(formatDistance(304.8, { unit: 'imperial' })).toBe('1000 ft'); // 304.8m = 1000ft
        expect(formatDistance(1500, { unit: 'imperial' })).toBe('4921 ft'); // 1500m = ~4921ft
      });

      it('should format long distances in miles', () => {
        expect(formatDistance(1610, { unit: 'imperial' })).toBe('1.0 mi'); // ~1610m = ~1 mile
        expect(formatDistance(3220, { unit: 'imperial' })).toBe('2.0 mi'); // ~3220m = ~2 miles
      });

      it('should respect precision parameter for miles', () => {
        expect(formatDistance(3218.68, { unit: 'imperial', precision: 0 })).toBe('2 mi'); // 3218.68m = 2 miles
        expect(formatDistance(2414, { unit: 'imperial', precision: 2 })).toBe('1.50 mi');
      });
    });

    it('should throw error for negative distances', () => {
      expect(() => formatDistance(-100)).toThrow('Distance cannot be negative');
    });
  });

  describe('calculateAndFormatDistance', () => {
    it('should return both distance and formatted string', () => {
      const result = calculateAndFormatDistance(validCoord1, validCoord4);
      
      expect(result).toHaveProperty('distance');
      expect(result).toHaveProperty('formattedDistance');
      expect(typeof result.distance).toBe('number');
      expect(typeof result.formattedDistance).toBe('string');
      expect(result.distance).toBeGreaterThan(0);
    });

    it('should use specified formatting options', () => {
      const result = calculateAndFormatDistance(validCoord1, validCoord2, { 
        unit: 'imperial', 
        precision: 0 
      });
      
      expect(result.formattedDistance).toMatch(/\d+ mi$/);
    });
  });

  describe('getPreferredUnit', () => {
    it('should return imperial for US locale', () => {
      expect(getPreferredUnit('en-US')).toBe('imperial');
    });

    it('should return metric for UK locale', () => {
      expect(getPreferredUnit('en-GB')).toBe('metric');
    });

    it('should return metric for other locales', () => {
      expect(getPreferredUnit('fr-FR')).toBe('metric');
      expect(getPreferredUnit('de-DE')).toBe('metric');
      expect(getPreferredUnit('ja-JP')).toBe('metric');
    });

    it('should return metric as default when no locale provided', () => {
      expect(getPreferredUnit()).toBe('metric');
    });

    it('should handle invalid locale formats gracefully', () => {
      expect(getPreferredUnit('invalid')).toBe('metric');
      expect(getPreferredUnit('en')).toBe('metric');
    });
  });

  describe('calculateDistanceWithLocale', () => {
    it('should use imperial units for US locale', () => {
      const result = calculateDistanceWithLocale(validCoord1, validCoord2, 'en-US');
      expect(result.formattedDistance).toMatch(/(ft|mi)$/);
    });

    it('should use metric units for non-US locale', () => {
      const result = calculateDistanceWithLocale(validCoord1, validCoord2, 'en-GB');
      expect(result.formattedDistance).toMatch(/(m|km)$/);
    });

    it('should default to metric when no locale provided', () => {
      const result = calculateDistanceWithLocale(validCoord1, validCoord2);
      expect(result.formattedDistance).toMatch(/(m|km)$/);
    });
  });

  describe('accuracy tests with known distances', () => {
    it('should calculate distance between London and Paris accurately', () => {
      const london: Coordinates = { latitude: 51.5074, longitude: -0.1278 };
      const paris: Coordinates = { latitude: 48.8566, longitude: 2.3522 };
      
      const distance = calculateDistance(london, paris);
      // Expected distance is approximately 344 km
      expect(distance).toBeGreaterThan(340000);
      expect(distance).toBeLessThan(350000);
    });

    it('should calculate very short distances accurately', () => {
      const coord1: Coordinates = { latitude: 40.7128, longitude: -74.0060 };
      const coord2: Coordinates = { latitude: 40.7129, longitude: -74.0061 }; // Very small difference
      
      const distance = calculateDistance(coord1, coord2);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(50); // Adjusted for actual small distance
    });
  });

  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      expect(formatDuration(30)).toBe('30 sec');
      expect(formatDuration(45)).toBe('45 sec');
      expect(formatDuration(59)).toBe('59 sec');
    });

    it('should format minutes correctly', () => {
      expect(formatDuration(60)).toBe('1 min');
      expect(formatDuration(120)).toBe('2 min');
      expect(formatDuration(300)).toBe('5 min');
      expect(formatDuration(3540)).toBe('59 min');
    });

    it('should format hours correctly', () => {
      expect(formatDuration(3600)).toBe('1h');
      expect(formatDuration(3660)).toBe('1h 1m');
      expect(formatDuration(7200)).toBe('2h');
      expect(formatDuration(7320)).toBe('2h 2m');
    });
  });

  describe('OSRM routing functionality', () => {
    beforeEach(() => {
      clearRouteCache();
      jest.clearAllMocks();
    });

    describe('calculateRoute', () => {
      it('should calculate route using OSRM API successfully', async () => {
        const mockResponse = {
          data: {
            code: 'Ok',
            routes: [{
              distance: 5000,
              duration: 600,
              geometry: {
                type: 'LineString',
                coordinates: [
                  [-74.0060, 40.7128],
                  [-74.0050, 40.7130],
                  [-74.0040, 40.7135]
                ]
              }
            }]
          }
        };

        mockedAxios.get.mockResolvedValueOnce(mockResponse);

        const result = await calculateRoute(validCoord1, validCoord4);

        expect(result).toEqual({
          distance: 5000,
          duration: 600,
          geometry: mockResponse.data.routes[0].geometry,
          formattedDistance: '5.0 km',
          formattedDuration: '10 min'
        });

        expect(mockedAxios.get).toHaveBeenCalledWith(
          expect.stringContaining('router.project-osrm.org'),
          { timeout: 10000 }
        );
      });

      it('should fallback to straight-line distance when OSRM fails', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

        const result = await calculateRoute(validCoord1, validCoord4);

        expect(result).toHaveProperty('distance');
        expect(result).toHaveProperty('duration');
        expect(result).toHaveProperty('geometry');
        expect(result).toHaveProperty('formattedDistance');
        expect(result).toHaveProperty('formattedDuration');

        // Should be straight-line geometry
        expect(result.geometry.type).toBe('LineString');
        expect(result.geometry.coordinates).toHaveLength(2);
      });

      it('should fallback when OSRM returns no routes', async () => {
        const mockResponse = {
          data: {
            code: 'Ok',
            routes: []
          }
        };

        mockedAxios.get.mockResolvedValueOnce(mockResponse);

        const result = await calculateRoute(validCoord1, validCoord4);

        expect(result).toHaveProperty('distance');
        expect(result.geometry.type).toBe('LineString');
        expect(result.geometry.coordinates).toHaveLength(2);
      });

      it('should throw error for invalid coordinates', async () => {
        await expect(calculateRoute(invalidCoord1, validCoord2))
          .rejects.toThrow('Invalid coordinates provided');
      });

      it('should use imperial units when specified', async () => {
        const mockResponse = {
          data: {
            code: 'Ok',
            routes: [{
              distance: 8047, // ~5 miles (to ensure it shows in miles)
              duration: 120,
              geometry: {
                type: 'LineString',
                coordinates: [[-74.0060, 40.7128], [-74.0050, 40.7130]]
              }
            }]
          }
        };

        mockedAxios.get.mockResolvedValueOnce(mockResponse);

        const result = await calculateRoute(validCoord1, validCoord4, { unit: 'imperial' });

        expect(result.formattedDistance).toBe('5.0 mi');
      });
    });

    describe('route caching', () => {
      it('should cache successful route calculations', async () => {
        const mockResponse = {
          data: {
            code: 'Ok',
            routes: [{
              distance: 5000,
              duration: 600,
              geometry: {
                type: 'LineString',
                coordinates: [[-74.0060, 40.7128], [-74.0050, 40.7130]]
              }
            }]
          }
        };

        mockedAxios.get.mockResolvedValueOnce(mockResponse);

        // First call
        await calculateRoute(validCoord1, validCoord4);
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        // Second call should use cache
        await calculateRoute(validCoord1, validCoord4);
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        const stats = getCacheStats();
        expect(stats.size).toBe(1);
      });

      it('should cache fallback calculations', async () => {
        mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

        // First call
        await calculateRoute(validCoord1, validCoord4);
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        // Second call should use cache
        await calculateRoute(validCoord1, validCoord4);
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);

        const stats = getCacheStats();
        expect(stats.size).toBe(1);
      });

      it('should clear cache correctly', async () => {
        const mockResponse = {
          data: {
            code: 'Ok',
            routes: [{
              distance: 5000,
              duration: 600,
              geometry: { type: 'LineString', coordinates: [] }
            }]
          }
        };

        mockedAxios.get.mockResolvedValueOnce(mockResponse);

        await calculateRoute(validCoord1, validCoord4);
        expect(getCacheStats().size).toBe(1);

        clearRouteCache();
        expect(getCacheStats().size).toBe(0);
      });
    });

    describe('calculateRouteWithLocale', () => {
      it('should use imperial units for US locale', async () => {
        const mockResponse = {
          data: {
            code: 'Ok',
            routes: [{
              distance: 8047, // ~5 miles
              duration: 120,
              geometry: { type: 'LineString', coordinates: [] }
            }]
          }
        };

        mockedAxios.get.mockResolvedValueOnce(mockResponse);

        const result = await calculateRouteWithLocale(validCoord1, validCoord4, 'en-US');
        expect(result.formattedDistance).toBe('5.0 mi');
      });

      it('should use metric units for non-US locale', async () => {
        const mockResponse = {
          data: {
            code: 'Ok',
            routes: [{
              distance: 1000,
              duration: 120,
              geometry: { type: 'LineString', coordinates: [] }
            }]
          }
        };

        mockedAxios.get.mockResolvedValueOnce(mockResponse);

        const result = await calculateRouteWithLocale(validCoord1, validCoord4, 'en-GB');
        expect(result.formattedDistance).toBe('1.0 km');
      });
    });

    describe('cache statistics', () => {
      it('should provide accurate cache statistics', async () => {
        const mockResponse = {
          data: {
            code: 'Ok',
            routes: [{
              distance: 5000,
              duration: 600,
              geometry: { type: 'LineString', coordinates: [] }
            }]
          }
        };

        mockedAxios.get.mockResolvedValue(mockResponse);

        // Add multiple routes to cache
        await calculateRoute(validCoord1, validCoord2);
        await calculateRoute(validCoord2, validCoord3);

        const stats = getCacheStats();
        expect(stats.size).toBe(2);
        expect(stats.entries).toHaveLength(2);
        expect(stats.entries[0]).toContain(',');
      });
    });
  });
});