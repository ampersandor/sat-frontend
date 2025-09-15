import { apiClient } from './apiClient';
import type { HealthResponse } from '../types';

export class HealthService {
  /**
   * Check server health status
   */
  async check(): Promise<HealthResponse | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await apiClient.get<HealthResponse>('/health', {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      console.warn('Health check failed:', error);
      return null;
    }
  }
}

export const healthService = new HealthService();
