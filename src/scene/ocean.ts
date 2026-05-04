import {
  Container,
  Graphics,
  Renderer,
  Sprite,
  Texture,
} from 'pixi.js';
import { PAL, VIEW_H, VIEW_W, BOAT_SPEED_MIN, BOAT_SPEED_MAX, SUN_DESCENT_PX_PER_MIN } from '../config';
import { pixelsToTexture, type PaletteMap, type PixelArt } from './sprites';

export interface OceanRefs {
  update: (dt: number) => void;
  // y-coordinate of horizon line — useful for placing boats/dolphins
  horizonY: number;
}

interface Layers {
  sky: Container;
  sea: Container;
  seaSurface: Container;
}

const HORIZON_Y = 150; // sea begins here
const SUN_RADIUS = 14;

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

// ─── Sky ──────────────────────────────────────────────────────────────────────
function drawSky(parent: Container) {
  const g = new Graphics();
  // Vertical gradient as 1px-tall horizontal strips.
  for (let y = 0; y < HORIZON_Y; y++) {
    const t = y / HORIZON_Y;
    let color: number;
    if (t < 0.55) {
      color = lerpColor(PAL.skyTop, PAL.skyMid, t / 0.55);
    } else {
      color = lerpColor(PAL.skyMid, PAL.skyLow, (t - 0.55) / 0.45);
    }
    g.rect(0, y, VIEW_W, 1).fill(color);
  }
  parent.addChild(g);
}

// ─── Sun ──────────────────────────────────────────────────────────────────────
function drawSun(parent: Container): { sprite: Container } {
  const c = new Container();
  // Glow halo (soft band of pinkish-orange around sun)
  const halo = new Graphics();
  for (let r = SUN_RADIUS + 12; r >= SUN_RADIUS + 2; r--) {
    const t = (r - (SUN_RADIUS + 2)) / 12;
    const col = lerpColor(PAL.sun, PAL.skyMid, t);
    halo.circle(0, 0, r).fill({ color: col, alpha: 0.22 });
  }
  c.addChild(halo);

  // Sun disc
  const disc = new Graphics();
  disc.circle(0, 0, SUN_RADIUS).fill(PAL.sun);
  disc.circle(-2, -2, SUN_RADIUS - 4).fill(PAL.sunCore);
  c.addChild(disc);

  c.x = 380;
  c.y = 78;
  parent.addChild(c);
  return { sprite: c };
}

// ─── Clouds ───────────────────────────────────────────────────────────────────
const CLOUD_PIXELS: PixelArt = [
  '...11111....',
  '..1122211...',
  '.112222211..',
  '11222222221.',
  '.1122221111.',
  '..1111......',
];
function drawClouds(parent: Container, renderer: Renderer) {
  const palette: PaletteMap = { '1': PAL.cloud, '2': PAL.cloudHi };
  const tex = pixelsToTexture(CLOUD_PIXELS, palette, renderer);
  const positions: Array<[number, number, number]> = [
    [40, 30, 1.0],
    [120, 50, 0.85],
    [220, 25, 1.1],
    [300, 55, 0.9],
    [430, 35, 0.85],
    [180, 95, 0.7],
    [350, 105, 0.7],
  ];
  for (const [x, y, scale] of positions) {
    const s = new Sprite(tex);
    s.x = x;
    s.y = y;
    s.scale.set(scale);
    s.alpha = 0.9;
    parent.addChild(s);
  }
}

// ─── Sea ──────────────────────────────────────────────────────────────────────
function drawSea(parent: Container): { wavesG: Graphics; sparkleG: Graphics } {
  const g = new Graphics();
  for (let y = HORIZON_Y; y < VIEW_H; y++) {
    const t = (y - HORIZON_Y) / (VIEW_H - HORIZON_Y);
    const color =
      t < 0.5
        ? lerpColor(PAL.seaShallow, PAL.seaMid, t / 0.5)
        : lerpColor(PAL.seaMid, PAL.seaDeep, (t - 0.5) / 0.5);
    g.rect(0, y, VIEW_W, 1).fill(color);
  }
  parent.addChild(g);

  // Horizon line (slightly brighter strip just below horizon for atmosphere)
  const hz = new Graphics();
  hz.rect(0, HORIZON_Y, VIEW_W, 1).fill(0xffd9b8);
  parent.addChild(hz);

  // Wave/sparkle layers — animated each frame
  const wavesG = new Graphics();
  const sparkleG = new Graphics();
  parent.addChild(wavesG, sparkleG);
  return { wavesG, sparkleG };
}

// ─── Boats ────────────────────────────────────────────────────────────────────
// Codes: H = hull, h = hull shade, M = mast, S = sail, s = sail shade,
// F = pennant flag, w = water below hull
const BOAT_RED: PixelArt = [
  '......M......',
  '......M......',
  '....SSM......',
  '...SSSM......',
  '..SSSSM......',
  '.SSSSSM......',
  'SSSSSSM......',
  '.sssssM......',
  '......M......',
  '.HHHHHHHHHHH.',
  'HHHHHHHHHHHHH',
  '.HHHHHHHHHHH.',
  '..hhhhhhhhh..',
];
const BOAT_BLUE: PixelArt = [
  '......M......',
  '......MF.....',
  '....BBM......',
  '...BBBM......',
  '..BBBBM......',
  '.BBBBBM......',
  'BBBBBBM......',
  '.bbbbbM......',
  '......M......',
  '.HHHHHHHHHHH.',
  'HHHHHHHHHHHHH',
  '.HHHHHHHHHHH.',
  '..hhhhhhhhh..',
];
// A small fishing boat (no sail) for variety
const BOAT_SMALL: PixelArt = [
  '......M......',
  '....SSMSS....',
  '...SSSMSSs...',
  '...SSSMSSs...',
  '......M......',
  '.HHHHHHHHHH..',
  '..HHHHHHHH...',
];

interface Boat {
  sprite: Sprite;
  speed: number;
  bobPhase: number;
  baseY: number;
}

function drawBoats(parent: Container, renderer: Renderer): Boat[] {
  const paletteRed: PaletteMap = {
    H: PAL.wood,
    h: 0x6b3e25,
    M: 0x4a2f1c,
    S: PAL.awningRed,
    s: 0x8a2d2d,
    F: PAL.awningCream,
  };
  const paletteBlue: PaletteMap = {
    H: PAL.wood,
    h: 0x6b3e25,
    M: 0x4a2f1c,
    B: PAL.dome,
    b: PAL.domeShade,
    F: PAL.awningCream,
  };
  const paletteSmall: PaletteMap = {
    H: PAL.wood,
    h: 0x6b3e25,
    M: 0x4a2f1c,
    S: PAL.awningCream,
    s: PAL.whiteDark,
  };

  const texRed = pixelsToTexture(BOAT_RED, paletteRed, renderer);
  const texBlue = pixelsToTexture(BOAT_BLUE, paletteBlue, renderer);
  const texSmall = pixelsToTexture(BOAT_SMALL, paletteSmall, renderer);

  const defs: Array<{ tex: Texture; y: number; speed: number; x: number }> = [
    { tex: texRed, y: HORIZON_Y + 8, speed: BOAT_SPEED_MIN + 1, x: 50 },
    { tex: texBlue, y: HORIZON_Y + 28, speed: BOAT_SPEED_MAX - 2, x: 180 },
    { tex: texRed, y: HORIZON_Y + 50, speed: BOAT_SPEED_MIN + 2, x: 320 },
    { tex: texBlue, y: HORIZON_Y + 14, speed: BOAT_SPEED_MIN + 3, x: 420 },
    { tex: texSmall, y: HORIZON_Y + 76, speed: BOAT_SPEED_MIN, x: 100 },
    { tex: texSmall, y: HORIZON_Y + 92, speed: BOAT_SPEED_MIN + 1, x: 380 },
  ];

  const boats: Boat[] = [];
  for (const def of defs) {
    const s = new Sprite(def.tex);
    s.anchor.set(0.5, 1.0);
    s.x = def.x;
    s.y = def.y;
    parent.addChild(s);
    boats.push({
      sprite: s,
      speed: def.speed,
      bobPhase: Math.random() * Math.PI * 2,
      baseY: def.y,
    });
  }
  return boats;
}

// ─────────────────────────────────────────────────────────────────────────────
export function buildOcean(layers: Layers, renderer: Renderer): OceanRefs {
  drawSky(layers.sky);
  const sun = drawSun(layers.sky);
  drawClouds(layers.sky, renderer);
  const { wavesG, sparkleG } = drawSea(layers.sea);
  const boats = drawBoats(layers.seaSurface, renderer);

  let time = 0;

  return {
    horizonY: HORIZON_Y,
    update(dt: number) {
      time += dt;

      // Sun very slowly descends.
      sun.sprite.y += (SUN_DESCENT_PX_PER_MIN / 60) * dt;

      // Boats drift right; wrap when off screen, with vertical bob.
      for (const b of boats) {
        b.sprite.x += b.speed * dt;
        if (b.sprite.x > VIEW_W + 30) b.sprite.x = -30;
        b.bobPhase += dt * 1.4;
        b.sprite.y = Math.round(b.baseY + Math.sin(b.bobPhase) * 0.8);
      }

      // Animated wave lines + sparkles on sea.
      wavesG.clear();
      sparkleG.clear();
      for (let i = 0; i < 22; i++) {
        const baseY = HORIZON_Y + 6 + i * 5;
        if (baseY > VIEW_H - 4) break;
        const phase = time * 0.6 + i * 0.4;
        const offset = Math.sin(phase) * (2 + i * 0.1);
        // Two short foam dashes per row, drifting horizontally.
        for (let j = 0; j < 4; j++) {
          const x =
            ((time * (10 + i * 0.5) + j * 130 + i * 35) % (VIEW_W + 40)) -
            20 +
            offset;
          const len = 3 + ((i + j) % 3);
          const alpha = 0.18 + (i % 4) * 0.05;
          wavesG.rect(Math.round(x), Math.round(baseY), len, 1).fill({ color: PAL.seaFoam, alpha });
        }
      }
      // Glittering sparkles near horizon (sun reflection)
      for (let i = 0; i < 14; i++) {
        const phase = time * 1.1 + i * 0.7;
        if (Math.sin(phase) < 0.5) continue;
        const x = 350 + Math.sin(phase * 1.7) * 60;
        const y = HORIZON_Y + 4 + (i % 5) * 4;
        sparkleG.rect(Math.round(x), Math.round(y), 1, 1).fill({ color: 0xfff7d8, alpha: 0.85 });
      }
    },
  };
}
