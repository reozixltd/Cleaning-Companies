/**
 * Draws a Plan as SVG markup. One function for the server render and for
 * re-renders in the browser, so the markup is defined once.
 *
 *   edit mode: available slots are keyboard buttons ("Add a bedroom")
 *   read mode: included rooms are buttons that show their checklist; no slots
 *
 * Walls are drawn last as one layer with non-scaling 2px strokes.
 */
import type { Plan, PlanRoom } from './layout';

export const UNIT = 40;
export const PAD = 4;

/** Short words inside the dashed slots, so they fit narrow rooms on a phone. */
const SHORT: Record<string, string> = { bedroom: 'bed', bathroom: 'bath', study: 'study', laundry: 'laundry' };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function box(r: PlanRoom) {
  return { x: r.x * UNIT, y: r.y * UNIT, w: r.w * UNIT, h: r.h * UNIT, cx: (r.x + r.w / 2) * UNIT, cy: (r.y + r.h / 2) * UNIT };
}

function availableRoom(r: PlanRoom): string {
  const b = box(r);
  const inset = 8;
  const noun = SHORT[r.kind] ?? r.kind;
  return [
    `<g class="room room--available room--${r.kind}" data-room-id="${r.id}" data-kind="${r.kind}" role="button" tabindex="0" aria-label="${esc(r.label)}">`,
    `<rect class="room__fill" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>`,
    `<rect class="room__slot" x="${b.x + inset}" y="${b.y + inset}" width="${Math.max(b.w - 2 * inset, 0)}" height="${Math.max(b.h - 2 * inset, 0)}" rx="4"/>`,
    `<path class="room__plus" d="M${b.cx - 9} ${b.cy - 10}h18M${b.cx} ${b.cy - 19}v18"/>`,
    `<text class="room__label room__label--small" x="${b.cx}" y="${b.cy + 18}" text-anchor="middle">${esc(noun)}</text>`,
    `</g>`,
  ].join('');
}

function includedRoom(r: PlanRoom, interactive: boolean): string {
  const b = box(r);
  const attrs = interactive ? ` role="button" tabindex="0" aria-label="${esc(r.label)}: show what we clean"` : '';
  return [
    `<g class="room room--included room--${r.kind}" data-room-id="${r.id}" data-kind="${r.kind}"${attrs}>`,
    `<rect class="room__fill" x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>`,
    `<text class="room__label" x="${b.cx}" y="${b.cy + 6}" text-anchor="middle">${esc(r.label)}</text>`,
    `</g>`,
  ].join('');
}

export function renderPlanSvg(plan: Plan, opts: { mode: 'edit' | 'read'; title: string }): string {
  const rooms = opts.mode === 'read' ? plan.rooms.filter((r) => r.state === 'included') : plan.rooms;
  const width = plan.width * UNIT;
  const height = plan.height * UNIT;
  const body = rooms.map((r) => (r.state === 'available' ? availableRoom(r) : includedRoom(r, opts.mode === 'read'))).join('');
  const walls = plan.rooms
    .map((r) => {
      const b = box(r);
      return `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/>`;
    })
    .join('');
  return [
    `<svg class="plan__svg" viewBox="${-PAD} ${-PAD} ${width + 2 * PAD} ${height + 2 * PAD}" role="group" aria-label="${esc(opts.title)}">`,
    `<title>${esc(opts.title)}</title>`,
    body,
    `<g class="plan__walls" aria-hidden="true">${walls}<rect class="plan__outer" x="0" y="0" width="${width}" height="${height}"/></g>`,
    `</svg>`,
  ].join('');
}
