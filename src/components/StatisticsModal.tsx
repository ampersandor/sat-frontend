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

  useEffect(() => {
    if (isOpen && jobId) {
      loadStatistics();
    }
  }, [isOpen, jobId]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await jobService.getStatistics(jobId);
      setStatistics(stats);
    } catch (err) {
      console.error('통계 로드 실패:', err);
      setError(err instanceof Error ? err.message : '통계를 불러오는데 실패했습니다.');
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-[#1a1b26] text-white rounded-lg p-4 max-w-4xl w-full mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">정렬 통계</h2>
            {jobName && (
              <p className="text-xs text-gray-400 mt-1">{jobName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {statistics && (
              <button
                onClick={handleCopyStatistics}
                className={`px-3 py-1.5 rounded text-sm transition-all duration-200 ${
                  copySuccess
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
                disabled={copySuccess}
              >
                {copySuccess ? '✓ 복사됨' : '📋 복사'}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-6">
            <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-gray-400 text-sm">통계 데이터를 불러오는 중...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-center">
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
          <div className="space-y-4">
            {/* 모든 통계를 하나의 그리드로 통합 */}
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {/* 기본 정보 */}
              <div className="bg-[#22252f] p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">총 시퀀스 수</p>
                <p className="text-white text-lg font-semibold">{formatNumber(statistics.totalSeq)}</p>
              </div>
              <div className="bg-[#22252f] p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">갭 시퀀스 수</p>
                <p className="text-white text-lg font-semibold">{formatNumber(statistics.gapSeqCount)}</p>
              </div>

              {/* 갭 정보 */}
              <div className="bg-[#22252f] p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">총 갭 개수</p>
                <p className="text-white text-lg font-semibold">{formatNumber(statistics.gapCount)}</p>
              </div>
              <div className="bg-[#22252f] p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">갭 빈도</p>
                <p className="text-white text-lg font-semibold">{formatNumber(statistics.gapFrequency)}</p>
              </div>
              <div className="bg-[#22252f] p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">갭 길이 합계</p>
                <p className="text-white text-lg font-semibold">{formatNumber(statistics.sumOfGapLength)}</p>
              </div>
              <div className="bg-[#22252f] p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">평균 갭 길이</p>
                <p className="text-white text-lg font-semibold">{formatNumber(statistics.gapLength)}</p>
              </div>

              {/* Blue Base 정보 */}
              <div className="bg-[#22252f] p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">Blue Base 합계</p>
                <p className="text-white text-lg font-semibold">{formatNumber(statistics.sumOfBlueBases)}</p>
              </div>
              <div className="bg-[#22252f] p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">Blue Base 없음</p>
                <p className="text-white text-lg font-semibold">{formatNumber(statistics.noBlueBases)}</p>
              </div>
              <div className="bg-[#22252f] p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">Blue Base 비율</p>
                <p className="text-white text-lg font-semibold">{formatPercentage(statistics.blueBaseRatio)}</p>
              </div>
              <div className="bg-[#22252f] p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">Blue Base 카운트</p>
                <div className="space-y-0.5">
                  {typeof statistics.blueBaseCount === 'object' && statistics.blueBaseCount ? (
                    <div className="text-[8px] text-white font-mono leading-tight">
                      {Object.entries(statistics.blueBaseCount).map(([key, value]) => (
                        <div key={key} className="mb-0.5">
                          {key}: {formatNumber(Number(value))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white text-lg font-semibold">{statistics.blueBaseCount}</p>
                  )}
                </div>
              </div>

              {/* Miss Base 정보 */}
              <div className="bg-[#22252f] p-3 rounded-lg">
                <p className="text-gray-400 text-xs mb-1">Miss Base 없음</p>
                <p className="text-white text-lg font-semibold">{formatNumber(statistics.noMissBases)}</p>
              </div>
            </div>

            {/* 요약 섹션을 더 컴팩트하게 */}
            <div className="border-t border-[#2a2b3a] pt-3">
              <h3 className="text-sm font-medium text-blue-400 mb-2">요약</h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-[#22252f] p-2 rounded">
                  <span className="text-gray-400 block">갭 시퀀스 비율</span>
                  <span className="text-white font-semibold">
                    {formatPercentage(statistics.gapSeqCount / statistics.totalSeq)}
                  </span>
                </div>
                <div className="bg-[#22252f] p-2 rounded">
                  <span className="text-gray-400 block">평균 갭 수/시퀀스</span>
                  <span className="text-white font-semibold">
                    {(statistics.gapCount / statistics.totalSeq).toFixed(2)}
                  </span>
                </div>
                <div className="bg-[#22252f] p-2 rounded">
                  <span className="text-gray-400 block">Blue Base 비율</span>
                  <span className="text-white font-semibold">
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
