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

    // Single-swipe reveal: the overlay appears already covering the full
    // screen (no separate "expand" phase), the real theme swaps instantly
    // underneath while hidden, then one shrinking circle wipes the overlay
    // away from the click point outward - revealing the new theme in one
    // continuous motion instead of expanding out and receding back.
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '9999';
    overlay.style.pointerEvents = 'none';
    overlay.style.background = goingDark
      ? `radial-gradient(circle at ${x}px ${y}px, #4A2E7A 0%, #241645 35%, #130F1F 75%, #130F1F 100%)`
      : `radial-gradient(circle at ${x}px ${y}px, #FFF6DD 0%, #FFD98A 30%, #FFB25E 60%, #F7F4FC 100%)`;
    overlay.style.clipPath = `circle(${maxRadius}px at ${x}px ${y}px)`;
    document.body.appendChild(overlay);

    // Theme swaps now, fully hidden under the overlay - no visible pop.
    setTheme(nextTheme);

    const wipe = overlay.animate(
      [
        { clipPath: `circle(${maxRadius}px at ${x}px ${y}px)` },
        { clipPath: `circle(0px at ${x}px ${y}px)` },
      ],
      { duration: 480, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' }
    );
    wipe.onfinish = () => overlay.remove();
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
