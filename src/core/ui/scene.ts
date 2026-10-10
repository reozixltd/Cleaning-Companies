/**
 * Background video for Scene.astro (spec §7.1). The <video> ships with no source,
 * so nothing downloads until this decides the device can afford it: a viewport
 * 768px or wider, motion allowed, Save-Data off and a connection better than 3G.
 * It plays only while on screen. If anything fails, the still stays as it is.
 */
import { sitePath } from '../paths';

type Connection = { saveData?: boolean; effectiveType?: string };

function allowed(): boolean {
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  return (
    window.matchMedia('(min-width: 768px)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
    !connection?.saveData &&
    !/[23]g$/.test(connection?.effectiveType ?? '')
  );
}

function attach(scene: HTMLElement): void {
  const video = scene.querySelector<HTMLVideoElement>('[data-scene-video]');
  const toggle = scene.querySelector<HTMLButtonElement>('[data-scene-toggle]');
  if (!video || !toggle) return;
  for (const format of (video.dataset.formats ?? '').split(' ').filter(Boolean)) {
    const source = document.createElement('source');
    source.src = sitePath(`/media/${video.dataset.sceneVideo}.${format}`);
    source.type = `video/${format}`;
    video.append(source);
  }

  let pausedByVisitor = false;
  let onScreen = false;
  const sync = () => {
    if (onScreen && !pausedByVisitor) video.play().catch(() => {});
    else video.pause();
  };
  // The button arrives with the first moving frame, so there is never motion without a way to stop it.
  video.addEventListener(
    'playing',
    () => {
      scene.dataset.playing = '';
      toggle.hidden = false;
    },
    { once: true },
  );
  toggle.addEventListener('click', () => {
    pausedByVisitor = !pausedByVisitor;
    toggle.setAttribute('aria-pressed', String(pausedByVisitor));
    sync();
  });
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  }).observe(scene);
}

let started = false;

export function initScenes(): void {
  if (started) return;
  started = true;
  if (!('IntersectionObserver' in window) || !allowed()) return;
  const begin = () => document.querySelectorAll<HTMLElement>('[data-scene]').forEach(attach);
  if (document.readyState === 'complete') begin();
  else window.addEventListener('load', begin, { once: true });
}
