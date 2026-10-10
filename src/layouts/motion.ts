/**
 * Scroll-linked motion (spec §8), with no library. An element marked
 * data-progress gets --p: 0 where it first shows (or at the top of the page, if
 * it starts on screen) and 1 where its bottom edge leaves the top of the
 * viewport. CSS turns --p into transforms and opacity. Nothing runs under
 * reduced motion or on bare (app-like) pages, so --p stays at its initial 0.
 */
const tracked = [...document.querySelectorAll<HTMLElement>('[data-progress]')];
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('is-bare');

if (tracked.length && !still) {
  let queued = false;
  const measure = () => {
    queued = false;
    const viewport = window.innerHeight;
    for (const el of tracked) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > viewport) continue;
      const top = r.top + window.scrollY;
      const from = Math.max(top - viewport, 0);
      const p = (window.scrollY - from) / (top + r.height - from);
      el.style.setProperty('--p', Math.min(Math.max(p, 0), 1).toFixed(4));
    }
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(measure);
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  measure();
}
