/**
 * The room stage (spec §5.5): a room before a clean, an action beat, a sweep that
 * uncovers the room after it, then the finished room. What shows is a pure
 * function of scroll progress. Which room shows is decided by whoever owns the
 * plan (sections/RoomChecklist), by hiding all but one [data-stage-room].
 *
 * Without this script, and under reduced motion, the stage rests on the finished room.
 */
export type Phase = 'before' | 'action' | 'sweep' | 'after';

const clamp = (n: number) => Math.min(Math.max(n, 0), 1);

/** The stage at progress p (0 to 1). `sweep` is how much of "after" is uncovered, 0 to 1. */
export function stageState(p: number): { phase: Phase; sweep: number } {
  const phase = p >= 0.9 ? 'after' : p >= 0.6 ? 'sweep' : p >= 0.3 ? 'action' : 'before';
  return { phase, sweep: clamp((p - 0.6) / 0.3) };
}

/** Pinned: 0 until the block sticks at `stickTop`, 1 once it has travelled `travel` px. Viewport px. */
export function pinnedProgress(trackTop: number, stickTop: number, travel: number): number {
  return travel > 0 ? clamp((stickTop - trackTop) / travel) : 1;
}

/** Not pinned: 0 with the stage's centre 85% down the viewport, 1 with it 30% down. */
export function passingProgress(top: number, height: number, viewport: number): number {
  return clamp((viewport * 85 - (top + height / 2) * 100) / (viewport * 55)); // whole percents: 0.55 * 800 is not exactly 440, and the ends must be exactly 0 and 1
}

export function initStage(): void {
  const stage = document.querySelector<HTMLElement>('[data-stage]');
  if (!stage || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const pin = stage.closest<HTMLElement>('[data-stage-pin]');
  const action = stage.querySelector<HTMLElement>('[data-stage-action]');

  let queued = false;
  const measure = () => {
    queued = false;
    let p: number;
    // The stylesheet decides whether the block pins (screen size, room to fit); this only reads the answer.
    if (pin?.parentElement && getComputedStyle(pin).position === 'sticky') {
      const track = pin.parentElement.getBoundingClientRect();
      p = pinnedProgress(track.top, parseFloat(getComputedStyle(pin).top), track.height - pin.offsetHeight);
    } else {
      const r = stage.getBoundingClientRect();
      p = passingProgress(r.top, r.height, window.innerHeight);
    }
    const { phase, sweep } = stageState(p);
    stage.style.setProperty('--sweep', sweep.toFixed(4));
    if (stage.dataset.phase === phase) return;
    stage.dataset.phase = phase;
    // Shown only for its beat, so Scene (which plays while on screen) starts and stops the clip by itself.
    if (action) action.hidden = phase !== 'action' && phase !== 'sweep';
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(measure);
  };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  stage.classList.add('is-live');
  measure();
}
