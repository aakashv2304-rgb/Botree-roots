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
    // visibly grows outward from the sun/moon icon the person just clicked.
    const rect = btnRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth - 40;
    const y = rect ? rect.top + rect.height / 2 : 40;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const maxRadius = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y)) * 1.05;

    // No View Transition support (older browsers) - just swap instantly,
    // no fancy animation, but nothing breaks.
    if (!document.startViewTransition) {
      setTheme(nextTheme);
      return;
    }

    const transition = document.startViewTransition(() => {
      // React state updates are async, and ThemeContext applies the actual
      // <html> class change in a useEffect - wait a couple of frames so the
      // browser's "new" snapshot genuinely reflects the new theme before
      // the transition captures it.
      return new Promise((resolve) => {
        setTheme(nextTheme);
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
    });

    transition.ready.then(() => {
      // The real new-theme page content grows outward from the button in a
      // single motion - nothing is hidden behind a solid color, so every
      // card/button/text is visible and interactive throughout.
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      );

      // Purely decorative glow tracing the wave's leading edge - a thin
      // blurred ring, never a solid fill, so it can't obscure content.
      const glow = document.createElement('div');
      glow.style.position = 'fixed';
      glow.style.left = `${x}px`;
      glow.style.top = `${y}px`;
      glow.style.width = '0px';
      glow.style.height = '0px';
      glow.style.borderRadius = '50%';
      glow.style.transform = 'translate(-50%, -50%)';
      glow.style.boxShadow = goingDark
        ? '0 0 70px 34px rgba(74,46,122,0.5)'
        : '0 0 70px 34px rgba(255,178,94,0.5)';
      glow.style.zIndex = '2147483647';
      glow.style.pointerEvents = 'none';
      document.body.appendChild(glow);

      const glowAnim = glow.animate(
        [
          { width: '0px', height: '0px', opacity: 1 },
          { width: `${maxRadius * 2}px`, height: `${maxRadius * 2}px`, opacity: 0 },
        ],
        { duration: 500, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' }
      );
      glowAnim.onfinish = () => glow.remove();
    });
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
