import { apiClient, handleApiError } from './apiClient';
import type { ArtifactDto, ArtifactType } from '../types';

export class ArtifactService {
  /**
   * Upload a file
   */
  async upload(file: File): Promise<ArtifactDto> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      return await apiClient.post<ArtifactDto>('/artifact/upload', formData);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * List artifacts by type
   */
  async list(artifactType: ArtifactType): Promise<ArtifactDto[]> {
    try {
      return await apiClient.get<ArtifactDto[]>(`/artifact/list/${artifactType}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Download an artifact
   */
  async download(artifactId: string, filename: string): Promise<void> {
    try {
      const blob = await apiClient.download(`/artifact/download/${artifactId}`);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Delete an artifact (if supported by backend)
   * Note: This endpoint is not in the API specification, 
   * so it might not work. Consider removing if not supported.
   */
  async delete(artifactId: string): Promise<void> {
    try {
      await apiClient.delete(`/artifact/${artifactId}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

export const artifactService = new ArtifactService();
