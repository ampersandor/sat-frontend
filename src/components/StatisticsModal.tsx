import { useEffect, useState } from 'react';
import { jobService } from '../services/jobService';
import type { JobStatistics } from '../types';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobName?: string;
}

export function StatisticsModal({ isOpen, onClose, jobId, jobName }: StatisticsModalProps) {
  const [statistics, setStatistics] = useState<JobStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen && jobId) {
      // 모달이 열릴 때 약간의 지연 후 로딩 시작 (부드러운 전환)
      setTimeout(() => {
        loadStatistics();
      }, 150);
    }
    // 모달이 닫힐 때 상태 초기화
    if (!isOpen) {
      setStatistics(null);
      setError(null);
      setShowContent(false);
    }
  }, [isOpen, jobId]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // 모달 열릴 때 배경 스크롤 막기
  useEffect(() => {
    if (isOpen) {
      // 현재 스크롤 위치 저장
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // 모달 닫을 때 스크롤 복원
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      setShowContent(false);
      
      // 최소 로딩 시간 보장 (800ms)
      const [stats] = await Promise.all([
        jobService.getStatistics(jobId),
        new Promise(resolve => setTimeout(resolve, 300))
      ]);
      
      setStatistics(stats);
      
      // 약간의 지연 후 콘텐츠 표시 (페이드 인 효과)
      setTimeout(() => {
        setShowContent(true);
      }, 100);
      
    } catch (err) {
      console.error('통계 로드 실패:', err);
      setError(err instanceof Error ? err.message : '통계를 불러오는데 실패했습니다.');
      setTimeout(() => {
        setShowContent(true);
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('ko-KR');
  };

  const formatPercentage = (ratio: number) => {
    return `${(ratio * 100).toFixed(2)}%`;
  };

  const generateStatisticsText = (stats: JobStatistics) => {
    const blueBaseCountText = typeof stats.blueBaseCount === 'object' && stats.blueBaseCount
      ? Object.entries(stats.blueBaseCount).map(([key, value]) => `  ${key}: ${formatNumber(Number(value))}`).join('\n')
      : stats.blueBaseCount.toString();

    return `정렬 통계 - ${jobName || 'Job'}

Total Seq: ${formatNumber(stats.totalSeq)}
Gap Seq Count: ${formatNumber(stats.gapSeqCount)}
Gap Count: ${formatNumber(stats.gapCount)}
Gap Frequency: ${formatNumber(stats.gapFrequency)}
Sum of Gap Length: ${formatNumber(stats.sumOfGapLength)}
Gap Length: ${formatNumber(stats.gapLength)}
Sum of Blue Bases: ${formatNumber(stats.sumOfBlueBases)}
No Blue Bases: ${formatNumber(stats.noBlueBases)}
No Miss Bases: ${formatNumber(stats.noMissBases)}
Blue Base Ratio: ${formatPercentage(stats.blueBaseRatio)}
Blue Base:
${blueBaseCountText}`;
  };

  const handleCopyStatistics = async () => {
    if (!statistics) return;

    try {
      await navigator.clipboard.writeText(generateStatisticsText(statistics));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
      // 폴백: 텍스트 선택
      const textArea = document.createElement('textarea');
      textArea.value = generateStatisticsText(statistics);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // 배경 클릭 시 모달 닫기
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black flex items-center justify-center z-50 transition-all duration-300 ease-in-out ${
        isOpen ? 'bg-opacity-50' : 'bg-opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div className={`bg-background-primary text-white rounded-lg p-4 max-w-4xl w-full mx-4 max-h-[85vh] min-h-[400px] overflow-y-auto transition-all duration-300 ease-in-out transform ${
        isOpen 
          ? 'opacity-100 scale-100 translate-y-0' 
          : 'opacity-0 scale-95 translate-y-4'
      }`}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">정렬 통계</h2>
            {jobName && (
              <p className="text-xs text-text-muted mt-1">{jobName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {statistics && (
              <button
                onClick={handleCopyStatistics}
                className={`px-3 py-1.5 rounded text-sm transition-all duration-200 ${
                  copySuccess
                    ? 'bg-status-success text-text-primary'
                    : 'bg-status-info hover:bg-status-info-hover text-text-primary'
                }`}
                disabled={copySuccess}
              >
                {copySuccess ? '✓ 복사됨' : '📋 복사'}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-status-error hover:text-text-primary bg-background-primary hover:bg-background-secondary rounded-full transition-all duration-200 text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col justify-center items-center py-16 transition-all duration-300 ease-in-out animate-fade-in">
            <div className="relative mb-6">
              {/* 메인 스피너 */}
              <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin transition-all duration-300" />
              {/* 보조 스피너 */}
              <div className="absolute inset-2 w-12 h-12 border-4 border-transparent border-r-blue-400 rounded-full animate-spin-slow transition-all duration-300" />
              {/* 중앙 점 */}
              <div className="absolute inset-6 w-4 h-4 bg-blue-500 rounded-full animate-pulse transition-all duration-300" />
            </div>
            <div className="text-center space-y-2 transition-all duration-500 ease-in-out">
              <p className="text-gray-200 text-base font-medium transition-opacity duration-300">통계 데이터를 불러오는 중...</p>
              <p className="text-gray-400 text-sm transition-opacity duration-300 delay-100">정렬 결과를 분석하고 있습니다</p>
              <div className="flex justify-center mt-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce transition-all duration-200" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce transition-all duration-200" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce transition-all duration-200" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className={`bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-center transition-all duration-500 ease-in-out ${
            showContent 
              ? 'opacity-100 transform translate-y-0' 
              : 'opacity-0 transform translate-y-4'
          }`}>
            <p className="font-medium text-sm">오류 발생</p>
            <p className="text-xs mt-1">{error}</p>
            <button
              onClick={loadStatistics}
              className="mt-2 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs transition-colors"
            >
              다시 시도
            </button>
          </div>
        )}

        {statistics && !loading && (
          <div className={`space-y-4 transition-all duration-500 ease-in-out ${
            showContent 
              ? 'opacity-100 transform translate-y-0' 
              : 'opacity-0 transform translate-y-4'
          }`}>
            {/* 모든 통계를 하나의 그리드로 통합 */}
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {/* 기본 정보 */}
              <div className="bg-background-secondary p-3 rounded-lg">
                <p className="text-text-muted text-xs mb-1">총 시퀀스 수</p>
                <p className="text-text-primary text-lg font-semibold">{formatNumber(statistics.totalSeq)}</p>
              </div>
              <div className="bg-background-secondary p-3 rounded-lg">
                <p className="text-text-muted text-xs mb-1">갭 시퀀스 수</p>
                <p className="text-text-primary text-lg font-semibold">{formatNumber(statistics.gapSeqCount)}</p>
              </div>

              {/* 갭 정보 */}
              <div className="bg-background-secondary p-3 rounded-lg">
                <p className="text-text-muted text-xs mb-1">총 갭 개수</p>
                <p className="text-text-primary text-lg font-semibold">{formatNumber(statistics.gapCount)}</p>
              </div>
              <div className="bg-background-secondary p-3 rounded-lg">
                <p className="text-text-muted text-xs mb-1">갭 빈도</p>
                <p className="text-text-primary text-lg font-semibold">{formatNumber(statistics.gapFrequency)}</p>
              </div>
              <div className="bg-background-secondary p-3 rounded-lg">
                <p className="text-text-muted text-xs mb-1">갭 길이 합계</p>
                <p className="text-text-primary text-lg font-semibold">{formatNumber(statistics.sumOfGapLength)}</p>
              </div>
              <div className="bg-background-secondary p-3 rounded-lg">
                <p className="text-text-muted text-xs mb-1">평균 갭 길이</p>
                <p className="text-text-primary text-lg font-semibold">{formatNumber(statistics.gapLength)}</p>
              </div>

              {/* Blue Base 정보 */}
              <div className="bg-background-secondary p-3 rounded-lg">
                <p className="text-text-muted text-xs mb-1">Blue Base 합계</p>
                <p className="text-text-primary text-lg font-semibold">{formatNumber(statistics.sumOfBlueBases)}</p>
              </div>
              <div className="bg-background-secondary p-3 rounded-lg">
                <p className="text-text-muted text-xs mb-1">Blue Base 없음</p>
                <p className="text-text-primary text-lg font-semibold">{formatNumber(statistics.noBlueBases)}</p>
              </div>
              <div className="bg-background-secondary p-3 rounded-lg">
                <p className="text-text-muted text-xs mb-1">Blue Base 비율</p>
                <p className="text-text-primary text-lg font-semibold">{formatPercentage(statistics.blueBaseRatio)}</p>
              </div>
              <div className="bg-background-secondary p-3 rounded-lg">
                <p className="text-text-muted text-xs mb-1">Blue Base 카운트</p>
                <div className="space-y-0.5">
                  {typeof statistics.blueBaseCount === 'object' && statistics.blueBaseCount ? (
                    <textarea
                      className="w-full h-28 p-2 bg-background-primary border border-gray-600 rounded text-text-primary font-mono text-xs leading-tight resize-none focus:outline-none focus:border-blue-400 transition-colors overflow-y-auto"
                      readOnly
                      value={Object.entries(statistics.blueBaseCount)
                        .map(([key, value]) => `${key}: ${formatNumber(Number(value))}`)
                        .join('\n')}
                    />
                  ) : (
                    <textarea
                      className="w-full h-28 p-2 bg-background-primary border border-gray-600 rounded text-text-primary font-mono text-xs leading-tight resize-none focus:outline-none focus:border-blue-400 transition-colors"
                      readOnly
                      value={statistics.blueBaseCount.toString()}
                    />
                  )}
                </div>
              </div>

              {/* Miss Base 정보 */}
              <div className="bg-background-secondary p-3 rounded-lg">
                <p className="text-text-muted text-xs mb-1">Miss Base 없음</p>
                <p className="text-text-primary text-lg font-semibold">{formatNumber(statistics.noMissBases)}</p>
              </div>
            </div>

            {/* 요약 섹션을 더 컴팩트하게 */}
            <div className="border-t border-[#2a2b3a] pt-3">
              <h3 className="text-sm font-medium text-blue-400 mb-2">요약</h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-background-secondary p-2 rounded">
                  <span className="text-text-muted block">갭 시퀀스 비율</span>
                  <span className="text-text-primary font-semibold">
                    {formatPercentage(statistics.gapSeqCount / statistics.totalSeq)}
                  </span>
                </div>
                <div className="bg-background-secondary p-2 rounded">
                  <span className="text-text-muted block">평균 갭 수/시퀀스</span>
                  <span className="text-text-primary font-semibold">
                    {(statistics.gapCount / statistics.totalSeq).toFixed(2)}
                  </span>
                </div>
                <div className="bg-background-secondary p-2 rounded">
                  <span className="text-text-muted block">Blue Base 비율</span>
                  <span className="text-text-primary font-semibold">
                    {formatPercentage(statistics.blueBaseRatio)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 닫기 버튼 */}
        <div className="flex justify-end mt-4 pt-3 border-t border-[#2a2b3a]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
