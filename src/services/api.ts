import type { FileRecord, FileUploadResponse, AlignmentRequest, AlignmentJobResponse, AlignmentJob, HealthResponse, JobDto, JobRequest } from '../types';
import { artifactService } from './artifactService';
import { analysisService } from './analysisService';
import { jobService } from './jobService';
import { healthService } from './healthService';

// Re-export services for direct usage
export { artifactService, analysisService, jobService, healthService };
export type { JobFilter } from './jobService';

// Legacy API wrapper functions for backward compatibility
// These will be deprecated in future versions

// 파일 업로드
export async function uploadFile(file: File): Promise<FileUploadResponse> {
  try {
    const artifact = await artifactService.upload(file);
    
    // Convert ArtifactDto to FileUploadResponse
    return {
      fileId: artifact.id,
      fileName: artifact.filename,
      size: artifact.size,
    };
  } catch (error) {
    console.error('File upload error:', error);
    throw new Error('파일 업로드에 실패했습니다.');
  }
}

// 파일 목록 조회
export async function getFileList(): Promise<FileRecord[]> {
  try {
    const artifacts = await artifactService.list('INPUT');
    
    // Convert ArtifactDto[] to FileRecord[]
    return artifacts.map(artifact => ({
      id: artifact.id,
      filename: artifact.filename,
      directory: artifact.directory,
      createdAt: artifact.createdAt,
      size: artifact.size,
    }));
  } catch (error) {
    console.error('Get file list error:', error);
    throw new Error('파일 목록을 가져올 수 없습니다.');
  }
}

// 파일 다운로드
export async function downloadFile(fileId: number, filename: string): Promise<void> {
  try {
    await artifactService.download(fileId.toString(), filename);
    console.log(`✅ 파일 다운로드 완료: ${filename}`);
  } catch (error) {
    console.error('❌ 파일 다운로드 오류:', error);
    throw new Error('파일 다운로드에 실패했습니다.');
  }
}

// 정렬 작업 시작
export async function startAlignment(
  fileId: string, 
  request: AlignmentRequest
): Promise<AlignmentJobResponse> {
  try {
    // Convert AlignmentRequest to JobRequest
    const alignJobRequest: JobRequest = {
      tool: request.tool || request.align_tool || 'mafft',
      options: request.options,
    };

    const job = await analysisService.startAlignment(fileId.toString(), alignJobRequest);
    
    // Convert JobDto to AlignmentJobResponse
    return {
      taskId: job.taskId,
      inputArtifactId: job.inputArtifactId,
      alignTool: job.tool,
      options: job.options,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      alignArtifactId: job.alignArtifactId,
      statArtifactId: job.statArtifactId,
      status: job.jobStatus,
      message: job.message,
    };
  } catch (error) {
    console.error('Start alignment error:', error);
    throw new Error('정렬 작업을 시작할 수 없습니다.');
  }
}

// 백엔드 서버 상태 확인 (새로운 health API 사용)
export async function checkServerHealth(): Promise<HealthResponse | null> {
  return healthService.check();
}

// 정렬 작업 목록 조회 (페이징)
export async function getAlignmentJobs(page: number = 1, size: number = 10): Promise<AlignmentJob[]> {
  try {
    // Note: The page parameter is 0-based in Spring Boot
    const pagedResponse = await jobService.list(page - 1, size);
    
    // Convert JobDto[] to AlignmentJob[]
    return pagedResponse.content.map(job => ({
      taskId: job.taskId,
      baseName: job.baseName,
      inputArtifactId: job.inputArtifactId,
      alignTool: job.tool,
      options: job.options,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      alignArtifactId: job.alignArtifactId,
      statArtifactId: job.statArtifactId,
      status: job.jobStatus,
      message: job.message,
    }));
  } catch (error) {
    console.error('Get alignment jobs error:', error);
    throw new Error('정렬 작업 목록을 가져올 수 없습니다.');
  }
}

// SSE 연결을 위한 함수 (업데이트만 처리하도록 수정)
export function createSSEConnection(
  onMessage: (job: AlignmentJob) => void, 
  onError?: (error: Event) => void,
  onOpen?: () => void
): { eventSource: EventSource | null; cleanup: () => void } {
  // Create JobMonitor with JobDto to AlignmentJob conversion
  const monitor = jobService.createSSEConnection(
    (jobDto: JobDto) => {
      // Convert JobDto to AlignmentJob for backward compatibility
      const alignmentJob: AlignmentJob = {
        taskId: jobDto.taskId,
        baseName: jobDto.baseName,
        inputArtifactId: jobDto.inputArtifactId,
        alignTool: jobDto.tool,
        options: jobDto.options,
        createdAt: jobDto.createdAt,
        updatedAt: jobDto.updatedAt,
        alignArtifactId: jobDto.alignArtifactId,
        statArtifactId: jobDto.statArtifactId,
        status: jobDto.jobStatus,
        message: jobDto.message,
      };
      
      console.log('📨 SSE 업데이트 수신:', alignmentJob);
      onMessage(alignmentJob);
    },
    onError,
    onOpen
  );

  // Return legacy interface
  return {
    eventSource: null, // JobMonitor handles the EventSource internally
    cleanup: () => monitor.disconnect(),
  };
}

// 파일 삭제 (API 문서에는 없지만 UI에서 필요)
export async function deleteFile(fileId: string): Promise<void> {
  try {
    await artifactService.delete(fileId.toString());
  } catch (error) {
    console.error('Delete file error:', error);
    throw new Error('파일 삭제에 실패했습니다.');
  }
} 