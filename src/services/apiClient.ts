import type { ApiError } from '../types';

export class ApiClient {
  private baseUrl: string;

  constructor() {
    // In development, use the proxy path to avoid CORS issues
    this.baseUrl = import.meta.env.DEV 
      ? '/api' 
      : (import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1');
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
        },
      });

      // Handle successful responses
      if (response.ok) {
        // Check if response has content
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return response.json();
        }
        
        // For non-JSON responses (like downloads), return the response itself
        return response as unknown as T;
      }

      // Handle error responses
      let errorData: ApiError;
      try {
        errorData = await response.json();
      } catch {
        // If error response is not JSON, create a default error object
        errorData = {
          timestamp: new Date().toISOString(),
          status: response.status,
          error: response.statusText,
          message: `HTTP ${response.status}: ${response.statusText}`,
          path: endpoint,
        };
      }

      throw new ApiClientError(errorData);
    } catch (error) {
      // Handle network errors or other fetch failures
      if (error instanceof ApiClientError) {
        throw error;
      }

      throw new ApiClientError({
        timestamp: new Date().toISOString(),
        status: 0,
        error: 'Network Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        path: endpoint,
      });
    }
  }

  // Convenience methods
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const init: RequestInit = {
      ...options,
      method: 'POST',
    };

    if (body instanceof FormData) {
      init.body = body;
      // Don't set Content-Type for FormData, let browser set it with boundary
    } else if (body) {
      init.body = JSON.stringify(body);
      init.headers = {
        'Content-Type': 'application/json',
        ...options?.headers,
      };
    }

    return this.request<T>(endpoint, init);
  }

  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // For downloading files
  async download(endpoint: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
    });

    if (!response.ok) {
      let errorData: ApiError;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          timestamp: new Date().toISOString(),
          status: response.status,
          error: response.statusText,
          message: `Failed to download file: ${response.statusText}`,
          path: endpoint,
        };
      }
      throw new ApiClientError(errorData);
    }

    return response.blob();
  }
}

// Custom error class for API errors
export class ApiClientError extends Error {
  public apiError: ApiError;
  
  constructor(apiError: ApiError) {
    super(apiError.message);
    this.apiError = apiError;
    this.name = 'ApiClientError';
  }
}

// Error handler utility
export function handleApiError(error: unknown): string {
  if (error instanceof ApiClientError) {
    const { apiError } = error;
    
    switch (apiError.status) {
      case 400:
        return apiError.message || '잘못된 요청입니다.';
      case 404:
        return apiError.message || '요청한 리소스를 찾을 수 없습니다.';
      case 500:
        return '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      default:
        return apiError.message || '알 수 없는 오류가 발생했습니다.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '알 수 없는 오류가 발생했습니다.';
}

// Singleton instance
export const apiClient = new ApiClient();
