document.addEventListener('DOMContentLoaded', () => {
  const html = document.documentElement;
  const frame = document.getElementById('deviceFrame');
  const cards = Array.from(document.querySelectorAll('.scd-01__card'));

  const toggleSnapBtn = document.getElementById('toggleSnapBtn');
  const toggleMotionBtn = document.getElementById('toggleMotionBtn');
  const forceMotionBtn = document.getElementById('forceMotionBtn');
  const toggleThemeBtn = document.getElementById('toggleThemeBtn');
  const engineStatus = document.getElementById('engineStatus');

  /* ----------------------------------------------------------------
     Theme: dark (default) / VS Code Light Modern. Scoped to the
     frame so the dev canvas/toolbar stay on constant dark chrome.
     Persisted per prototype so a reload keeps your last choice.
  ---------------------------------------------------------------- */

  const THEME_KEY = 'vscode-mobile-theme';
  const cardImages = Array.from(document.querySelectorAll('.scd-01__media img'));
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


  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let simulateReduced = false;
  let forceMotion = false;

  const rootStyle = getComputedStyle(html);
  const headerHeight = parseFloat(rootStyle.getPropertyValue('--header-height')) || 56;

  const clamp01 = (n) => Math.min(1, Math.max(0, n));
  // Each card's resolved sticky offset (header + cumulative bands), from CSS
  const stickTop = (i) => parseFloat(getComputedStyle(cards[i]).top) || headerHeight;

  /* ----------------------------------------------------------------
     Per-frame progress
     --a arrival: 0 when the card's top is at the frame bottom,
                  1 when it has reached its sticky offset.
     --p covered: 0 while the card is on top,
                  1 when the next card has climbed up to its header band.
  ---------------------------------------------------------------- */

  let rafPending = false;
  const endSpacer = document.querySelector('.scd-01__end');

  function update() {
    rafPending = false;
    const fr = frame.getBoundingClientRect();
    const rects = cards.map(c => c.getBoundingClientRect());
    const tops = cards.map((_, i) => stickTop(i));

    // Size the trailing spacer so that at max scroll the last card rests
    // exactly at its stack offset, fully readable, with the earlier
    // header bands still showing above it.
    if (endSpacer && cards.length) {
      const last = cards.length - 1;
      const lastHeight = cards[last].offsetHeight;
      const spacer = Math.max(0, fr.height - tops[last] - lastHeight);
      endSpacer.style.height = spacer + 'px';
    }

    // Coverage by the next card (0..1), then accumulate into stacking
    // depth: a card sinks further for every card stacked above it.
    const covered = cards.map((card, i) => {
      if (i >= cards.length - 1) return 0;
      const r = rects[i];
      const next = rects[i + 1];
      const band = tops[i + 1] - tops[i]; // visible band once both are stuck
      return clamp01((r.bottom - next.top) / Math.max(1, r.height - band));
    });

    let depth = 0;
    for (let i = cards.length - 1; i >= 0; i--) {
      depth += covered[i];
      cards[i].style.setProperty('--d', depth.toFixed(3));

      const travel = fr.height - tops[i];
      const arrival = clamp01((fr.bottom - rects[i].top) / travel);
      cards[i].style.setProperty('--a', arrival.toFixed(3));
    }
  }

  function schedule() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(update);
  }

  frame.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  update();

  /* ----------------------------------------------------------------
     Keyboard: a covered card's link would be obscured by the cards
     stacked over it (WCAG 2.4.11). On focus, scroll so that card is
     fully on top.
  ---------------------------------------------------------------- */

  function offsetWithinFrame(el) {
    let y = 0;
    let node = el;
    while (node && node !== frame) {
      y += node.offsetTop;
      node = node.offsetParent;
    }
    return y;
  }

  cards.forEach((card, i) => {
    card.addEventListener('focusin', () => {
      const target = offsetWithinFrame(card) - stickTop(i);
      frame.scrollTo({ top: target, behavior: motionIsReduced() ? 'auto' : 'smooth' });
    });
  });

  /* ----------------------------------------------------------------
     Reduced motion handling + dev toolbar
  ---------------------------------------------------------------- */

  function motionIsReduced() {
    if (simulateReduced) return true;
    if (forceMotion) return false;
    return reducedMotionQuery.matches;
  }

  function updateMotionState() {
    const reduced = motionIsReduced();
    html.classList.toggle('motion-reduced', reduced);
    html.classList.toggle('force-motion', forceMotion && !simulateReduced);
    if (forceMotionBtn) forceMotionBtn.hidden = !reducedMotionQuery.matches;

    if (reduced) {
      setStatus(simulateReduced
        ? 'Reduced motion (simulated): stacking and dimming only, no scaling'
        : 'Reduced motion (OS setting): stacking and dimming only. Use "Force motion on" to preview.');
    } else {
      setStatus('Engine: JS scroll progress (sticky stack)');
    }
  }

  function setStatus(text) {
    if (engineStatus) engineStatus.textContent = text;
  }

  function setPressed(btn, on) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  reducedMotionQuery.addEventListener('change', updateMotionState);
  updateMotionState();

  if (toggleSnapBtn) {
    toggleSnapBtn.addEventListener('click', () => {
      setPressed(toggleSnapBtn, frame.classList.toggle('snap-on'));
    });
  }

  if (toggleMotionBtn) {
    toggleMotionBtn.addEventListener('click', () => {
      simulateReduced = !simulateReduced;
      setPressed(toggleMotionBtn, simulateReduced);
      updateMotionState();
    });
  }

  if (forceMotionBtn) {
    forceMotionBtn.addEventListener('click', () => {
      forceMotion = !forceMotion;
      setPressed(forceMotionBtn, forceMotion);
      updateMotionState();
    });
  }
});
