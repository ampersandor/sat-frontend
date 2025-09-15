import { useState, useRef, useEffect } from 'react';

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

// 로컬 시간대 기준으로 YYYY-MM-DD 형식으로 날짜를 포맷팅
const formatDateToLocal = (date: Date): string => {
  return date.getFullYear() + '-' + 
    String(date.getMonth() + 1).padStart(2, '0') + '-' + 
    String(date.getDate()).padStart(2, '0');
};

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  className?: string;
}

export function DateRangePicker({ 
  value, 
  onChange, 
  placeholder = "날짜 범위 선택",
  className = ""
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange>(value);
  const [selectionStep, setSelectionStep] = useState<'start' | 'end'>('start');
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setTempRange(value); // 변경사항 취소
        setSelectionStep('start');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  // 날짜 클릭 핸들러 - 노션 스타일
  const handleDateClick = (date: string) => {
    if (selectionStep === 'start') {
      // 시작 날짜 선택
      setTempRange({ startDate: date, endDate: undefined });
      setSelectionStep('end');
    } else {
      // 종료 날짜 선택
      let finalRange: DateRange;
      
      if (tempRange.startDate && date < tempRange.startDate) {
        // 시작 날짜보다 이전 날짜를 선택한 경우, 순서를 바꿈
        finalRange = { startDate: date, endDate: tempRange.startDate };
      } else {
        finalRange = { startDate: tempRange.startDate, endDate: date };
      }
      
      setTempRange(finalRange);
      onChange(finalRange);
      setIsOpen(false);
      setSelectionStep('start');
    }
  };

  // 날짜 적용
  const handleApply = () => {
    onChange(tempRange);
    setIsOpen(false);
    setSelectionStep('start');
  };

  // 날짜 초기화
  const handleClear = () => {
    onChange({});
    setTempRange({});
    setSelectionStep('start');
    setIsOpen(false);
  };

  // 날짜 문자열 포맷팅
  const formatDateRange = () => {
    if (!value.startDate && !value.endDate) return placeholder;
    if (value.startDate && value.endDate) {
      return `${value.startDate} ~ ${value.endDate}`;
    }
    if (value.startDate) {
      return `${value.startDate} ~ 선택 중...`;
    }
    return placeholder;
  };

  // 달력 날짜 생성
  const generateCalendarDays = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDate = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const calendarDays = generateCalendarDays(currentYear, currentMonth);

  // 호버 상태 관리
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // 날짜가 범위에 포함되는지 확인 (호버 효과 포함)
  const isDateInRange = (date: Date) => {
    const dateStr = formatDateToLocal(date);
    
    if (!tempRange.startDate) return false;
    
    // 시작 날짜만 선택된 상태에서 호버 효과
    if (!tempRange.endDate && hoverDate && selectionStep === 'end') {
      const start = tempRange.startDate;
      const hover = hoverDate;
      const actualStart = start <= hover ? start : hover;
      const actualEnd = start <= hover ? hover : start;
      return dateStr >= actualStart && dateStr <= actualEnd;
    }
    
    // 완전한 범위가 선택된 경우
    if (tempRange.endDate) {
      return dateStr >= tempRange.startDate && dateStr <= tempRange.endDate;
    }
    
    // 시작 날짜만 선택된 경우
    return dateStr === tempRange.startDate;
  };

  // 날짜가 시작/종료 날짜인지 확인
  const isStartDate = (date: Date) => {
    const dateStr = formatDateToLocal(date);
    return dateStr === tempRange.startDate;
  };

  const isEndDate = (date: Date) => {
    const dateStr = formatDateToLocal(date);
    return dateStr === tempRange.endDate;
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 트리거 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-background-input text-text-primary text-sm rounded border border-border focus:border-accent-primary focus:outline-none text-left flex items-center justify-between"
      >
        <span className={value.startDate || value.endDate ? 'text-text-primary' : 'text-text-muted'}>
          {formatDateRange()}
        </span>
        <span className="text-text-muted">📅</span>
      </button>

      {/* 달력 드롭다운 */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-background-card border border-border rounded-lg shadow-lg z-50 p-4 min-w-[320px]">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                if (currentMonth === 0) {
                  setCurrentMonth(11);
                  setCurrentYear(currentYear - 1);
                } else {
                  setCurrentMonth(currentMonth - 1);
                }
              }}
              className="p-1 bg-background-tertiary hover:bg-background-tertiary rounded text-text-primary"
            >
              ◀
            </button>
            <h3 className="text-text-primary font-medium">
              {currentYear}년 {currentMonth + 1}월
            </h3>
            <button
              onClick={() => {
                if (currentMonth === 11) {
                  setCurrentMonth(0);
                  setCurrentYear(currentYear + 1);
                } else {
                  setCurrentMonth(currentMonth + 1);
                }
              }}
              className="p-1 bg-background-tertiary hover:bg-background-tertiary rounded text-text-primary"
            >
              ▶
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map(day => (
              <div key={day} className="text-center text-xs text-text-muted py-1">
                {day}
              </div>
            ))}
          </div>

          {/* 달력 그리드 */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => {
              const dateStr = formatDateToLocal(date);
              const isCurrentMonth = date.getMonth() === currentMonth;
              const isToday = dateStr === formatDateToLocal(today);
              const isSelected = isDateInRange(date);
              const isStart = isStartDate(date);
              const isEnd = isEndDate(date);

              return (
                <button
                  key={index}
                  onClick={() => handleDateClick(dateStr)}
                  onMouseEnter={() => setHoverDate(dateStr)}
                  onMouseLeave={() => setHoverDate(null)}
                  className={`
                    h-8 w-8 text-xs rounded flex items-center justify-center transition-colors
                    ${!isCurrentMonth ? 'text-text-muted' : 'text-text-primary hover:bg-background-tertiary'}
                    ${isToday ? 'bg-status-info text-status-info' : ''}
                    ${isSelected ? 'bg-accent-primary text-text-primary' : 'bg-background-tertiary'}
                    ${isStart ? 'bg-accent-primary text-text-primary font-semibold' : ''}
                    ${isEnd ? 'bg-accent-primary text-text-primary font-semibold' : ''}
                    ${isStart && isEnd ? 'rounded-full' : ''}
                    ${isStart && !isEnd ? 'rounded-l-full' : ''}
                    ${isEnd && !isStart ? 'rounded-r-full' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {/* 액션 버튼 */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
            <button
              onClick={handleClear}
              className="px-3 py-1 text-xs bg-background-tertiary text-text-muted hover:text-text-primary transition-colors"
            >
              초기화
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1 text-xs bg-background-tertiary text-text-muted hover:text-text-primary transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleApply}
                className="px-3 py-1 text-xs bg-accent-primary text-white rounded hover:opacity-80 transition-opacity"
              >
                적용
              </button>
            </div>
          </div>

          {/* 선택 상태 안내 */}
          <div className="mt-2 text-xs text-center">
            {selectionStep === 'start' ? (
              <span className="text-text-muted">시작 날짜를 선택하세요</span>
            ) : (
              <div className="space-y-1">
                <span className="text-accent-primary">
                  시작: {tempRange.startDate} 
                </span>
                <br />
                <span className="text-text-muted">종료 날짜를 선택하세요</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
