/**
 * Wires every floor plan on the page. Edit plans own the visitor's selection:
 * they read it from storage, re-draw on every change, save it and emit it for
 * the price tags. Read plans just follow the selection and announce which room
 * was chosen with a `clearday:room` event (the checklist section listens).
 */
import { getStorage } from '@/core/storage';
import { pricing } from '@/config/pricing';
import { rooms } from '@/config/rooms';
import { describeRooms } from '@/domain/describe';
import { emitSelection, onSelection } from '@/domain/events';
import { DEFAULT_SELECTION, loadSelection, normalise, saveSelection, type Selection } from '@/domain/selection';
import { layout } from './layout';
import { renderPlanSvg } from './svg';

export const ROOM_EVENT = 'clearday:room';

const storage = getStorage();

function draw(figure: HTMLElement, s: Selection): void {
  const mode = figure.dataset.mode === 'read' ? 'read' : 'edit';
  const plan = layout(s, rooms, { slots: mode === 'edit' });
  figure.querySelector('[data-plan-svg]')!.innerHTML = renderPlanSvg(plan, { mode, title: figure.dataset.title ?? '' });
  figure.querySelector('[data-plan-rooms]')!.textContent = describeRooms(s);
}

const includedIds = (figure: HTMLElement) =>
  new Set([...figure.querySelectorAll<SVGGElement>('.room--included')].map((g) => g.dataset.roomId!));

/** A newly added room fades from the room colour to the highlight (colour only; kept for reduced motion). */
function fadeIn(figure: HTMLElement, ids: string[]): void {
  const css = getComputedStyle(document.documentElement);
  const from = css.getPropertyValue('--color-paper').trim();
  for (const id of ids) {
    const fill = figure.querySelector<SVGRectElement>(`[data-room-id="${id}"] .room__fill`);
    if (!fill || !fill.animate) continue;
    const to = getComputedStyle(fill).fill;
    fill.animate([{ fill: from }, { fill: to }], { duration: 180, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
  }
}

function syncControls(controls: HTMLElement, s: Selection): void {
  for (const key of ['bedrooms', 'bathrooms'] as const) {
    const count = s[key];
    const max = rooms.max[key];
    const noun = key === 'bedrooms' ? 'bedroom' : 'bathroom';
    controls.querySelector(`[data-count="${key}"]`)!.textContent = String(count);
    const minus = controls.querySelector<HTMLButtonElement>(`[data-step="${key}"][data-delta="-1"]`)!;
    const plus = controls.querySelector<HTMLButtonElement>(`[data-step="${key}"][data-delta="1"]`)!;
    minus.disabled = count <= 1;
    plus.disabled = count >= max;
    plus.setAttribute('aria-label', `Add a ${noun}, ${count} selected`);
    minus.setAttribute('aria-label', `Remove a ${noun}, ${count} selected`);
  }
  for (const key of ['study', 'laundry'] as const) {
    controls.querySelector(`[data-toggle="${key}"]`)!.setAttribute('aria-pressed', String(s[key]));
  }
  controls.querySelectorAll<HTMLInputElement>('[data-service]').forEach((i) => (i.checked = i.value === s.service));
  controls.querySelectorAll<HTMLInputElement>('[data-frequency]').forEach((i) => (i.checked = i.value === s.frequency));
  controls.querySelectorAll<HTMLInputElement>('[data-extra]').forEach((i) => (i.checked = s.addOns.includes(i.value as never)));
  const oneOff = pricing.oneOffOnly.includes(s.service);
  controls.querySelector<HTMLElement>('[data-frequency-group]')!.hidden = oneOff;
  controls.querySelector<HTMLElement>('[data-once-note]')!.hidden = !oneOff;
}

function addRoom(s: Selection, kind: string): Selection {
  if (kind === 'bedroom') return { ...s, bedrooms: s.bedrooms + 1 };
  if (kind === 'bathroom') return { ...s, bathrooms: s.bathrooms + 1 };
  if (kind === 'study') return { ...s, study: true };
  if (kind === 'laundry') return { ...s, laundry: true };
  return s;
}

/**
 * Runs `load` once the 3D model is worth downloading (spec §6.3): a viewport
 * 768px or wider, motion allowed, Save-Data off, WebGL2 present, the plan within
 * one viewport of the screen and the page finished loading. Otherwise the flat
 * plan is all there is, exactly as before.
 * ponytail: checked once, so a phone-width window that is later widened keeps the flat plan until reload.
 */
function whenModelAllowed(figure: HTMLElement, load: () => void): void {
  const matches = (query: string) => window.matchMedia(query).matches;
  if (!matches('(min-width: 768px)') || matches('(prefers-reduced-motion: reduce)')) return;
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
  if (!('IntersectionObserver' in window)) return;
  // WebGL2 is asked for last, once the page has loaded: the question is a round trip to the GPU, and the estimator never waits for it (spec §6.4).
  const loadIfWebGL2 = () => {
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      gl?.getExtension('WEBGL_lose_context')?.loseContext(); // the model makes its own context
      if (gl) load();
    } catch {
      // No model: the flat plan needs nothing from it.
    }
  };
  const near = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      near.disconnect();
      if (document.readyState === 'complete') loadIfWebGL2();
      else window.addEventListener('load', loadIfWebGL2, { once: true });
    },
    { rootMargin: '100% 0px' },
  );
  near.observe(figure);
}

function initEditPlan(figure: HTMLElement): void {
  const controls = document.querySelector<HTMLElement>(`[data-plan-controls="${figure.dataset.plan}"]`);
  let s = loadSelection(storage, pricing, rooms.max) ?? DEFAULT_SELECTION;

  const update = (next: Partial<Selection>, opts: { animate: boolean }) => {
    const before = includedIds(figure);
    s = normalise({ ...s, ...next }, pricing, rooms.max);
    draw(figure, s);
    if (controls) syncControls(controls, s);
    saveSelection(storage, s);
    emitSelection(s);
    if (opts.animate) fadeIn(figure, [...includedIds(figure)].filter((id) => !before.has(id)));
  };

  draw(figure, s);
  if (controls) syncControls(controls, s);
  if (loadSelection(storage, pricing, rooms.max)) emitSelection(s);
  whenModelAllowed(figure, () => {
    // A failed download or start leaves the flat plan, which needs nothing from the model.
    import('./scene3d').then((model) => model.start(figure, s)).catch(() => {});
  });

  const pressRoom = (g: Element, viaKeyboard: boolean) => {
    const kind = (g as SVGGElement).dataset.kind!;
    update(addRoom(s, kind), { animate: !viaKeyboard });
    // Keep focus in the plan: the next slot of the same kind, or the drawing itself.
    const next = figure.querySelector<SVGGElement>(`[data-room-id="add-${kind}"]`);
    (next ?? figure.querySelector<HTMLElement>('[data-plan-svg]'))?.focus();
  };

  figure.addEventListener('click', (e) => {
    const g = (e.target as Element).closest('.room--available');
    if (g) pressRoom(g, e.detail === 0);
  });
  figure.addEventListener('keydown', (e) => {
    const g = (e.target as Element).closest('.room--available');
    if (g && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      pressRoom(g, true);
    }
  });

  controls?.addEventListener('click', (e) => {
    const step = (e.target as Element).closest<HTMLButtonElement>('[data-step]');
    const toggle = (e.target as Element).closest<HTMLButtonElement>('[data-toggle]');
    const animate = e.detail !== 0;
    if (step) {
      const key = step.dataset.step as 'bedrooms' | 'bathrooms';
      update({ [key]: s[key] + Number(step.dataset.delta) }, { animate });
    } else if (toggle) {
      const key = toggle.dataset.toggle as 'study' | 'laundry';
      update({ [key]: !s[key] }, { animate });
    }
  });
  controls?.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (input.matches('[data-service]')) {
      // Coming back from a one-off service restores the usual fortnightly default.
      const frequency = pricing.oneOffOnly.includes(s.service) ? DEFAULT_SELECTION.frequency : s.frequency;
      update({ service: input.value as Selection['service'], frequency }, { animate: false });
    } else if (input.matches('[data-frequency]')) {
      update({ frequency: input.value as Selection['frequency'] }, { animate: false });
    } else if (input.matches('[data-extra]')) {
      const addOns = [...controls.querySelectorAll<HTMLInputElement>('[data-extra]:checked')].map((i) => i.value);
      update({ addOns: addOns as Selection['addOns'] }, { animate: false });
    }
  });
}

function initReadPlan(figure: HTMLElement): void {
  let selected: string | null = figure.dataset.selected ?? null;
  const redraw = (s: Selection) => {
    draw(figure, s);
    if (selected) figure.querySelector(`[data-room-id="${selected}"]`)?.setAttribute('aria-pressed', 'true');
    figure.querySelectorAll('.room[role="button"]').forEach((g) => {
      if (!g.hasAttribute('aria-pressed')) g.setAttribute('aria-pressed', 'false');
    });
  };
  const choose = (g: Element) => {
    selected = (g as SVGGElement).dataset.roomId!;
    figure.querySelectorAll('.room[role="button"]').forEach((r) => r.setAttribute('aria-pressed', String(r === g)));
    figure.dispatchEvent(new CustomEvent(ROOM_EVENT, { bubbles: true, detail: { id: selected, kind: (g as SVGGElement).dataset.kind } }));
  };
  redraw(loadSelection(storage, pricing, rooms.max) ?? DEFAULT_SELECTION);
  onSelection(redraw);
  figure.addEventListener('click', (e) => {
    const g = (e.target as Element).closest('.room--included[role="button"]');
    if (g) choose(g);
  });
  figure.addEventListener('keydown', (e) => {
    const g = (e.target as Element).closest('.room--included[role="button"]');
    if (g && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      choose(g);
    }
  });
}

let started = false;

export function initPlans(): void {
  if (started) return;
  started = true;
  document.querySelectorAll<HTMLElement>('[data-plan]').forEach((figure) => {
    if (figure.dataset.mode === 'read') initReadPlan(figure);
    else initEditPlan(figure);
  });
}
