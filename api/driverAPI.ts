// Driver location interface
export interface DriverLocation {
    driverId: string;
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
    timestamp: string;
}

// Driver interface
export interface Driver {
    id: string;
    email: string;
    username: string;
    walletAddress?: string;
    isDriver: boolean;
    createdAt: string;
    updatedAt: string;
}

// API response types
export interface GetDriverLocationResponse {
    location: DriverLocation | null;
}

export interface GetDriverResponse {
    driver: Driver;
}

// Error types
export class DriverAPIError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public isRetryable: boolean = false
    ) {
        super(message);
        this.name = 'DriverAPIError';
    }
}

// Retry configuration
interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    backoffMultiplier: 2,
};

// Configure your backend URL with fallback
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// Driver API client with retry mechanism
class DriverAPIClient {
    private baseURL: string;
    private retryConfig: RetryConfig;

    constructor(baseURL: string, retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
        this.baseURL = baseURL;
        this.retryConfig = retryConfig;
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private calculateDelay(attempt: number): number {
        const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt);
        return Math.min(delay, this.retryConfig.maxDelay);
    }

    private isRetryableError(error: any): boolean {
        // Network errors are retryable
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return true;
        }

        // HTTP status codes that are retryable
        if (error instanceof DriverAPIError) {
            return error.isRetryable;
        }

        // Check for specific HTTP status codes
        if (error.statusCode) {
            const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
            return retryableStatusCodes.includes(error.statusCode);
        }

        return false;
    }

    private async request<T>(
        endpoint: string, 
        options: RequestInit,
        attempt: number = 0
    ): Promise<T> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                signal: controller.signal,
                ...options,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const isRetryable = response.status >= 500 || response.status === 408 || response.status === 429;
                const error = new DriverAPIError(
                    `API Error: ${response.status} - ${response.statusText}`,
                    response.status,
                    isRetryable
                );

                if (isRetryable && attempt < this.retryConfig.maxRetries) {
                    const delay = this.calculateDelay(attempt);
                    await this.sleep(delay);
                    return this.request<T>(endpoint, options, attempt + 1);
                }

                throw error;
            }

            const data = await response.json();

            if (data.error) {
                throw new DriverAPIError(data.error, response.status, false);
            }

            return data;
        } catch (error: any) {
            // Handle timeout errors
            if (error.name === 'AbortError') {
                const timeoutError = new DriverAPIError('Request timeout', 408, true);
                if (attempt < this.retryConfig.maxRetries) {
                    const delay = this.calculateDelay(attempt);
                    await this.sleep(delay);
                    return this.request<T>(endpoint, options, attempt + 1);
                }
                throw timeoutError;
            }

            // Handle network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                const networkError = new DriverAPIError('Network error', undefined, true);
                if (attempt < this.retryConfig.maxRetries) {
                    const delay = this.calculateDelay(attempt);
                    await this.sleep(delay);
                    return this.request<T>(endpoint, options, attempt + 1);
                }
                throw networkError;
            }

            // If it's already a DriverAPIError, check if we should retry
            if (error instanceof DriverAPIError && this.isRetryableError(error) && attempt < this.retryConfig.maxRetries) {
                const delay = this.calculateDelay(attempt);
                await this.sleep(delay);
                return this.request<T>(endpoint, options, attempt + 1);
            }

            // Re-throw the error if not retryable or max retries exceeded
            throw error;
        }
    }

    async getDriverLocation(driverId: string): Promise<GetDriverLocationResponse> {
        if (!driverId || typeof driverId !== 'string') {
            throw new DriverAPIError('Driver ID is required and must be a string', 400, false);
        }

        return this.request<GetDriverLocationResponse>(`/api/drivers/${driverId}/location`, {
            method: 'GET',
        });
    }

    async getDriverById(driverId: string): Promise<GetDriverResponse> {
        if (!driverId || typeof driverId !== 'string') {
            throw new DriverAPIError('Driver ID is required and must be a string', 400, false);
        }

        return this.request<GetDriverResponse>(`/api/drivers/${driverId}`, {
            method: 'GET',
        });
    }
}

// Hidden API instance - not exported
const apiInstance = new DriverAPIClient(BACKEND_URL);

// Export only the instance methods (hiding the class)
export const driverAPI = {
    getDriverLocation: (driverId: string) => apiInstance.getDriverLocation(driverId),
    getDriverById: (driverId: string) => apiInstance.getDriverById(driverId),
};

// Query keys for React Query
export const driverQueryKeys = {
    all: ['drivers'] as const,
    driver: (driverId: string) => [...driverQueryKeys.all, 'driver', driverId] as const,
    location: (driverId: string) => [...driverQueryKeys.all, 'location', driverId] as const,
};