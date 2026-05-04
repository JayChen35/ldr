import { Application, Container } from 'pixi.js';
import { VIEW_W, VIEW_H, COUNTDOWN_URL } from './config';
import { buildOcean, type OceanRefs } from './scene/ocean';
import { buildIsland, type IslandRefs } from './scene/island';
import { buildPathGraph } from './scene/pathfinding';
import { buildAmbient, type AmbientRefs } from './scene/ambient';
import { buildMan, type ManRefs } from './characters/man';
import { buildWoman, type WomanRefs } from './characters/woman';
import { startCountdown, type CountdownConfig } from './ui/countdown';
import { hideLoading } from './ui/loading';

interface Layers {
  sky: Container;
  sea: Container;
  seaSurface: Container; // boats, dolphins
  islandBack: Container; // island ground, back-row buildings
  islandMid: Container; // main buildings, fountain
  islandFront: Container; // characters, foreground details
  ui: Container; // in-canvas decals (speech bubbles)
}

function buildLayers(stage: Container): Layers {
  const sky = new Container();
  const sea = new Container();
  const seaSurface = new Container();
  const islandBack = new Container();
  const islandMid = new Container();
  const islandFront = new Container();
  const ui = new Container();
  stage.addChild(sky, sea, seaSurface, islandBack, islandMid, islandFront, ui);
  return { sky, sea, seaSurface, islandBack, islandMid, islandFront, ui };
}

// Fit the canvas to nearly fill the window. We use float scaling here (rather
// than integer-locking) so the graphic occupies almost the entire viewport at
// any window size; the GPU's nearest-neighbor scaling still keeps pixel art
// crisp because the canvas backing buffer stays at VIEW_W × VIEW_H.
function fitToWindow(canvas: HTMLCanvasElement, app: Application) {
  const margin = 6; // small breathing room so the panel isn't edge-glued
  const w = window.innerWidth - margin * 2;
  const h = window.innerHeight - margin * 2;
  const scale = Math.min(w / VIEW_W, h / VIEW_H);
  const cssW = Math.floor(VIEW_W * scale);
  const cssH = Math.floor(VIEW_H * scale);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.style.position = 'absolute';
  canvas.style.left = `${Math.round((window.innerWidth - cssW) / 2)}px`;
  canvas.style.top = `${Math.round((window.innerHeight - cssH) / 2)}px`;
  // Internal resolution stays at VIEW_W × VIEW_H.
  app.renderer.resize(VIEW_W, VIEW_H);
}

interface CursorState {
  // Cursor in internal canvas pixels. Out-of-canvas → null/clamped.
  x: number;
  y: number;
  inside: boolean;
}

function attachCursorTracking(canvas: HTMLCanvasElement): CursorState {
  const state: CursorState = { x: VIEW_W / 2, y: VIEW_H / 2, inside: false };
  const update = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const sx = (clientX - rect.left) * (VIEW_W / rect.width);
    const sy = (clientY - rect.top) * (VIEW_H / rect.height);
    state.x = sx;
    state.y = sy;
    state.inside = sx >= 0 && sx <= VIEW_W && sy >= 0 && sy <= VIEW_H;
  };
  window.addEventListener('mousemove', (e) => update(e.clientX, e.clientY));
  window.addEventListener('pointermove', (e) => update(e.clientX, e.clientY));
  window.addEventListener(
    'touchmove',
    (e) => {
      const t = e.touches[0];
      if (t) update(t.clientX, t.clientY);
    },
    { passive: true },
  );
  window.addEventListener('mouseleave', () => (state.inside = false));
  return state;
}

async function loadCountdownConfig(): Promise<CountdownConfig> {
  try {
    const res = await fetch(COUNTDOWN_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Partial<CountdownConfig>;
    return {
      targetDate: data.targetDate ?? new Date(Date.now() + 86400000).toISOString(),
      name: data.name ?? 'you',
    };
  } catch (e) {
    console.warn('countdown.json missing or invalid; using fallback', e);
    return {
      targetDate: new Date(Date.now() + 86400000).toISOString(),
      name: 'you',
    };
  }
}

async function main() {
  const canvas = document.getElementById('scene') as HTMLCanvasElement;

  const app = new Application();
  await app.init({
    canvas,
    width: VIEW_W,
    height: VIEW_H,
    background: 0xffd4a3,
    antialias: false,
    resolution: 1,
    autoDensity: false,
    powerPreference: 'high-performance',
  });

  fitToWindow(canvas, app);
  window.addEventListener('resize', () => fitToWindow(canvas, app));

  const layers = buildLayers(app.stage);
  const cursor = attachCursorTracking(canvas);
  const renderer = app.renderer;

  // Build everything in scene order (back → front).
  const ocean: OceanRefs = buildOcean(layers, renderer);
  const island: IslandRefs = buildIsland(layers, renderer);
  const graph = buildPathGraph();
  const ambient: AmbientRefs = buildAmbient(layers, renderer, island);
  const man: ManRefs = buildMan(layers, renderer, graph);
  const woman: WomanRefs = buildWoman(layers, renderer);

  // Load countdown config in parallel with first paint.
  const countdownCfg = await loadCountdownConfig();
  startCountdown(countdownCfg);

  // Reveal UI now that the scene is painted at least once.
  document.getElementById('ui')?.classList.add('is-ready');
  hideLoading();

  // Master ticker. Pixi v8 ticker delta is in frames at 60fps; convert to seconds.
  app.ticker.add((tick) => {
    const dt = tick.deltaMS / 1000;
    ocean.update(dt);
    ambient.update(dt);
    island.update(dt);
    man.update(dt, cursor);
    woman.update(dt, cursor);
  });
}

main().catch((err) => {
  console.error(err);
  const loading = document.getElementById('loading');
  if (loading) loading.innerHTML = `<div style="color:#fff;font-family:VT323,monospace;font-size:18px;padding:20px;text-align:center;">Something went sideways:<br>${(err as Error).message}</div>`;
});
