import { driverAPI, DriverAPIError } from '../driverAPI';

// Mock fetch globally
global.fetch = jest.fn();

// Mock setTimeout for testing retry delays
jest.useFakeTimers();

describe('driverAPI', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
        (fetch as jest.Mock).mockClear();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
    });

    describe('getDriverLocation', () => {
        const mockDriverId = 'driver-123';
        const mockLocation = {
            location: {
                driverId: mockDriverId,
                latitude: 40.7128,
                longitude: -74.0060,
                heading: 90,
                speed: 25,
                accuracy: 5,
                timestamp: '2023-12-01T10:00:00Z'
            }
        };

        it('should successfully fetch driver location', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockLocation,
            });

            const result = await driverAPI.getDriverLocation(mockDriverId);

            expect(fetch).toHaveBeenCalledWith(
                `http://localhost:3001/api/drivers/${mockDriverId}/location`,
                expect.objectContaining({
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );
            expect(result).toEqual(mockLocation);
        });

        it('should throw error for invalid driver ID', async () => {
            await expect(driverAPI.getDriverLocation('')).rejects.toThrow(
                new DriverAPIError('Driver ID is required and must be a string', 400, false)
            );

            await expect(driverAPI.getDriverLocation(null as any)).rejects.toThrow(
                new DriverAPIError('Driver ID is required and must be a string', 400, false)
            );
        });

        it('should handle 404 error when driver not found', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: async () => ({ error: 'Driver not found' }),
            });

            await expect(driverAPI.getDriverLocation(mockDriverId)).rejects.toThrow(
                new DriverAPIError('API Error: 404 - Not Found', 404, false)
            );
        });

        it('should retry on 500 server error and eventually succeed', async () => {
            // First call fails with 500
            (fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: false,
                    status: 500,
                    statusText: 'Internal Server Error',
                })
                // Second call succeeds
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockLocation,
                });

            const resultPromise = driverAPI.getDriverLocation(mockDriverId);

            // Wait for the first call to complete and retry to be scheduled
            await jest.runOnlyPendingTimersAsync();

            const result = await resultPromise;

            expect(fetch).toHaveBeenCalledTimes(2);
            expect(result).toEqual(mockLocation);
        }, 10000);

        it('should retry on network error with exponential backoff', async () => {
            // First call fails with network error
            (fetch as jest.Mock)
                .mockRejectedValueOnce(new TypeError('fetch failed'))
                // Second call fails with network error
                .mockRejectedValueOnce(new TypeError('fetch failed'))
                // Third call succeeds
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockLocation,
                });

            const resultPromise = driverAPI.getDriverLocation(mockDriverId);

            // Run all pending timers to complete retries
            await jest.runAllTimersAsync();

            const result = await resultPromise;

            expect(fetch).toHaveBeenCalledTimes(3);
            expect(result).toEqual(mockLocation);
        }, 10000);

        it('should fail after max retries exceeded', async () => {
            (fetch as jest.Mock).mockRejectedValue(new TypeError('fetch failed'));

            await expect(driverAPI.getDriverLocation(mockDriverId)).rejects.toThrow('Network error');
        }, 20000);

        it('should handle timeout error', async () => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            (fetch as jest.Mock).mockRejectedValue(abortError);

            await expect(driverAPI.getDriverLocation(mockDriverId)).rejects.toThrow('Request timeout');
        }, 20000);

        it('should not retry on 400 client error', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
            });

            await expect(driverAPI.getDriverLocation(mockDriverId)).rejects.toThrow(
                new DriverAPIError('API Error: 400 - Bad Request', 400, false)
            );

            expect(fetch).toHaveBeenCalledTimes(1);
        });

        it('should retry on 429 rate limit error', async () => {
            (fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: false,
                    status: 429,
                    statusText: 'Too Many Requests',
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockLocation,
                });

            const resultPromise = driverAPI.getDriverLocation(mockDriverId);

            // Run pending timers to complete retry
            await jest.runOnlyPendingTimersAsync();

            const result = await resultPromise;

            expect(fetch).toHaveBeenCalledTimes(2);
            expect(result).toEqual(mockLocation);
        }, 10000);

        it('should handle API error response', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ error: 'Driver location not available' }),
            });

            await expect(driverAPI.getDriverLocation(mockDriverId)).rejects.toThrow(
                new DriverAPIError('Driver location not available', 200, false)
            );
        });
    });

    describe('getDriverById', () => {
        const mockDriverId = 'driver-123';
        const mockDriver = {
            driver: {
                id: mockDriverId,
                email: 'driver@example.com',
                username: 'testdriver',
                walletAddress: '0x123...',
                isDriver: true,
                createdAt: '2023-12-01T10:00:00Z',
                updatedAt: '2023-12-01T10:00:00Z'
            }
        };

        it('should successfully fetch driver by ID', async () => {
            (fetch as jest.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => mockDriver,
            });

            const result = await driverAPI.getDriverById(mockDriverId);

            expect(fetch).toHaveBeenCalledWith(
                `http://localhost:3001/api/drivers/${mockDriverId}`,
                expect.objectContaining({
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                })
            );
            expect(result).toEqual(mockDriver);
        });

        it('should throw error for invalid driver ID', async () => {
            await expect(driverAPI.getDriverById('')).rejects.toThrow(
                new DriverAPIError('Driver ID is required and must be a string', 400, false)
            );
        });

        it('should retry on server error', async () => {
            (fetch as jest.Mock)
                .mockResolvedValueOnce({
                    ok: false,
                    status: 503,
                    statusText: 'Service Unavailable',
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockDriver,
                });

            const resultPromise = driverAPI.getDriverById(mockDriverId);

            // Run pending timers to complete retry
            await jest.runOnlyPendingTimersAsync();

            const result = await resultPromise;

            expect(fetch).toHaveBeenCalledTimes(2);
            expect(result).toEqual(mockDriver);
        }, 10000);
    });

    describe('error handling', () => {
        it('should create DriverAPIError with correct properties', () => {
            const error = new DriverAPIError('Test error', 500, true);
            
            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(500);
            expect(error.isRetryable).toBe(true);
            expect(error.name).toBe('DriverAPIError');
        });

        it('should handle exponential backoff correctly', async () => {
            const mockDriverId = 'driver-123';
            
            (fetch as jest.Mock)
                .mockRejectedValueOnce(new TypeError('fetch failed'))
                .mockRejectedValueOnce(new TypeError('fetch failed'))
                .mockRejectedValueOnce(new TypeError('fetch failed'))
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => ({ location: null }),
                });

            const resultPromise = driverAPI.getDriverLocation(mockDriverId);

            // Run all timers to complete all retries
            await jest.runAllTimersAsync();

            await resultPromise;

            expect(fetch).toHaveBeenCalledTimes(4);
        }, 10000);

        it('should respect max delay limit', async () => {
            const mockDriverId = 'driver-123';
            
            // Mock failures that will exceed max retries
            (fetch as jest.Mock).mockRejectedValue(new TypeError('fetch failed'));

            await expect(driverAPI.getDriverLocation(mockDriverId)).rejects.toThrow('Network error');
        }, 20000);
    });
});