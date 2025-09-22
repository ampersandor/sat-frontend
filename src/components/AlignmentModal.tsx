import { useState, useEffect } from 'react';
import type { AlignmentRequest } from '../types';

interface AlignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (alignmentRequest: AlignmentRequest) => void;
  fileName: string;
}

export function AlignmentModal({ isOpen, onClose, onConfirm, fileName }: AlignmentModalProps) {
  const [alignTool, setAlignTool] = useState('mafft');
  const [options, setOptions] = useState('--retree 2 --memsavetree');

  // ESC 키 이벤트 처리
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const alignmentRequest: AlignmentRequest = {
      user_id: 1, // 기본 사용자 ID (추후 실제 사용자 시스템 연동 시 수정)
      align_tool: alignTool as 'mafft' | 'uclust' | 'vsearch',
      options: options.trim() || ''
    };
    onConfirm(alignmentRequest);
    onClose();
  };

  const handleCancel = () => {
    // 값 초기화
    setAlignTool('mafft');
    setOptions('--retree 2 --memsavetree');
    onClose();
  };

  const alignToolOptions = [
    { value: 'mafft', label: 'MAFFT', description: '빠르고 정확한 다중 서열 정렬' },
    { value: 'uclust', label: 'UCLUST', description: '빠른 클러스터링 기반 정렬' },
    { value: 'vsearch', label: 'VSEARCH', description: '고성능 서열 검색 및 정렬' }
  ];

  const commonOptions = {
    mafft: ['--retree 2 --memsavetree', '--auto', '--localpair', '--globalpair', '--maxiterate 1000'],
    uclust: ['--id 0.0 --usersort --maxlen 20000'],
    vsearch: ['--id 0.0 --usersort']
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-background-card rounded-lg p-6 max-w-lg w-full mx-4 border border-border">
        <div className="flex items-center mb-6">
          <span className="text-2xl mr-3">⚙️</span>
          <h3 className="text-lg font-semibold text-text-primary">정렬 작업 설정</h3>
        </div>
        
        <div className="mb-4">
          <p className="text-text-secondary text-sm mb-4">
            <strong>{fileName}</strong> 파일의 정렬 작업을 설정하세요.
          </p>
        </div>

        {/* Alignment Tool 선택 */}
        <div className="mb-6">
          <label className="block text-text-primary text-sm font-medium mb-3">
            정렬 도구 선택
          </label>
          <div className="space-y-2">
            {alignToolOptions.map((tool) => (
              <label
                key={tool.value}
                className="flex items-start p-3 rounded-lg border border-border hover:border-border-hover cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name="alignTool"
                  value={tool.value}
                  checked={alignTool === tool.value}
                  onChange={(e) => {
                    setAlignTool(e.target.value);
                    setOptions(commonOptions[tool.value as keyof typeof commonOptions][0]);
                  }}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="text-text-primary font-medium">{tool.label}</div>
                  <div className="text-text-muted text-xs">{tool.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Options 입력 */}
        <div className="mb-6">
          <label className="block text-text-primary text-sm font-medium mb-2">
            옵션 설정
          </label>
          <div className="mb-2">
            <div className="flex flex-wrap gap-1 mb-2">
              {commonOptions[alignTool as keyof typeof commonOptions].map((option) => (
                <button
                  key={option}
                  onClick={() => setOptions(option)}
                  className="px-2 py-1 text-xs bg-background-tertiary text-text-secondary rounded hover:bg-background-input transition-colors"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            placeholder="정렬 옵션을 입력하세요 (예: --auto)"
            className="w-full p-3 bg-background-input border border-border rounded text-text-primary placeholder-text-muted focus:border-accent-primary focus:outline-none resize-none"
            rows={3}
          />
          <div className="text-text-muted text-xs mt-1">
            위의 버튼을 클릭하거나 직접 입력할 수 있습니다.
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-text-secondary border border-border rounded hover:bg-background-tertiary transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-accent-primary text-white rounded hover:opacity-80 transition-opacity"
          >
            정렬 시작
          </button>
        </div>
      </div>
    </div>
  );
} 