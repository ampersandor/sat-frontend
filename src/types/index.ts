// Enums
export type JobStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';
export type ArtifactType = 'INPUT' | 'OUTPUT';
export type Tool = 'mafft' | 'uclust' | 'vsearch';

// DTOs matching backend API
export interface ArtifactDto {
  id: string;
  filename: string;
  directory: string;
  createdAt: string;
  size: number;
  artifactType: ArtifactType;
}

export interface JobDto {
  id: string;
  taskId: string;
  inputArtifactId: string;
  baseName: string;
  dirName: string;
  tool: Tool;
  options: string;
  createdAt: string;
  updatedAt: string;
  alignArtifactId: string;
  statArtifactId: string;
  jobStatus: JobStatus;
  message: string;
}

export interface JobRequest {
  tool: Tool;
  options: string;
}

// Legacy types for backward compatibility (to be deprecated)
export interface FileRecord {
  id: string;
  filename: string;
  directory?: string;
  createdAt: string;
  size: number;
}

export interface FileUploadResponse {
  fileId: string;
  fileName: string;
  size: number;
}

export interface AlignmentJob {
  taskId: string;
  baseName: string;
  inputArtifactId: string;
  alignTool: Tool;
  options: string;
  createdAt: string;
  updatedAt: string;
  alignArtifactId?: string;
  statArtifactId?: string;
  status: JobStatus;
  progress?: number;
  message?: string;
}

export interface AlignmentRequest {
  user_id?: number;
  align_tool?: Tool;
  tool?: Tool;
  options: string;
}

export interface AlignmentJobResponse {
  taskId: string;
  inputArtifactId: string;
  alignTool: Tool;
  options: string;
  createdAt: string;
  updatedAt: string;
  alignArtifactId?: string;
  statArtifactId?: string;
  status: JobStatus;
  message?: string;
}

// Health API 타입
export interface HealthResponse {
  status: "UP" | "DOWN";
  timestamp: string;
  details: string;
}

// Error handling
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}

// Pagination
export interface PagedResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      sorted: boolean;
      ascending: boolean;
    };
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  first: boolean;
  numberOfElements: number;
}

// UI 관련 타입
export interface FilterOption {
  label: string;
  value: string;
  type: 'input' | 'tool' | 'user';
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export interface JobStatistics {
  totalSeq: number;
  gapSeqCount: number;
  gapCount: number;
  gapFrequency: number;
  sumOfGapLength: number;
  gapLength: number;
  sumOfBlueBases: number;
  noBlueBases: number;
  noMissBases: number;
  blueBaseRatio: number;
  blueBaseCount: string;
} 