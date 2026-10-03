/**
 * Tiny element builder for the console. Lead data comes from visitors, so it
 * only ever reaches the page as text nodes and attribute values: nothing here
 * parses HTML.
 *
 *   el('button', { type: 'button', class: 'x', 'data-id': id, onClick }, 'Confirm')
 */
export type Child = Node | string | number | null | undefined | false | Child[];
export type AttrValue = string | number | boolean | null | undefined | ((event: Event) => void);

function append(node: Node, child: Child): void {
  if (child === null || child === undefined || child === false) return;
  if (Array.isArray(child)) child.forEach((c) => append(node, c));
  else node.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, AttrValue> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'function') {
      if (/^on[A-Z]/.test(key)) node.addEventListener(key.slice(2).toLowerCase(), value);
      continue;
    }
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = String(value);
    else node.setAttribute(key, value === true ? '' : String(value));
  }
  children.forEach((c) => append(node, c));
  return node;
}

/**
 * Clones the first element of `<template data-tpl="name">`, so server-rendered
 * components (buttons, badges) keep one source of styling. `text` goes into the
 * clone's `[data-tpl-text]` element (or the clone itself) as plain text.
 */
export function fromTemplate<T extends HTMLElement = HTMLElement>(name: string, text?: string, scope: ParentNode = document): T {
  const tpl = scope.querySelector<HTMLTemplateElement>(`template[data-tpl="${name}"]`);
  const node = (tpl?.content.firstElementChild?.cloneNode(true) ?? document.createElement('span')) as T;
  if (text !== undefined) (node.querySelector<HTMLElement>('[data-tpl-text]') ?? node).textContent = text;
  return node;
}
