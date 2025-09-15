import { apiClient, handleApiError } from './apiClient';
import type { JobDto, JobRequest } from '../types';

export class AnalysisService {
  /**
   * Start an alignment job
   */
  async startAlignment(artifactId: string, request: JobRequest): Promise<JobDto> {
    try {
      return await apiClient.post<JobDto>(`/analyze/align/${artifactId}`, request);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

export const analysisService = new AnalysisService();
