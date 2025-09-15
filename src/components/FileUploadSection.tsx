import { useState, useRef, useCallback } from 'react';
import { uploadFile, deleteFile, startAlignment } from '../services/api';
import { AlignmentModal } from './AlignmentModal';
import { Toast } from './Toast';
import type { FileRecord, AlignmentRequest } from '../types';

// 로딩 스피너
function Spinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[99] bg-black/40">
      <div className="w-14 h-14 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

interface FileUploadSectionProps {
  files: FileRecord[];
  onFileUpload: (file: FileRecord) => void;
  onFileDelete: (fileId: string) => void;
}

export function FileUploadSection({ files, onFileUpload, onFileDelete }: FileUploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Toast 상태
  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
  }>({
    isVisible: false,
    message: '',
    type: 'success',
  });

  // Upload 확인 Modal 상태
  const [uploadConfirmModal, setUploadConfirmModal] = useState<{
    isOpen: boolean;
    selectedFile: File | null;
  }>({
    isOpen: false,
    selectedFile: null,
  });

  // Alignment Modal 상태 관리
  const [alignmentModal, setAlignmentModal] = useState<{
    isOpen: boolean;
    fileId: string | null;
    fileName: string;
  }>({
    isOpen: false,
    fileId: null,
    fileName: '',
  });

  // Delete 확인 Modal 상태 관리
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    fileId: string | null;
    fileName: string;
  }>({
    isOpen: false,
    fileId: null,
    fileName: '',
  });

  // Toast 표시 함수
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning') => {
    setToast({ isVisible: true, message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const file = droppedFiles[0];
    if (file) {
      setUploadConfirmModal({
        isOpen: true,
        selectedFile: file,
      });
    }
  }, []);

  // 업로드 확인 Modal에서 확인 클릭 시
  const handleUploadConfirm = useCallback(async () => {
    setUploadConfirmModal({ isOpen: false, selectedFile: null });
    setUploading(true);
    if (uploadConfirmModal.selectedFile) {
      await handleFileUpload(uploadConfirmModal.selectedFile);
    }
    setUploading(false);
  }, [uploadConfirmModal.selectedFile]);

  const handleUploadCancel = useCallback(() => {
    setUploadConfirmModal({
      isOpen: false,
      selectedFile: null,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file) return;
      const supportedExtensions = ['.fasta', '.fa', '.fastq', '.fq'];
      const fileName = file.name.toLowerCase();
      const isSupported = supportedExtensions.some((ext) => fileName.endsWith(ext));
      if (!isSupported) {
        showToast('지원하는 파일 형식: .fasta, .fa, .fastq, .fq', 'warning');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      try {
        console.log(file);
        const uploadResponse = await uploadFile(file);
        const newFile: FileRecord = {
          id: uploadResponse.fileId,
          filename: uploadResponse.fileName,
          createdAt: new Date().toISOString(),
          size: uploadResponse.size,
        };
        onFileUpload(newFile);
        showToast('파일이 성공적으로 업로드되었습니다.', 'success');
      } catch (error) {
        showToast('파일 업로드에 실패했습니다.', 'error');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [onFileUpload, showToast]
  );

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadConfirmModal({
        isOpen: true,
        selectedFile: file,
      });
    }
  }, []);

  const handleDeleteClick = useCallback((fileId: string, fileName: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      fileId,
      fileName,
    });
  }, []);

  const handleDeleteConfirm = useCallback(
    async () => {
      if (!deleteConfirmModal.fileId) return;
      
      try {
        await deleteFile(deleteConfirmModal.fileId);
        onFileDelete(deleteConfirmModal.fileId);
        showToast('파일이 성공적으로 삭제되었습니다.', 'success');
      } catch (error) {
        showToast('파일 삭제에 실패했습니다.', 'error');
      } finally {
        setDeleteConfirmModal({
          isOpen: false,
          fileId: null,
          fileName: '',
        });
      }
    },
    [deleteConfirmModal.fileId, onFileDelete, showToast]
  );

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmModal({
      isOpen: false,
      fileId: null,
      fileName: '',
    });
  }, []);

  const handleAlign = useCallback((fileId: string, fileName: string) => {
    setAlignmentModal({
      isOpen: true,
      fileId,
      fileName,
    });
  }, []);

  const handleAlignmentConfirm = useCallback(
    async (alignmentRequest: AlignmentRequest) => {
      if (!alignmentModal.fileId) return;
      try {
        const result = await startAlignment(alignmentModal.fileId, alignmentRequest);
        console.log('정렬 작업 시작됨:', result);
        showToast('정렬 작업이 시작되었습니다.', 'success');
      } catch (error) {
        showToast('정렬 작업을 시작할 수 없습니다.', 'error');
      }
    },
    [alignmentModal.fileId, showToast]
  );

  const handleAlignmentClose = useCallback(() => {
    setAlignmentModal({
      isOpen: false,
      fileId: null,
      fileName: '',
    });
  }, []);

  const formatFileSize = (size: string) => {
    if (size.includes('KB') || size.includes('MB') || size.includes('GB')) {
      return size;
    }
    const bytes = parseInt(size);
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))}MB`;
    return `${Math.round(bytes / (1024 * 1024 * 1024))}GB`;
  };

  return (
    <div className="w-full">
      <h2 className="text-text-primary text-xs mb-6">내 input 파일</h2>
      
      {/* 파일 업로드 영역 */}
      <div className="mb-4">
        <div 
          className={`w-full h-[151px] transition-colors flex flex-col items-center justify-center cursor-pointer bg-background-input border-2 border-dashed ${
            isDragging ? 'border-accent-primary bg-background-tertiary' : 'border-border'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <span className="text-xs mb-4 text-text-secondary">
            {uploading ? '업로드 중...' : '여기에 파일을 drag 하세요'}
          </span>
          {!uploading && (
            <button 
              className="px-4 py-1.5 text-xs rounded hover:bg-background-input transition-colors bg-background-tertiary text-text-secondary border border-border"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              파일찾기
            </button>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".fasta,.fa,.fastq,.fq"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>

      {/* 파일 목록 */}
      <div className="rounded bg-background-primary">
        <div 
          className="h-[524px] overflow-y-auto pr-2"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--scrollbar-thumb) var(--scrollbar-track)'
          }}
        >
          {files.map((file, index) => (
            <div key={file.id} className="flex items-center px-6 py-2 text-text-primary text-xs hover:bg-background-tertiary/50 transition-colors">
              <span className="w-4">{index + 1}</span>
              <span className="flex-1 ml-6 truncate" title={file.filename}>{file.filename}</span>
              <span className="w-12 ml-4">{formatFileSize(file.size.toString())}</span>
              <button 
                className="ml-4 px-3 py-1 text-white text-[10px] rounded hover:opacity-80 transition-opacity flex-shrink-0 bg-accent-secondary"
                onClick={() => handleAlign(file.id, file.filename)}
              >
                align
              </button>
              <button 
                className="ml-4 p-1 rounded bg-background-tertiary transition-colors flex-shrink-0 text-text-muted hover:text-status-error hover:bg-[var(--color-error-bg)]"
                onClick={() => handleDeleteClick(file.id, file.filename)}
                title="파일 삭제"
              >
                <svg 
                  width="14" 
                  height="14" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <polyline points="3,6 5,6 21,6"></polyline>
                  <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </button>
            </div>
          ))}
          
          {/* 빈 상태 메시지 */}
          {files.length === 0 && (
            <div className="flex items-center justify-center h-full text-text-muted text-xs">
              업로드된 파일이 없습니다
            </div>
          )}
        </div>
      </div>

      {/* Alignment Modal */}
      <AlignmentModal
        isOpen={alignmentModal.isOpen}
        onClose={handleAlignmentClose}
        onConfirm={handleAlignmentConfirm}
        fileName={alignmentModal.fileName}
      />

      {/* Upload Confirmation Modal */}
      {uploadConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background-card rounded-lg p-6 max-w-md w-full mx-4 border border-border">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-3">📁</span>
              <h3 className="text-lg font-semibold text-text-primary">파일 업로드 확인</h3>
            </div>
            <div className="mb-6">
              <p className="text-text-secondary mb-2">다음 파일을 업로드하시겠습니까?</p>
              <div className="bg-background-tertiary rounded p-3 border border-border">
                <div className="text-text-primary font-medium">
                  {uploadConfirmModal.selectedFile?.name}
                </div>
                <div className="text-text-muted text-sm">
                  크기: {uploadConfirmModal.selectedFile?.size ? `${Math.round(uploadConfirmModal.selectedFile.size / 1024)}KB` : 'Unknown'}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleUploadCancel}
                className="px-4 py-2 text-text-secondary border border-border rounded hover:bg-background-tertiary transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleUploadConfirm}
                className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-80 transition-opacity"
              >
                업로드
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background-card rounded-lg p-6 max-w-md w-full mx-4 border border-border">
            <div className="flex items-center mb-4">
              <span className="text-2xl mr-3">🗑️</span>
              <h3 className="text-lg font-semibold text-text-primary">파일 삭제 확인</h3>
            </div>
            <div className="mb-6">
              <p className="text-text-secondary mb-2">다음 파일을 삭제하시겠습니까?</p>
              <div className="bg-background-tertiary rounded p-3 border border-border">
                <div className="text-text-primary font-medium">
                  {deleteConfirmModal.fileName}
                </div>
                <div className="text-status-error text-sm">
                  ⚠️ 삭제된 파일은 복구할 수 없습니다.
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-text-secondary border border-border rounded hover:bg-background-tertiary transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-status-error text-white rounded hover:opacity-80 transition-opacity"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 업로드 중 애니메이션 */}
      {uploading && <Spinner />}

      {/* 토스트 알림 */}
      <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={closeToast} duration={3000} />
    </div>
  );
} 