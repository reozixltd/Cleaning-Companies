/**
 * Scroll motion (spec §8), with no library.
 *
 * Progress: an element marked data-progress gets --p, 0 where it first shows (or
 * at the top of the page, if it starts on screen) and 1 where its bottom edge
 * leaves the top of the viewport. CSS turns --p into transforms and opacity.
 *
 * Reveal: an element marked data-reveal gets .is-in the first time it shows.
 * global.css hides those blocks only under html.motion, which is set here, so a
 * page where this script never runs reads normally.
 *
 * Nothing runs under reduced motion or on bare (app-like) pages.
 */
const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('is-bare');

if (!still && 'IntersectionObserver' in window) {
  const tracked = [...document.querySelectorAll<HTMLElement>('[data-progress]')];
  let queued = false;
  const measure = () => {
    queued = false;
    const viewport = window.innerHeight;
    for (const el of tracked) {
      const r = el.getBoundingClientRect();
      if (!r.height) continue;
      const top = r.top + window.scrollY;
      const from = Math.max(top - viewport, 0);
      const p = Math.min(Math.max((window.scrollY - from) / (top + r.height - from), 0), 1).toFixed(4);
      if (el.style.getPropertyValue('--p') !== p) el.style.setProperty('--p', p);
    }
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(measure);
  };
  if (tracked.length) {
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue, { passive: true });
    measure();
  }

  const reveals = [...document.querySelectorAll<HTMLElement>('[data-reveal]')];
  // What is already on screen (or above it) stays put: it gets .is-in before the class that hides the rest.
  for (const el of reveals) if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('is-in');
  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        seen.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  for (const el of reveals) if (!el.classList.contains('is-in')) seen.observe(el);
  document.documentElement.classList.add('motion');
}
