import { useState, useEffect, useCallback } from 'react';
import { Navigation } from './components/Navigation';
import { FileUploadSection } from './components/FileUploadSection';
import { InfiniteJobList } from './components/InfiniteJobList';
import { getFileList, checkServerHealth } from './services/api';
import type { FileRecord, HealthResponse } from './types';

function App() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serverHealth, setServerHealth] = useState<HealthResponse | null>(null);

  // 서버 상태 모니터링
  useEffect(() => {
    const checkHealth = async () => {
      const health = await checkServerHealth();
      setServerHealth(health);
    };

    checkHealth();
    const healthInterval = setInterval(checkHealth, 30000);

    return () => clearInterval(healthInterval);
  }, []);

  // 초기 파일 목록 로드
  useEffect(() => {
    const loadInitialFiles = async () => {
      try {
        console.log('📁 초기 파일 목록을 로드합니다...');
        const fileList = await getFileList();
        setFiles(fileList);
        console.log('✅ 파일 목록 로드 완료:', fileList.length, '개');
      } catch (error) {
        console.error('❌ 파일 목록 로드 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialFiles();
  }, []);

  const handleFileUpload = useCallback((newFile: FileRecord) => {
    setFiles(prev => [newFile, ...prev]);
  }, []);

  const handleFileDelete = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-primary font-inter flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-primary font-inter">
      <Navigation />
      
      {/* 서버 상태 및 연결 상태 표시 */}
      <div className="px-8 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-xs">
            {/* 서버 상태 */}
            <div className="flex items-center space-x-2">
              <span className="text-text-secondary">서버:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                serverHealth?.status === 'UP' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {serverHealth?.status === 'UP' ? '🟢 정상' : '🔴 오류'}
              </span>
              {serverHealth?.timestamp && (
                <span className="text-text-secondary text-[10px]">
                  {new Date(serverHealth.timestamp).toLocaleTimeString('ko-KR')}
                </span>
              )}
            </div>
          </div>
          
          <div className="text-xs text-text-secondary">
            파일 {files.length}개
          </div>
        </div>
        
        {/* 서버 상세 정보 */}
        {serverHealth?.details && (
          <div className="mt-1 text-text-secondary text-[10px]">
            {serverHealth.details}
          </div>
        )}
      </div>
      
      <div className="flex min-h-0">
        {/* 왼쪽 사이드바 - 파일 업로드 */}
        <div className="w-[431px] flex-shrink-0 p-8">
          <FileUploadSection 
            files={files}
            onFileUpload={handleFileUpload}
            onFileDelete={handleFileDelete}
          />
        </div>

        {/* 메인 영역 - 작업 목록 */}
        <div className="flex-1 min-w-0 p-8 pl-0">
          <InfiniteJobList />
        </div>
      </div>
    </div>
  );
}

export default App;
