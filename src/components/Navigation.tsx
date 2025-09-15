import { ThemeToggle } from './ThemeToggle';

export function Navigation() {
  return (
    <nav className="w-full h-14 bg-background-primary border border-border flex items-center px-8">
      <h1 className="text-text-primary text-base font-bold">
        Sequence Alignment Tool
      </h1>
      
      <div className="ml-auto flex items-center space-x-6">
        <button className="bg-background-primary text-text-primary text-base hover:text-accent-primary transition-colors">
          home
        </button>
        <button className="bg-background-primary text-text-primary text-base hover:text-text-primary transition-colors">
          my page
        </button>
        
        {/* 테마 토글 버튼 */}
        <div className="ml-4">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
} 