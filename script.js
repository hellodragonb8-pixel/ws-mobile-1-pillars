document.addEventListener('DOMContentLoaded', () => {
  const html = document.documentElement;
  const frame = document.getElementById('deviceFrame');
  const cards = Array.from(document.querySelectorAll('.pillar-card'));

  const toggleGridBtn = document.getElementById('toggleGridBtn');
  const toggleSnapBtn = document.getElementById('toggleSnapBtn');
  const toggleMotionBtn = document.getElementById('toggleMotionBtn');
  const forceMotionBtn = document.getElementById('forceMotionBtn');
  const toggleThemeBtn = document.getElementById('toggleThemeBtn');
  const gridOverlay = document.getElementById('gridOverlay');
  const engineStatus = document.getElementById('engineStatus');

  /* ----------------------------------------------------------------
     Theme: dark (default) / VS Code Light Modern. Persisted per
     prototype so a reload keeps your last choice.
  ---------------------------------------------------------------- */

  const THEME_KEY = 'vscode-mobile-theme';
  const cardImages = Array.from(document.querySelectorAll('.pillar-card__media img'));
  let theme = localStorage.getItem(THEME_KEY) || 'dark';

  function applyTheme() {
    frame.setAttribute('data-theme', theme);
    cardImages.forEach(img => {
      const next = theme === 'light' ? img.dataset.srcLight : img.dataset.srcDark;
      if (next && img.getAttribute('src') !== next) img.setAttribute('src', next);
    });
    if (toggleThemeBtn) {
      setPressed(toggleThemeBtn, theme === 'light');
      toggleThemeBtn.textContent = theme === 'light' ? 'Theme: Light' : 'Theme: Dark';
    }
  }

  if (toggleThemeBtn) {
    toggleThemeBtn.addEventListener('click', () => {
      theme = theme === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, theme);
      applyTheme();
    });
  }

  applyTheme();

  const supportsViewTimeline = CSS.supports('animation-timeline: view()');
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  let simulateReduced = false;  // dev: pretend the OS asked for reduced motion
  let forceMotion = false;      // dev: ignore the OS reduced-motion setting

  /* ----------------------------------------------------------------
     Tier 2 fallback (Firefox): mark the card overlapping the middle
     band of the frame. CSS transitions the image from there.
  ---------------------------------------------------------------- */

  let observer = null;

  function startObserver() {
    if (observer) return;
    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        entry.target.classList.toggle('is-in-view', entry.isIntersecting);
      });
    }, {
      root: frame,
      rootMargin: '-35% 0px -35% 0px',
      threshold: 0
    });
    cards.forEach(card => observer.observe(card));
  }

  function stopObserver() {
    if (!observer) return;
    observer.disconnect();
    observer = null;
    cards.forEach(card => card.classList.remove('is-in-view'));
  }

  /* ----------------------------------------------------------------
     Engine selection
  ---------------------------------------------------------------- */

  function motionIsReduced() {
    if (simulateReduced) return true;
    if (forceMotion) return false;
    return reducedMotionQuery.matches;
  }

  function updateEngine() {
    const reduced = motionIsReduced();
    html.classList.toggle('motion-reduced', reduced);
    html.classList.toggle('force-motion', forceMotion && !simulateReduced);

    if (forceMotionBtn) forceMotionBtn.hidden = !reducedMotionQuery.matches;

    if (reduced) {
      stopObserver();
      setStatus(simulateReduced
        ? 'Reduced motion (simulated): images shown at full size'
        : 'Reduced motion (OS setting): images shown at full size. Use "Force motion on" to preview.');
      return;
    }

    if (supportsViewTimeline) {
      stopObserver();
      setStatus('Engine: CSS view() timeline');
    } else {
      startObserver();
      setStatus('Engine: IntersectionObserver fallback');
    }
  }

  function setStatus(text) {
    if (engineStatus) engineStatus.textContent = text;
  }

  reducedMotionQuery.addEventListener('change', updateEngine);
  updateEngine();

  /* ----------------------------------------------------------------
     Dev toolbar
  ---------------------------------------------------------------- */

  function setPressed(btn, on) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  if (toggleGridBtn && gridOverlay) {
    toggleGridBtn.addEventListener('click', () => {
      setPressed(toggleGridBtn, gridOverlay.classList.toggle('is-visible'));
    });
  }

  if (toggleSnapBtn) {
    toggleSnapBtn.addEventListener('click', () => {
      setPressed(toggleSnapBtn, frame.classList.toggle('snap-on'));
    });
  }

  if (toggleMotionBtn) {
    toggleMotionBtn.addEventListener('click', () => {
      simulateReduced = !simulateReduced;
      setPressed(toggleMotionBtn, simulateReduced);
      updateEngine();
    });
  }

  if (forceMotionBtn) {
    forceMotionBtn.addEventListener('click', () => {
      forceMotion = !forceMotion;
      setPressed(forceMotionBtn, forceMotion);
      updateEngine();
    });
  }
});
