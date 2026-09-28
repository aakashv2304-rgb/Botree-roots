// Shared "live wave" theme-transition effect.
//
// How it actually works: the real color change is handled by plain CSS
// `transition` rules already present on every themed element (see
// App.css) - toggling the theme class makes every background/text/border
// color smoothly cross-fade on its own, natively, with nothing ever
// hidden. This function just adds a purely decorative, mostly-transparent
// glowing ring that sweeps outward from the click point in sync with that
// cross-fade, as a visual flourish riding on top - it never obscures
// content (pointer-events: none, ring interior is ~12% opacity at most).
export function triggerThemeWave(originEl, goingDark, applyTheme) {
  const rect = originEl.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxR = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y));

  const wave = document.createElement('div');
  wave.className = 'theme-wave-ring';
  wave.style.setProperty('--x', `${x}px`);
  wave.style.setProperty('--y', `${y}px`);
  wave.style.setProperty('--r', '0px');
  wave.style.clipPath = `circle(0px at ${x}px ${y}px)`;
  document.body.appendChild(wave);

  requestAnimationFrame(() => {
    const anim = wave.animate(
      [
        { clipPath: `circle(0px at ${x}px ${y}px)` },
        { clipPath: `circle(${maxR}px at ${x}px ${y}px)` },
      ],
      { duration: 650, easing: 'cubic-bezier(.22,.78,.25,1)', fill: 'forwards' }
    );

    let switched = false;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / 650);
      wave.style.setProperty('--r', `${maxR * t}px`);
      // Switch the real theme early (10% into the sweep) - the native CSS
      // transitions (0.3s) then finish well before the decorative ring
      // does, so by the time the ring reaches the edges the whole page
      // has already smoothly settled into the new theme underneath it.
      if (!switched && t >= 0.10) {
        switched = true;
        applyTheme(goingDark ? 'dark' : 'light');
      }
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    anim.finished.then(() => {
      wave.remove();
    });
  });
}
