import React, { useRef } from 'react';
import { Sun, Moon } from '@phosphor-icons/react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const btnRef = useRef(null);

  const handleToggle = () => {
    const goingDark = theme !== 'dark';
    const nextTheme = goingDark ? 'dark' : 'light';

    // Origin point for the wave: the button's own center, so the effect
    // visibly emanates from the sun/moon icon the person just clicked.
    const rect = btnRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 40;
    const y = rect ? rect.top + rect.height / 2 : 40;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxRadius = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y)) * 1.05;

    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '9999';
    overlay.style.pointerEvents = 'none';
    overlay.style.background = goingDark
      ? `radial-gradient(circle at ${x}px ${y}px, #4A2E7A 0%, #241645 35%, #0A0614 75%, #050308 100%)`
      : `radial-gradient(circle at ${x}px ${y}px, #FFF6DD 0%, #FFD98A 30%, #FFB25E 60%, #FF8C61 100%)`;
    overlay.style.clipPath = `circle(0px at ${x}px ${y}px)`;
    document.body.appendChild(overlay);

    const expand = overlay.animate(
      [
        { clipPath: `circle(0px at ${x}px ${y}px)` },
        { clipPath: `circle(${maxRadius}px at ${x}px ${y}px)` },
      ],
      { duration: 650, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' }
    );

    expand.onfinish = () => {
      // Swap the real theme once the wave has fully covered the screen,
      // so the switch itself is hidden underneath it.
      setTheme(nextTheme);

      const recede = overlay.animate(
        [
          { clipPath: `circle(${maxRadius}px at ${x}px ${y}px)` },
          { clipPath: `circle(0px at ${x}px ${y}px)` },
        ],
        { duration: 550, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', delay: 80, fill: 'forwards' }
      );
      recede.onfinish = () => overlay.remove();
    };
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
