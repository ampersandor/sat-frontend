import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center justify-center w-12 h-6 bg-background-tertiary border border-border rounded-full transition-all duration-300 ease-in-out hover:border-border-hover focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-opacity-50"
      aria-label={`현재 ${theme === 'light' ? '라이트' : '다크'} 모드. 클릭하여 ${theme === 'light' ? '다크' : '라이트'} 모드로 전환`}
      title={`${theme === 'light' ? '다크' : '라이트'} 모드로 전환`}
    >
      {/* 슬라이더 */}
      <span
        className={`absolute w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out flex items-center justify-center text-xs ${
          theme === 'light' 
            ? 'translate-x-3.5 bg-yellow-400' 
            : '-translate-x-3.5 bg-slate-700'
        }`}
      >
        {theme === 'light' ? '☀️' : '🌙'}
      </span>
      
      {/* 배경 아이콘 */}
      <div className="absolute inset-0 flex items-center justify-between px-1.5 text-xs">
        <span className={`transition-opacity duration-300 ${theme === 'dark' ? 'opacity-60' : 'opacity-30'}`}>
          🌙
        </span>
        <span className={`transition-opacity duration-300 ${theme === 'light' ? 'opacity-60' : 'opacity-30'}`}>
          ☀️
        </span>
      </div>
    </button>
  );
};
