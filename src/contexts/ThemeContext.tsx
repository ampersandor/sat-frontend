import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // 초기 테마 설정: 로컬 스토리지에서 가져오거나 시스템 설정 확인
  const [theme, setTheme] = useState<Theme>(() => {
    // 로컬 스토리지에서 저장된 테마 확인
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) {
      return savedTheme;
    }
    
    // 시스템 다크 모드 설정 확인
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // 테마 변경 시 HTML 클래스와 로컬 스토리지 업데이트
  useEffect(() => {
    const root = window.document.documentElement;
    
    // 이전 테마 클래스 제거
    root.classList.remove('light', 'dark');
    
    // 새 테마 클래스 추가
    root.classList.add(theme);
    
    // 로컬 스토리지에 테마 저장
    localStorage.setItem('theme', theme);
  }, [theme]);

  // 시스템 테마 변경 감지
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      // 로컬 스토리지에 테마가 저장되어 있지 않을 때만 시스템 설정 따라감
      if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const value = {
    theme,
    toggleTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
