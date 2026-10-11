/**
 * Scroll reveal: the blocks of each section below the first screen fade and rise in, once.
 * The hidden state is set here, not in CSS, so the page is complete without JavaScript,
 * and nothing runs for prefers-reduced-motion.
 */
import { animate } from 'motion/mini';
import { inView, stagger } from 'motion';

const HIDDEN = 'translateY(16px)';

export function initReveal(): void {
  if (document.body.classList.contains('is-bare') || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (const section of document.querySelectorAll<HTMLElement>('main > section')) {
    // Already on screen (or above it, after an anchor jump): leave it alone.
    if (section.getBoundingClientRect().top < innerHeight) continue;
    const wrap = section.matches('.wrap') ? section : section.querySelector(':scope > .wrap');
    const blocks = wrap ? ([...wrap.children] as HTMLElement[]) : [section];
    for (const block of blocks) {
      block.style.opacity = '0';
      block.style.transform = HIDDEN;
    }
    inView(
      section,
      () => {
        animate(
          blocks,
          { opacity: [0, 1], transform: [HIDDEN, 'none'] },
          { duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: stagger(0.08) },
        );
      },
      { margin: '0px 0px -10% 0px' },
    );
  }
}
