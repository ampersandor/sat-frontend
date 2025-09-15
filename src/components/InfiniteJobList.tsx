// File: src/components/InfiniteJobList.tsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { jobService, artifactService, getFileList } from '../services/api';
import { DateRangePicker, type DateRange } from './DateRangePicker';
import { StatisticsModal } from './StatisticsModal';
import type { JobFilter } from '../services/api';
import type { JobDto, FileRecord } from '../types';


const toKey = (id: string | number) => String(id);

const matchesFilter = (job: JobDto, filters: JobFilter, dateRange: DateRange): boolean => {
  // 입력 파일 필터
  if (filters.inputArtifactId && String(job.inputArtifactId) !== filters.inputArtifactId) {
    return false;
  }
  
  // 도구 필터
  if (filters.tool && job.tool !== filters.tool) {
    return false;
  }
  
  // 상태 필터
  if (filters.status && job.jobStatus !== filters.status) {
    return false;
  }
  
  // 날짜 범위 필터
  if (dateRange.startDate || dateRange.endDate) {
    const jobDate = job.createdAt ? job.createdAt.split('T')[0] : '';
    
    if (dateRange.startDate && jobDate < dateRange.startDate) {
      return false;
    }
    
    if (dateRange.endDate && jobDate > dateRange.endDate) {
      return false;
    }
  }
  
  return true;
};

export function InfiniteJobList() {
  const [realtimeJobs, setRealtimeJobs] = useState<Map<string, JobDto>>(new Map());
  const [filters, setFilters] = useState<JobFilter>({});
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({});
  const [statisticsModal, setStatisticsModal] = useState<{
    isOpen: boolean;
    jobId: string;
    jobName: string;
  }>({
    isOpen: false,
    jobId: '',
    jobName: '',
  });

  // Load file list for filter dropdown
  useEffect(() => {
    getFileList().then(setFiles).catch(console.error);
  }, []);

  const {
    items: jobs,
    loading,
    error,
    hasMore,
    observerTarget,
    reset,
  } = useInfiniteScroll<JobDto>({
    fetcher: (page, size) => jobService.list(page, size, filters),
    pageSize: 10,
  });

  // Update filters when date range changes
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }));
  }, [dateRange]);

  // Reset list when filters or sort option change
  useEffect(() => {
    if (Object.keys(filters).length > 0 || jobs.length > 0) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // 필터 변경 시 realtimeJobs Map에서 조건에 맞지 않는 작업들 정리
  useEffect(() => {
    setRealtimeJobs(prev => {
      const filtered = new Map<string, JobDto>();
      prev.forEach((job, id) => {
        if (matchesFilter(job, filters, dateRange)) {
          filtered.set(id, job);
        } else {
          console.log('🧹 필터 조건에 맞지 않는 실시간 작업 제거:', {
            id: job.id,
            baseName: job.baseName,
            status: job.jobStatus
          });
        }
      });
      return filtered;
    });
  }, [filters, dateRange]);

  // SSE 실시간 업데이트 수신
  useEffect(() => {
    const monitor = jobService.createSSEConnection(
      (updatedJob: JobDto) => {
        console.log('🔄 SSE 업데이트 수신:', {
          id: updatedJob.id,
          status: updatedJob.jobStatus,
          baseName: updatedJob.baseName
        });
        
        // ID를 안정적으로 문자열로 정규화
        const k = toKey(updatedJob.id);
        
        setRealtimeJobs(prev => {
          const next = new Map(prev);
          const existing = next.get(k);
          
          // 최신 데이터로 완전히 교체 (기존 데이터와 병합하지 않음)
          const updated = { ...updatedJob };
          
          console.log('📝 실시간 작업 업데이트:', {
            key: k,
            existing: existing ? { 
              status: existing.jobStatus, 
              baseName: existing.baseName,
              taskId: existing.taskId || 'N/A',
              updatedAt: existing.updatedAt
            } : null,
            updated: { 
              status: updated.jobStatus, 
              baseName: updated.baseName,
              taskId: updated.taskId || 'N/A',
              updatedAt: updated.updatedAt
            },
            isNewer: !existing || (updated.updatedAt && existing.updatedAt && updated.updatedAt >= existing.updatedAt)
          });
          
          // 최신 데이터인지 확인 후 업데이트
          if (!existing || !updated.updatedAt || !existing.updatedAt || updated.updatedAt >= existing.updatedAt) {
            next.set(k, updated);
            console.log('✅ 작업 상태 업데이트됨:', { id: k, status: updated.jobStatus });
          } else {
            console.log('⏭️ 이전 데이터이므로 무시:', { id: k, existing: existing.updatedAt, updated: updated.updatedAt });
          }
          
          return next;
        });

        // 새로운 작업은 realtimeJobs Map에 저장되어 displayJobs에서 자동으로 처리됨
      },
      (err) => {
        console.error('SSE 오류:', err);
      },
      () => {
        console.log('✅ SSE 연결됨');
      }
    );

    return () => {
      console.log('🔌 SSE 연결 해제 (컴포넌트 언마운트 시에만)');
      monitor.disconnect();
    };
  }, []);

  // 실시간 업데이트와 페이징 데이터 병합(렌더링마다 최신 맵 참조)
  const displayJobs = useMemo(() => {
    // 기존 jobs 배열의 작업들을 실시간 데이터와 병합
    const existingJobs = jobs.map(job => {
      const live = realtimeJobs.get(toKey(job.id));
      const merged = live ? { ...job, ...live } : job;
      
      // 디버깅: 업데이트가 있는지 확인
      if (live) {
        console.log('🔄 displayJobs 병합:', {
          id: job.id,
          original: job.jobStatus,
          live: live.jobStatus,
          merged: merged.jobStatus,
          baseName: job.baseName,
          hasChange: live.jobStatus !== job.jobStatus
        });
      }
      
      return merged;
    });

    // realtimeJobs에만 있는 새로운 작업들 추가 (필터링 적용)
    const newJobs: JobDto[] = [];
    realtimeJobs.forEach((realtimeJob, id) => {
      const existsInJobs = jobs.some(job => toKey(job.id) === id);
      if (!existsInJobs) {
        // 실시간 작업도 현재 필터 조건에 맞는지 검사
        if (matchesFilter(realtimeJob, filters, dateRange)) {
          console.log('🆕 새로운 작업을 displayJobs에 추가 (필터 통과):', {
            id: realtimeJob.id,
            baseName: realtimeJob.baseName,
            status: realtimeJob.jobStatus
          });
          newJobs.push(realtimeJob);
        } else {
          console.log('⏭️ 새로운 작업이 필터 조건에 맞지 않아 제외:', {
            id: realtimeJob.id,
            baseName: realtimeJob.baseName,
            status: realtimeJob.jobStatus,
            filters: filters,
            dateRange: dateRange
          });
        }
      }
    });

    // 새로운 작업을 맨 앞에 추가하고 중복 제거
    const allJobs = [...newJobs, ...existingJobs];
    
    // ID 기준으로 중복 제거 (최신 데이터 우선)
    const uniqueJobs = new Map<string, JobDto>();
    allJobs.forEach(job => {
      const key = toKey(job.id);
      const existing = uniqueJobs.get(key);
      
      // 기존 작업이 없거나, 새로운 작업이 더 최신이면 업데이트
      if (!existing || (job.updatedAt && existing.updatedAt && job.updatedAt >= existing.updatedAt)) {
        uniqueJobs.set(key, job);
      }
    });
    
    // Map을 배열로 변환하고 생성 시간 순으로 정렬
    const finalJobs = Array.from(uniqueJobs.values());
    return finalJobs.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA; // 최신 순
    });
  }, [jobs, realtimeJobs, filters, dateRange]);

  const handleFilterChange = useCallback((newFilters: Partial<JobFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters } as JobFilter));
  }, []);

  const handleDateRangeChange = useCallback((range: DateRange) => {
    setDateRange(range);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setDateRange({});
  }, []);

  const handleJobClick = useCallback((job: JobDto) => {
    // 통계 모달을 열기 위해서는 작업이 완료되어야 함
    if (job.jobStatus === 'SUCCESS') {
      setStatisticsModal({
        isOpen: true,
        jobId: job.id,
        jobName: job.baseName,
      });
    }
  }, []);

  const handleCloseStatisticsModal = useCallback(() => {
    setStatisticsModal({
      isOpen: false,
      jobId: '',
      jobName: '',
    });
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-background-primary rounded-lg"
         style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--scrollbar-thumb) var(--scrollbar-track)' }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-text-primary text-base font-semibold">
          작업 목록
          {(() => {
            const activeFilters = [
              filters.inputArtifactId && '파일',
              filters.tool && '도구',
              (dateRange.startDate || dateRange.endDate) && '날짜',
              filters.status && '상태'
            ].filter(Boolean);
            return activeFilters.length > 0 && (
              <span className="ml-2 text-xs text-accent-primary font-normal">
                ({activeFilters.join(', ')} 필터 적용됨)
              </span>
            );
          })()}
        </h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="text-sm bg-background-tertiary text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
        >
          {showFilters ? '필터 숨기기' : '필터 표시'}
          <span className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}>▼</span>
        </button>
      </div>

      {/* Filter Section */}
      {showFilters && (
        <div className="mb-4 p-4 bg-background-card rounded-lg border border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Input File Filter */}
            <div>
              <label className="block text-xs text-text-secondary mb-2">입력 파일</label>
              <select
                value={filters.inputArtifactId || ''}
                onChange={(e) => handleFilterChange({ inputArtifactId: e.target.value || undefined })}
                className="w-full px-3 py-2 bg-background-input text-text-primary text-sm rounded border border-border focus:border-accent-primary focus:outline-none"
              >
                <option value="">전체</option>
                {files.map(file => (
                  <option key={file.id} value={String(file.id)}>{file.filename}</option>
                ))}
              </select>
            </div>

            {/* Tool Filter */}
            <div>
              <label className="block text-xs text-text-secondary mb-2">도구</label>
              <select
                value={filters.tool || ''}
                onChange={(e) => handleFilterChange({ tool: e.target.value || undefined })}
                className="w-full px-3 py-2 bg-background-input text-text-primary text-sm rounded border border-border focus:border-accent-primary focus:outline-none"
              >
                <option value="">전체</option>
                <option value="mafft">MAFFT</option>
                <option value="uclust">UCLUST</option>
                <option value="vsearch">VSEARCH</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-xs text-text-secondary mb-2">날짜 범위</label>
              <DateRangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                placeholder="날짜 범위 선택"
                className="w-full"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs text-text-secondary mb-2">상태</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange({ status: e.target.value || undefined })}
                className="w-full px-3 py-2 bg-background-input text-text-primary text-sm rounded border border-border focus:border-accent-primary focus:outline-none"
              >
                <option value="">전체</option>
                <option value="PENDING">대기중</option>
                <option value="RUNNING">진행중</option>
                <option value="SUCCESS">완료</option>
                <option value="ERROR">오류</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <p className="text-xs text-text-muted">* 날짜 범위를 지정하여 특정 기간의 작업만 조회할 수 있습니다</p>
            <button onClick={clearFilters} className="px-4 py-2 text-sm bg-background-tertiary text-text-secondary hover:text-text-primary transition-colors">
              필터 초기화
            </button>
          </div>
        </div>
      )}

      {/* Job list */}
      <div className="space-y-3">
        {displayJobs.map((job) => (
          <div
            key={toKey(job.id)}
            className={`p-4 bg-background-card rounded-lg border border-border hover:border-border-hover transition-colors ${
              job.jobStatus === 'SUCCESS' ? 'cursor-pointer hover:bg-background-tertiary' : ''
            }`}
            onClick={() => handleJobClick(job)}
            title={job.jobStatus === 'SUCCESS' ? '클릭하여 통계 보기' : ''}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-text-primary font-medium">{job.baseName}</h3>
                  {job.jobStatus === 'SUCCESS' && (
                    <span className="text-xs text-accent-primary opacity-70">📊 클릭하여 통계 보기</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-text-secondary">
                    도구: <span className="text-accent-primary">{job.tool?.toUpperCase?.() ?? job.tool}</span>
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      job.jobStatus === 'SUCCESS' ? 'bg-status-success-bg text-status-success' :
                      job.jobStatus === 'RUNNING' ? 'bg-status-info-bg text-status-info' :
                      job.jobStatus === 'ERROR' ? 'bg-status-error-bg text-status-error' :
                      'bg-status-warning-bg text-status-warning'
                    }`}
                  >
                    {job.jobStatus === 'SUCCESS' && '✅ 완료'}
                    {job.jobStatus === 'RUNNING' && '🔄 진행중'}
                    {job.jobStatus === 'ERROR' && '❌ 오류'}
                    {job.jobStatus === 'PENDING' && '⏳ 대기중'}
                  </span>
                </div>
                {job.options && (
                  <p className="text-text-muted text-xs mt-1">옵션: {job.options}</p>
                )}
                {job.message && job.jobStatus === 'ERROR' && (
                  <p className="text-status-error text-xs mt-1">{job.message}</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-xs text-text-muted">
                  {job.createdAt ? new Date(job.createdAt).toLocaleString('ko-KR') : ''}
                </span>
                {job.jobStatus === 'SUCCESS' && (job.alignArtifactId || job.statArtifactId) && (
                  <div className="mt-2 flex flex-col gap-1">
                    {job.alignArtifactId && (
                      <button
                        className="px-3 py-1 text-white text-xs rounded hover:opacity-80 transition-opacity bg-accent-secondary"
                        onClick={async (e) => {
                          e.stopPropagation(); // 이벤트 버블링 방지
                          try {
                            await artifactService.download(job.alignArtifactId, `${job.baseName}_aligned.fasta`);
                          } catch (error) {
                            console.error('정렬 파일 다운로드 실패:', error);
                          }
                        }}
                      >
                        정렬 파일
                      </button>
                    )}
                    {job.statArtifactId && (
                      <button
                        className="px-3 py-1 text-white text-xs rounded hover:opacity-80 transition-opacity bg-accent-secondary"
                        onClick={async (e) => {
                          e.stopPropagation(); // 이벤트 버블링 방지
                          try {
                            await artifactService.download(job.statArtifactId, `${job.baseName}_statistics.txt`);
                          } catch (error) {
                            console.error('통계 파일 다운로드 실패:', error);
                          }
                        }}
                      >
                        통계 파일
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex justify-center py-4">
          <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-status-error-bg border border-status-error/20 rounded-lg p-4 text-status-error text-center">{error}</div>
      )}

      {/* Observer target for infinite scroll */}
      {hasMore && !loading && <div ref={observerTarget as any} className="h-10" />}

      {/* No more items message */}
      {!hasMore && displayJobs.length > 0 && (
        <div className="text-text-muted text-center py-4 text-sm">모든 작업을 불러왔습니다.</div>
      )}

      {/* Empty state */}
      {!loading && displayJobs.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-text-secondary">작업이 없습니다.</p>
          <p className="text-text-muted text-sm mt-2">새로운 정렬 작업을 시작해보세요.</p>
        </div>
      )}

      {/* Statistics Modal */}
      <StatisticsModal
        isOpen={statisticsModal.isOpen}
        onClose={handleCloseStatisticsModal}
        jobId={statisticsModal.jobId}
        jobName={statisticsModal.jobName}
      />
    </div>
  );
}
