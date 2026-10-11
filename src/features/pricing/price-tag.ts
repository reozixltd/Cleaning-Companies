/**
 * Keeps every price display in step with the visitor's selection: the hero's price
 * line, the estimator's tag, the pinned desktop tag and the mobile booking bar all
 * use the same data-* hooks.
 * It listens for selection events; it never imports the floor plan.
 */
import { formatMoney } from '@/core/format';
import { sitePath } from '@/core/paths';
import { getStorage } from '@/core/storage';
import { pricing } from '@/config/pricing';
import { rooms } from '@/config/rooms';
import { describeSelection } from '@/domain/describe';
import { onSelection } from '@/domain/events';
import { quote } from '@/domain/quote';
import { loadSelection, toParams, type Selection } from '@/domain/selection';

let hasSelection = false;
let heroVisible = true;

const all = <T extends Element = HTMLElement>(sel: string) => [...document.querySelectorAll<T>(sel)];

function render(s: Selection): void {
  const q = quote(s, pricing);
  const oneOff = q.frequency === 'once';
  all('[data-price-per-visit]').forEach((el) => (el.textContent = formatMoney(q.perVisit)));
  all('[data-price-unit]').forEach((el) => (el.textContent = oneOff ? 'one visit' : 'a visit'));
  all('[data-price-first-visit]').forEach((el) => (el.textContent = formatMoney(q.firstVisit)));
  all('[data-price-first-visit-row]').forEach((el) => (el.hidden = q.firstVisit === q.perVisit));
  all('[data-price-summary]').forEach((el) => (el.textContent = describeSelection(s)));
  all<HTMLAnchorElement>('[data-choose-time]').forEach((a) => (a.href = sitePath(`/book/?${toParams(s)}`)));
  hasSelection = true;
  showPinned();
}

function showPinned(): void {
  all('[data-booking-bar]').forEach((el) => (el.hidden = !hasSelection));
  all('[data-booking-tag]').forEach((el) => (el.hidden = !hasSelection || heroVisible));
}

function watchHero(): void {
  // Wherever the page already shows the price in full: the estimator, and the price lines in the home hero and the closing band.
  const priced = all('#plan, [data-price-line]');
  if (!priced.length || !('IntersectionObserver' in window)) {
    heroVisible = !priced.length ? false : heroVisible;
    return;
  }
  const onScreen = new Set<Element>();
  // The top margin matches the sticky header: a price hidden under it counts as gone.
  const watcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) onScreen.add(entry.target);
        else onScreen.delete(entry.target);
      }
      heroVisible = onScreen.size > 0;
      showPinned();
    },
    { rootMargin: '-80px 0px 0px 0px' },
  );
  priced.forEach((el) => watcher.observe(el));
}

let started = false;

export function initPriceTags(): void {
  if (started) return;
  started = true;
  watchHero();
  const saved = loadSelection(getStorage(), pricing, rooms.max);
  if (saved) render(saved);
  onSelection(render);
}
