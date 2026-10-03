/**
 * How features talk to each other without importing each other: the floor plan
 * emits the visitor's selection; price tags and the booking tag listen.
 */
import type { Selection } from './selection';

export const SELECTION_EVENT = 'clearday:selection';

const defaultTarget = (): EventTarget => document;

export function emitSelection(s: Selection, target: EventTarget = defaultTarget()): void {
  target.dispatchEvent(new CustomEvent<Selection>(SELECTION_EVENT, { detail: s }));
}

/** Returns an unsubscribe function. */
export function onSelection(cb: (s: Selection) => void, target: EventTarget = defaultTarget()): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<Selection>).detail);
  target.addEventListener(SELECTION_EVENT, handler);
  return () => target.removeEventListener(SELECTION_EVENT, handler);
}
