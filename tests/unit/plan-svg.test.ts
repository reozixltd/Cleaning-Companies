import { describe, expect, it } from 'vitest';
import { renderPlanSvg } from '@/features/plan/svg';
import { layout } from '@/features/plan/layout';
import { DEFAULT_SELECTION } from '@/domain/selection';
import { rooms } from '@/config/rooms';

const plan = layout(DEFAULT_SELECTION, rooms);

describe('renderPlanSvg', () => {
  it('draws one group per room with its id and state', () => {
    const svg = renderPlanSvg(plan, { mode: 'edit', title: 'Your home' });
    const host = document.createElement('div');
    host.innerHTML = svg;
    const groups = host.querySelectorAll('[data-room-id]');
    expect(groups).toHaveLength(plan.rooms.length);
    expect(host.querySelector('[data-room-id="bed-1"]')?.getAttribute('class')).toContain('room--included');
    expect(host.querySelector('title')?.textContent).toBe('Your home');
  });

  it('edit mode makes available rooms keyboard buttons', () => {
    const host = document.createElement('div');
    host.innerHTML = renderPlanSvg(plan, { mode: 'edit', title: 'Your home' });
    const add = host.querySelector('[data-room-id="add-bedroom"]')!;
    expect(add.getAttribute('role')).toBe('button');
    expect(add.getAttribute('tabindex')).toBe('0');
    expect(add.getAttribute('aria-label')).toBe('Add a bedroom');
    expect(host.querySelector('[data-room-id="bed-1"]')?.getAttribute('role')).toBeNull();
  });

  it('read mode makes included rooms buttons and hides available slots', () => {
    const host = document.createElement('div');
    host.innerHTML = renderPlanSvg(plan, { mode: 'read', title: 'What we clean' });
    expect(host.querySelector('[data-room-id="add-bedroom"]')).toBeNull();
    const kitchen = host.querySelector('[data-room-id="kitchen"]')!;
    expect(kitchen.getAttribute('role')).toBe('button');
    expect(kitchen.getAttribute('aria-label')).toBe('Kitchen: show what we clean');
  });

  it('escapes labels', () => {
    const odd = { ...plan, rooms: [{ ...plan.rooms[0], label: '<b>&' }] };
    expect(renderPlanSvg(odd, { mode: 'edit', title: 'x' })).toContain('&lt;b&gt;&amp;');
  });
});
