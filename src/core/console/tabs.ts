/**
 * WAI-ARIA tabs (automatic activation): click, or Left/Right arrows, Home and
 * End with a roving tabindex. Every tab may control the same panel (a filtered
 * list), so the panel's aria-labelledby follows the selected tab.
 */
export function initTabs(tablist: HTMLElement, onChange: (id: string) => void): (id: string) => void {
  const tabs = () => [...tablist.querySelectorAll<HTMLElement>('[role="tab"]')];

  const select = (tab: HTMLElement, focus: boolean) => {
    for (const t of tabs()) {
      const active = t === tab;
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
    }
    const panel = document.getElementById(tab.getAttribute('aria-controls') ?? '');
    if (panel && tab.id) panel.setAttribute('aria-labelledby', tab.id);
    if (focus) tab.focus();
    onChange(tab.dataset.tab ?? '');
  };

  const initial = tabs().find((t) => t.getAttribute('aria-selected') === 'true') ?? tabs()[0];
  tabs().forEach((t) => (t.tabIndex = t === initial ? 0 : -1));

  tablist.addEventListener('click', (e) => {
    const tab = (e.target as Element).closest<HTMLElement>('[role="tab"]');
    if (tab && tablist.contains(tab)) select(tab, false);
  });

  tablist.addEventListener('keydown', (e) => {
    const all = tabs();
    const i = all.indexOf(e.target as HTMLElement);
    if (i < 0) return;
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: all.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(all[(next + all.length) % all.length], true);
  });

  return (id: string) => {
    const tab = tabs().find((t) => t.dataset.tab === id);
    if (tab) select(tab, false);
  };
}
