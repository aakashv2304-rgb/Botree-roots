import React, { useRef } from 'react';
import { Sun, Moon } from '@phosphor-icons/react';
import { useTheme } from '../context/ThemeContext';
import { triggerThemeWave } from '../utils/themeWave';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const btnRef = useRef(null);

  const handleToggle = () => {
    const goingDark = theme !== 'dark';
    triggerThemeWave(btnRef.current, goingDark, setTheme);
  };

  return (
    <button
      ref={btnRef}
      onClick={handleToggle}
      className="relative w-9 h-9 flex items-center justify-center rounded-lg text-[#5B4B7A] hover:bg-[#EDE4F9] transition-colors overflow-hidden theme-toggle-btn"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      data-testid="theme-toggle-button"
    >
      <span className={`theme-toggle-icon ${theme === 'dark' ? 'theme-toggle-icon-in' : 'theme-toggle-icon-out'}`}>
        <Moon size={19} weight="fill" />
      </span>
      <span className={`theme-toggle-icon ${theme === 'dark' ? 'theme-toggle-icon-out' : 'theme-toggle-icon-in'}`}>
        <Sun size={20} weight="fill" />
      </span>
    </button>
  );
};

export default ThemeToggle;
