import { apiClient, handleApiError } from './apiClient';
import type { JobDto, PagedResponse, JobStatistics } from '../types';

export interface JobFilter {
  inputArtifactId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  tool?: string;
}

export class JobService {
  /**
   * Get paginated list of jobs with optional filters
   */
  async list(page: number = 0, size: number = 10, filters?: JobFilter): Promise<PagedResponse<JobDto>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });

      if (filters?.inputArtifactId) {
        params.append('inputArtifactId', filters.inputArtifactId);
      }
      if (filters?.startDate) {
        params.append('startDate', filters.startDate);
      }
      if (filters?.endDate) {
        params.append('endDate', filters.endDate);
      }
      if (filters?.status) {
        params.append('status', filters.status);
      }
      if (filters?.tool) {
        params.append('tool', filters.tool);
      }

      return await apiClient.get<PagedResponse<JobDto>>(`/jobs?${params.toString()}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Get job statistics
   */
  async getStatistics(jobId: string): Promise<JobStatistics> {
    try {
      return await apiClient.get<JobStatistics>(`/jobs/statistic/${jobId}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  /**
   * Create SSE connection for real-time job updates
   */
  createSSEConnection(
    onMessage: (job: JobDto) => void,
    onError?: (error: Event) => void,
    onOpen?: () => void
  ): JobMonitor {
    return new JobMonitor(onMessage, onError, onOpen);
  }
}

/**
 * JobMonitor class for handling Server-Sent Events
 */
export class JobMonitor {
  private eventSource: EventSource | null = null;
  private apiUrl: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay: number;
  private onMessage: (job: JobDto) => void;
  private onError?: (error: Event) => void;
  private onOpen?: () => void;
  private isConnected = false;

  constructor(
    onMessage: (job: JobDto) => void,
    onError?: (error: Event) => void,
    onOpen?: () => void
  ) {
    this.onMessage = onMessage;
    this.onError = onError;
    this.onOpen = onOpen;
    // In development, use the proxy path to avoid CORS issues
    this.apiUrl = import.meta.env.DEV 
      ? '/api' 
      : (import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1');
    this.reconnectDelay = parseInt(import.meta.env.VITE_SSE_RECONNECT_DELAY || '5000');
    this.connect();
  }

  private connect(): void {
    if (this.eventSource?.readyState === EventSource.OPEN) {
      return;
    }

    try {
      console.log('🔌 SSE 연결 시도:', `${this.apiUrl}/jobs/sse`);
      this.eventSource = new EventSource(`${this.apiUrl}/jobs/sse`);

      this.eventSource.onopen = () => {
        console.log('✅ SSE connection established');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.onOpen?.();
      };

      this.eventSource.onmessage = (event) => {
        try {
          console.log('📨 SSE 메시지 수신:', event.data);
          const job: JobDto = JSON.parse(event.data);
          
          // KEEP_ALIVE 메시지만 필터링하고, 유효한 작업 ID가 있으면 처리
          if (job.id && (!job.taskId || job.taskId !== 'KEEP_ALIVE')) {
            console.log('✅ 유효한 작업 업데이트:', {
              id: job.id,
              taskId: job.taskId || 'N/A',
              status: job.jobStatus,
              baseName: job.baseName
            });
            this.onMessage(job);
          } else {
            console.log('⏭️ KEEP_ALIVE 또는 무효한 메시지 무시');
          }
        } catch (error) {
          console.error('❌ SSE 메시지 파싱 실패:', error);
          console.info('원본 데이터:', event.data);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        this.isConnected = false;
        this.onError?.(error);
        
        this.disconnect();
        this.scheduleReconnect();
      };
    } catch (error) {
      console.error('Failed to create SSE connection:', error);
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnecting in ${this.reconnectDelay}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.reconnectAttempts = 0;
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  // 연결 상태 확인 메서드 추가
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const jobService = new JobService();
