/**
 * The 3D home model on an edit plan (spec §6). The SVG plan itself is the floor:
 * CSS3DRenderer lays the real drawing on the ground plane, so its labels, colours,
 * focus rings and click handling are untouched. A transparent WebGL canvas above
 * it draws only what has height (walls, furniture, shadows) and never takes
 * pointer events. This is the only file that imports three.
 */
import {
  BoxGeometry,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShadowMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { rooms } from '@/config/rooms';
import { onSelection } from '@/domain/events';
import type { Selection } from '@/domain/selection';
import { layout } from './layout';
import { model } from './model';
import { PAD, UNIT } from './svg';

const FOV = 30;
/** Rest pose: the camera sits 50° above the horizon, so 40° off straight down. */
const TILT = MathUtils.degToRad(40);
const TURN = MathUtils.degToRad(4);
/** At rest the plan's near edge fills this much of the stage width. */
const FIT = 0.9;
const RISE_MS = 180;
/** Frame-time watchdog (spec §6.4): frames per sample, and the slowest acceptable average. */
const SAMPLE = 60;
const SLOW_MS = 40;

const clamp01 = (n: number) => Math.min(Math.max(n, 0), 1);
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Test seam (tests/e2e/model.e2e.mjs): where WebGL draws a point of the plan, in viewport pixels. */
type Probe = { planPointOnScreen?: (x: number, y: number) => [number, number] };

export function start(figure: HTMLElement & Probe, selection: Selection): void {
  const stage = figure.querySelector<HTMLElement>('[data-plan-stage]');
  const drawing = figure.querySelector<HTMLElement>('[data-plan-svg]');
  if (!stage || !drawing) return;

  let gl: WebGLRenderer;
  try {
    gl = new WebGLRenderer({ alpha: true, antialias: true });
  } catch {
    return; // no context: the flat plan stays
  }
  gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  gl.shadowMap.enabled = true;
  const canvas = gl.domElement;
  canvas.className = 'plan__model';
  canvas.setAttribute('aria-hidden', 'true');

  const css = new CSS3DRenderer();
  css.domElement.className = 'plan__floor';
  // CSS3DRenderer clips at the stage edge. Clip a little further out, so a focus ring just outside the
  // drawing still shows; leaving it unclipped lets the tilted plan widen the page's scroll area.
  css.domElement.style.overflow = 'clip';
  css.domElement.style.overflowClipMargin = '8px';

  const token = (name: string) => new Color(getComputedStyle(figure).getPropertyValue(name).trim());
  const white = token('--color-surface');
  const geometry = new BoxGeometry(1, 1, 1).translate(0.5, 0.5, 0.5); // origin at a bottom corner
  const materials = {
    wall: new MeshStandardMaterial({ color: white, roughness: 0.9 }),
    furniture: new MeshStandardMaterial({ color: token('--color-paper'), roughness: 0.9 }),
  };
  const shade = new ShadowMaterial({ color: token('--color-ink'), opacity: 0.2 });

  const scene = new Scene();
  const pivot = new Group(); // turns with the pointer
  const boxes = new Group(); // plan units to pixels
  const floor = new CSS3DObject(drawing);
  floor.rotation.x = -Math.PI / 2;
  const ground = new Mesh(new PlaneGeometry(1, 1), shade);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  pivot.add(boxes, ground);
  const sun = new DirectionalLight(white, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0004;
  scene.add(pivot, sun, sun.target, new HemisphereLight(white, token('--color-room'), 2.2));

  const camera = new PerspectiveCamera(FOV, 1, 1, 10);
  camera.up.set(0, 0, -1); // the top of the plan is the top of the screen

  let plan = layout(selection, rooms);
  let known = new Set<string>();
  let width = 0;
  let height = 0;
  let focal = 0;
  let tilt = 0; // 0 flat, 1 rest pose
  let tiltTarget = 0;
  let turn = 0; // -1 to 1, follows the pointer
  let turnTarget = 0;
  let inView = true;
  let frame = 0;
  let last = 0;
  let sampled = 0;
  let sampleMs = 0;
  let watching = 2; // slow samples left: the first turns shadows off, the second removes the model

  const ac = new AbortController();

  const build = (s: Selection, now: number) => {
    plan = layout(s, rooms);
    const before = known;
    known = new Set();
    boxes.clear();
    for (const b of model(plan)) {
      const mesh = new Mesh(geometry, materials[b.kind]);
      mesh.position.set(b.x, 0, b.y);
      mesh.scale.set(b.w, b.h, b.d);
      mesh.castShadow = mesh.receiveShadow = true;
      // A room that was not there a moment ago rises; the first build stands with the tilt.
      mesh.userData = { h: b.h, born: before.size && !before.has(b.room) ? now : 0 };
      boxes.add(mesh);
      known.add(b.room);
    }
    figure.dataset.modelBoxes = String(boxes.children.length);
  };

  /** Flat as the estimator enters the viewport, at rest once it reaches the middle. */
  const measure = () => {
    const r = stage.getBoundingClientRect();
    tiltTarget = smooth(clamp01((window.innerHeight - r.top) / (window.innerHeight / 2 + r.height / 2)));
  };

  const resize = () => {
    const r = stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    width = r.width;
    height = r.height;
    focal = height / 2 / Math.tan(MathUtils.degToRad(FOV / 2)); // at this distance one unit is one CSS pixel
    const px = (width / (plan.width * UNIT + 2 * PAD)) * UNIT;
    const reach = Math.hypot(width, height);
    drawing.style.width = `${width}px`;
    drawing.style.height = `${height}px`;
    camera.aspect = width / height;
    camera.near = focal / 10;
    camera.far = focal * 4;
    camera.updateProjectionMatrix();
    gl.setSize(width, height);
    css.setSize(width, height);
    boxes.scale.setScalar(px);
    boxes.position.set((-plan.width / 2) * px, 0, (-plan.height / 2) * px);
    ground.scale.set(width, height, 1); // shadows land on the plan only
    Object.assign(sun.shadow.camera, { left: -reach, right: reach, top: reach, bottom: -reach, near: reach, far: reach * 5 });
    sun.shadow.camera.updateProjectionMatrix();
    measure();
    invalidate();
  };

  /** Places camera, sun and boxes for the current tilt. True while a new room is still rising. */
  const pose = (now: number): boolean => {
    const angle = TILT * tilt;
    const distance = focal * (1 + tilt * (1 / FIT - 1)) + (height / 2) * Math.sin(angle);
    camera.position.set(0, distance * Math.cos(angle), distance * Math.sin(angle));
    camera.lookAt(0, 0, 0);
    pivot.rotation.y = turn * TURN * tilt;

    // The sun crosses from morning to afternoon as the page scrolls.
    const page = document.documentElement;
    const day = clamp01(window.scrollY / Math.max(page.scrollHeight - window.innerHeight, 1));
    const reach = Math.hypot(width, height);
    sun.position.set(Math.cos(MathUtils.lerp(0.2, 0.8, day) * Math.PI) * reach * 2, reach * 2, reach * 0.9);

    let rising = false;
    for (const mesh of boxes.children) {
      const { h, born } = mesh.userData as { h: number; born: number };
      const grown = born ? clamp01((now - born) / RISE_MS) : 1;
      if (grown < 1) rising = true;
      const up = h * tilt * smooth(grown);
      mesh.visible = up > 0.001;
      mesh.scale.y = Math.max(up, 0.001);
    }
    return rising;
  };

  /** Moving the drawing in the DOM drops focus; put it back where the visitor had it. */
  const keepFocus = (move: () => void) => {
    const active = document.activeElement;
    const held = (active instanceof HTMLElement || active instanceof SVGElement) && drawing.contains(active) ? active : null;
    move();
    held?.focus({ preventScroll: true });
  };

  /** Back to the flat plan, for good (spec §6.4). */
  const stop = () => {
    if (ac.signal.aborted) return;
    ac.abort();
    cancelAnimationFrame(frame);
    resizer.disconnect();
    watcher.disconnect();
    unsubscribe();
    keepFocus(() => {
      pivot.remove(floor); // a removed CSS3DObject takes its element out of the page
      drawing.removeAttribute('style');
      drawing.removeAttribute('draggable');
      stage.prepend(drawing);
    });
    css.domElement.remove();
    canvas.remove();
    delete figure.dataset.model;
    delete figure.dataset.modelBoxes;
    delete figure.planPointOnScreen;
    geometry.dispose();
    ground.geometry.dispose();
    shade.dispose();
    Object.values(materials).forEach((material) => material.dispose());
    gl.dispose();
  };

  const watch = (dt: number) => {
    if (!watching) return;
    sampleMs += dt;
    if (++sampled < SAMPLE) return;
    const slow = sampleMs / sampled > SLOW_MS;
    sampled = sampleMs = 0;
    if (!slow) watching = 0;
    else if (--watching) {
      gl.shadowMap.enabled = false;
      sun.castShadow = false;
      ground.visible = false;
    } else stop();
  };

  /** Rendering is on demand: a frame is drawn only when something changed, and only while in view. */
  const invalidate = () => {
    if (!frame && inView && !ac.signal.aborted) frame = requestAnimationFrame(tick);
  };
  const tick = (now: number) => {
    frame = 0;
    const dt = last ? Math.min(now - last, 100) : 16;
    const k = 1 - Math.exp(-dt / 140);
    tilt += (tiltTarget - tilt) * k;
    turn += (turnTarget - turn) * k;
    const settling = Math.abs(tiltTarget - tilt) > 0.001 || Math.abs(turnTarget - turn) > 0.001;
    if (!settling) {
      tilt = tiltTarget;
      turn = turnTarget;
    }
    const moving = pose(now) || settling;
    css.render(scene, camera);
    gl.render(scene, camera);
    if (last) watch(dt);
    last = moving ? now : 0;
    if (moving) invalidate();
  };

  build(selection, 0);
  pivot.add(floor);
  stage.append(css.domElement, canvas);
  figure.dataset.model = 'on';

  const resizer = new ResizeObserver(resize);
  resizer.observe(stage);
  const watcher = new IntersectionObserver((entries) => {
    inView = entries.at(-1)!.isIntersecting; // the newest record; an older one can be queued ahead of it
    invalidate();
  });
  watcher.observe(stage);
  const unsubscribe = onSelection((s) => {
    build(s, performance.now());
    invalidate();
  });
  const listen = { passive: true, signal: ac.signal };
  window.addEventListener('scroll', () => (measure(), invalidate()), listen);
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    figure.addEventListener(
      'pointermove',
      (e) => {
        const r = stage.getBoundingClientRect();
        turnTarget = Math.min(Math.max(((e.clientX - r.left) / r.width) * 2 - 1, -1), 1);
        invalidate();
      },
      listen,
    );
    figure.addEventListener('pointerleave', () => ((turnTarget = 0), invalidate()), listen);
  }
  canvas.addEventListener('webglcontextlost', stop, { once: true });

  resize();
  keepFocus(() => css.render(scene, camera)); // the first render moves the drawing onto the floor; the frame resize() asked for poses it before anything is painted

  figure.planPointOnScreen = (x, y) => {
    const v = boxes.localToWorld(new Vector3(x, 0, y)).project(camera);
    const r = canvas.getBoundingClientRect();
    return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
  };
}
