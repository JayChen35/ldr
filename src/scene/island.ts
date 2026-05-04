import { Container, Graphics, Renderer } from 'pixi.js';
import { PAL } from '../config';

export interface IslandAnchors {
  palaceCenter: { x: number; y: number };
  balconyClothesline: { x1: number; x2: number; y: number };
  coffeeTables: Array<{ x: number; y: number }>;
  bakeryChimney: { x: number; y: number };
  fountainCenter: { x: number; y: number };
}

export interface IslandRefs {
  anchors: IslandAnchors;
  update: (dt: number) => void;
}

interface Layers {
  islandBack: Container;
  islandMid: Container;
  islandFront: Container;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function px(g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1) {
  g.rect(Math.round(x), Math.round(y), w, h).fill({ color, alpha });
}

function pixelEllipse(
  g: Graphics,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: number,
  alpha = 1,
) {
  for (let dy = -ry; dy <= ry; dy++) {
    const w = Math.round(Math.sqrt(1 - (dy * dy) / (ry * ry)) * rx);
    g.rect(Math.round(cx - w), Math.round(cy + dy), w * 2, 1).fill({ color, alpha });
  }
}

function drawWindow(g: Graphics, x: number, y: number) {
  px(g, x, y, 4, 4, PAL.dome);
  px(g, x + 1, y + 1, 2, 2, PAL.domeHi);
  px(g, x + 2, y, 1, 4, PAL.white);
  px(g, x, y + 2, 4, 1, PAL.white);
}

function drawDoor(g: Graphics, x: number, y: number, h = 6) {
  px(g, x, y, 4, h, PAL.wood);
  px(g, x + 1, y + 1, 2, h - 1, PAL.woodLight);
  px(g, x + 3, y + h - 4, 1, 1, 0xffe8a0);
}

function drawDome(
  g: Graphics,
  cx: number,
  by: number,
  color: number,
  hi: number,
  r = 5,
) {
  const drumH = 2;
  px(g, cx - r, by - drumH, r * 2 + 1, drumH, PAL.white);
  px(g, cx - r, by - drumH, 2, drumH, PAL.whiteShade);
  for (let dy = 0; dy < r; dy++) {
    const wHalf = Math.round(Math.cos((dy / r) * (Math.PI / 2)) * r);
    const startY = by - drumH - r + dy;
    px(g, cx - wHalf, startY, wHalf * 2, 1, color);
    px(g, cx - wHalf, startY, Math.max(1, Math.floor(wHalf / 2)), 1, hi);
  }
  // Tiny finial cross
  px(g, cx, by - drumH - r - 2, 1, 2, PAL.wood);
  px(g, cx - 1, by - drumH - r - 1, 3, 1, PAL.wood);
}

interface HouseOpts {
  domeColor?: number;
  domeHi?: number;
  domeR?: number;
  story2?: number;
  awning?: number;
  windowCount?: number;
  chimney?: boolean;
  doorOnLeft?: boolean;
}

// Generic small/medium white-washed house. (cx, by) is bottom-center.
function drawHouse(
  g: Graphics,
  cx: number,
  by: number,
  w: number,
  h: number,
  opts: HouseOpts = {},
) {
  const left = cx - Math.floor(w / 2);
  const top = by - h;

  // Cast shadow
  px(g, left, by, w, 2, PAL.shadow, 0.28);

  // Body
  px(g, left, top, w, h, PAL.white);
  // Wall shading (left side)
  px(g, left, top, 2, h, PAL.whiteShade);
  // Top trim
  px(g, left - 1, top - 1, w + 2, 1, PAL.whiteDark);

  let domeBy = top - 1;

  // Optional second story (step-back)
  if (opts.story2 && opts.story2 > 0) {
    const w2 = Math.max(6, w - 6);
    const left2 = cx - Math.floor(w2 / 2);
    const h2 = opts.story2;
    const top2 = top - h2;
    px(g, left2, top2, w2, h2, PAL.white);
    px(g, left2, top2, 2, h2, PAL.whiteShade);
    px(g, left2 - 1, top2 - 1, w2 + 2, 1, PAL.whiteDark);
    drawWindow(g, cx - 2, top2 + 2);
    domeBy = top2 - 1;
  }

  // Door
  const doorX = opts.doorOnLeft ? left + 2 : cx - 2;
  drawDoor(g, doorX, by - 6);

  // Windows
  const wCount = opts.windowCount ?? (w >= 18 ? 2 : 1);
  if (wCount === 2) {
    drawWindow(g, left + 2, by - 11);
    drawWindow(g, left + w - 6, by - 11);
  } else if (wCount === 1) {
    drawWindow(g, opts.doorOnLeft ? left + w - 6 : left + 2, by - 11);
  }

  // Awning over door
  if (opts.awning !== undefined) {
    for (let i = 0; i < 6; i++) {
      px(g, doorX - 1 + i, by - 8, 1, 2, i % 2 === 0 ? opts.awning : PAL.awningCream);
    }
  }

  // Chimney
  if (opts.chimney) {
    px(g, left + 2, top - 4, 2, 4, PAL.stoneShade);
    px(g, left + 2, top - 4, 2, 1, PAL.shadow);
  }

  // Dome
  if (opts.domeColor !== undefined) {
    drawDome(g, cx, domeBy, opts.domeColor, opts.domeHi ?? PAL.domeHi, opts.domeR ?? 5);
  }
}

// ─── Island ground ───────────────────────────────────────────────────────────
function drawGround(parent: Container) {
  const g = new Graphics();
  pixelEllipse(g, 240, 165, 175, 50, PAL.rock);
  pixelEllipse(g, 240, 163, 168, 46, 0xc7b08a);
  pixelEllipse(g, 240, 158, 158, 40, PAL.grass);
  pixelEllipse(g, 232, 155, 130, 32, PAL.grassDark, 0.55);
  pixelEllipse(g, 240, 192, 145, 14, PAL.sand);
  pixelEllipse(g, 240, 196, 130, 8, PAL.sandLight);

  const rocks: Array<[number, number, number]> = [
    [120, 195, 0x9a8a6a],
    [360, 196, 0x9a8a6a],
    [300, 200, 0x8c7a5a],
    [165, 200, 0x8c7a5a],
  ];
  for (const [x, y, c] of rocks) {
    px(g, x, y, 3, 2, c);
    px(g, x + 1, y - 1, 1, 1, c);
  }

  const shellColor = 0xfff0d6;
  const shellPink = 0xffc4c4;
  const shells: Array<[number, number, number]> = [
    [148, 199, shellPink],
    [200, 202, shellColor],
    [275, 201, shellColor],
    [315, 203, shellPink],
    [220, 200, shellColor],
    [180, 204, shellPink],
    [340, 202, shellColor],
  ];
  for (const [x, y, c] of shells) {
    px(g, x, y, 1, 1, c);
    px(g, x - 1, y, 1, 1, c);
    px(g, x + 1, y, 1, 1, c);
    px(g, x, y - 1, 1, 1, c);
  }

  parent.addChild(g);
}

// ─── Roads ────────────────────────────────────────────────────────────────────
function drawRoads(parent: Container) {
  const g = new Graphics();
  const stoneA = 0xddc9a4;
  const stoneB = 0xc8b48a;

  const plazaCX = 240;
  const plazaCY = 168;
  pixelEllipse(g, plazaCX, plazaCY, 26, 9, stoneA);
  pixelEllipse(g, plazaCX, plazaCY, 22, 7, stoneB, 0.5);

  const drawRoadStrip = (x1: number, y1: number, x2: number, y2: number, width: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.max(1, Math.round(Math.hypot(dx, dy)));
    for (let i = 0; i <= len; i++) {
      const t = i / len;
      const x = Math.round(x1 + dx * t);
      const y = Math.round(y1 + dy * t);
      for (let oy = -Math.floor(width / 2); oy <= Math.floor(width / 2); oy++) {
        for (let ox = -Math.floor(width / 2); ox <= Math.floor(width / 2); ox++) {
          const c = ((x + ox + y + oy) % 2 === 0) ? stoneA : stoneB;
          px(g, x + ox, y + oy, 1, 1, c);
        }
      }
    }
  };

  drawRoadStrip(plazaCX, plazaCY, 175, 162, 3);
  drawRoadStrip(plazaCX, plazaCY, 305, 162, 3);
  drawRoadStrip(plazaCX, plazaCY, 240, 148, 3);
  drawRoadStrip(plazaCX, plazaCY, 240, 184, 3);
  drawRoadStrip(plazaCX, plazaCY, 130, 175, 3);
  drawRoadStrip(plazaCX, plazaCY, 350, 175, 3);
  drawRoadStrip(240, 184, 240, 198, 3);

  parent.addChild(g);
}

// ─── Palace (the centerpiece — kept distinct from the generic houses) ───────
function drawPalace(parent: Container) {
  const g = new Graphics();

  px(g, 215, 152, 50, 4, PAL.shadow, 0.25);

  // Lower story
  px(g, 218, 134, 44, 18, PAL.white);
  // Upper story
  px(g, 222, 116, 36, 18, PAL.white);
  // Wall shading
  px(g, 218, 134, 4, 18, PAL.whiteShade);
  px(g, 222, 116, 4, 18, PAL.whiteShade);
  px(g, 218, 133, 44, 1, PAL.whiteDark);

  // Lower windows
  for (const wx of [226, 252]) {
    px(g, wx, 140, 6, 7, PAL.dome);
    px(g, wx + 1, 141, 4, 5, PAL.domeHi);
    px(g, wx + 3, 140, 1, 7, PAL.white);
    px(g, wx, 143, 6, 1, PAL.white);
  }
  // Window flower boxes
  for (const wx of [225, 251]) {
    px(g, wx, 147, 8, 1, PAL.wood);
    px(g, wx + 1, 146, 1, 1, 0xff8aa6);
    px(g, wx + 3, 146, 1, 1, 0xffd86a);
    px(g, wx + 5, 146, 1, 1, 0xff8aa6);
  }

  // Upper windows
  for (const wx of [228, 246]) {
    px(g, wx, 122, 6, 7, PAL.dome);
    px(g, wx + 1, 123, 4, 5, PAL.domeHi);
    px(g, wx + 3, 122, 1, 7, PAL.white);
    px(g, wx, 125, 6, 1, PAL.white);
  }

  // Door
  px(g, 237, 145, 6, 7, PAL.wood);
  px(g, 238, 146, 4, 5, PAL.woodLight);
  px(g, 241, 148, 1, 1, 0xffe8a0);

  // Front balcony patio
  px(g, 218, 152, 44, 4, PAL.stone);
  px(g, 218, 152, 44, 1, PAL.stoneShade);
  px(g, 218, 156, 44, 1, PAL.shadow, 0.35);
  px(g, 218, 150, 1, 3, PAL.whiteDark);
  px(g, 261, 150, 1, 3, PAL.whiteDark);

  // Clothesline poles (line sits at the man's reaching-hand height)
  px(g, 222, 130, 1, 23, PAL.wood);
  px(g, 258, 130, 1, 23, PAL.wood);
  px(g, 222, 130, 37, 1, 0x6b5a3e);
  px(g, 221, 129, 3, 1, PAL.wood);
  px(g, 257, 129, 3, 1, PAL.wood);

  // Dome drum
  px(g, 232, 105, 16, 4, PAL.white);
  px(g, 232, 105, 4, 4, PAL.whiteShade);
  // Dome
  for (let dy = 0; dy < 8; dy++) {
    const wHalf = Math.round(Math.cos((dy / 8) * (Math.PI / 2)) * 7);
    const startY = 97 + dy;
    px(g, 240 - wHalf, startY, wHalf * 2, 1, PAL.dome);
    px(g, 240 - wHalf, startY, Math.max(1, Math.round(wHalf / 2)), 1, PAL.domeHi);
  }
  px(g, 233, 104, 14, 1, PAL.domeShade);
  // Cross finial
  px(g, 240, 93, 1, 4, PAL.wood);
  px(g, 239, 94, 3, 1, PAL.wood);

  // Side flag
  px(g, 261, 102, 1, 5, PAL.wood);
  px(g, 262, 103, 4, 3, PAL.awningRed);

  parent.addChild(g);
}

// ─── Bakery / Coffee / Market / Fountain (existing buildings) ───────────────
function drawBakery(parent: Container, anchors: IslandAnchors) {
  const g = new Graphics();
  const cx = 175;
  const cy = 158;

  px(g, cx - 12, cy + 4, 26, 3, PAL.shadow, 0.25);

  px(g, cx - 12, cy - 18, 26, 22, PAL.white);
  px(g, cx - 12, cy - 18, 4, 22, PAL.whiteShade);
  px(g, cx - 13, cy - 19, 28, 1, PAL.whiteDark);

  for (let i = 0; i < 26; i++) {
    px(g, cx - 12 + i, cy - 12, 1, 3, i % 2 === 0 ? PAL.awningRed : PAL.awningCream);
  }
  px(g, cx - 13, cy - 12, 28, 1, PAL.awningRed);

  px(g, cx - 9, cy - 9, 17, 7, PAL.stone);
  px(g, cx - 7, cy - 7, 4, 3, PAL.bread);
  px(g, cx - 6, cy - 8, 2, 1, PAL.bread);
  px(g, cx - 1, cy - 7, 4, 3, PAL.bread);
  px(g, cx, cy - 8, 2, 1, PAL.bread);
  px(g, cx + 5, cy - 7, 3, 3, PAL.bread);

  px(g, cx + 5, cy - 1, 5, 5, PAL.wood);
  px(g, cx + 6, cy, 3, 4, PAL.woodLight);
  px(g, cx + 8, cy + 2, 1, 1, 0xffe8a0);

  px(g, cx - 10, cy - 16, 5, 3, PAL.wood);
  px(g, cx - 9, cy - 15, 3, 1, PAL.awningCream);

  px(g, cx + 8, cy - 23, 3, 5, PAL.stoneShade);
  px(g, cx + 8, cy - 23, 3, 1, PAL.shadow);

  anchors.bakeryChimney = { x: cx + 9, y: cy - 23 };

  parent.addChild(g);
}

function drawCoffeeShop(parent: Container, anchors: IslandAnchors) {
  const g = new Graphics();
  const cx = 305;
  const cy = 158;

  px(g, cx - 12, cy + 4, 26, 3, PAL.shadow, 0.25);

  px(g, cx - 12, cy - 16, 24, 20, PAL.white);
  px(g, cx - 12, cy - 16, 4, 20, PAL.whiteShade);
  px(g, cx - 13, cy - 17, 26, 1, PAL.whiteDark);

  px(g, cx - 5, cy - 4, 5, 8, PAL.wood);
  px(g, cx - 4, cy - 3, 3, 7, PAL.woodLight);
  px(g, cx - 2, cy, 1, 1, 0xffe8a0);

  px(g, cx + 3, cy - 11, 8, 6, PAL.dome);
  px(g, cx + 4, cy - 10, 6, 4, PAL.domeHi);
  px(g, cx + 6, cy - 11, 1, 6, PAL.white);
  px(g, cx + 3, cy - 8, 8, 1, PAL.white);

  for (let i = 0; i < 14; i++) {
    px(g, cx - 11 + i, cy - 13, 1, 2, i % 2 === 0 ? PAL.awningBlue : PAL.awningCream);
  }

  px(g, cx + 3, cy - 15, 8, 2, PAL.wood);

  const tables: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < 3; i++) {
    const tx = cx - 11 + i * 9;
    const ty = cy + 7;
    px(g, tx, ty, 5, 2, PAL.stone);
    px(g, tx, ty, 5, 1, PAL.stoneShade);
    px(g, tx + 2, ty + 2, 1, 2, PAL.stoneShade);
    px(g, tx + 1, ty - 1, 3, 1, PAL.white);
    px(g, tx + 1, ty - 2, 3, 1, PAL.whiteDark);
    px(g, tx + 4, ty - 1, 1, 1, PAL.white);
    tables.push({ x: tx + 2, y: ty - 2 });
  }

  anchors.coffeeTables = tables;

  parent.addChild(g);
}

function drawMarket(parent: Container) {
  const g = new Graphics();
  const cx = 240;
  const cy = 188;

  px(g, cx - 28, cy + 5, 56, 2, PAL.shadow, 0.25);

  const stalls = [
    { offset: -22, awning: PAL.awningRed, contentColor: PAL.fish },
    { offset: 0, awning: PAL.awningBlue, contentColor: PAL.fishPink },
    { offset: 22, awning: PAL.awningRed, contentColor: PAL.fish },
  ];
  for (const s of stalls) {
    const sx = cx + s.offset;
    px(g, sx - 8, cy - 8, 1, 8, PAL.wood);
    px(g, sx + 7, cy - 8, 1, 8, PAL.wood);
    for (let i = 0; i < 16; i++) {
      px(g, sx - 8 + i, cy - 9, 1, 3, i % 2 === 0 ? s.awning : PAL.awningCream);
    }
    px(g, sx - 8, cy - 1, 16, 4, PAL.wood);
    px(g, sx - 8, cy - 1, 16, 1, PAL.woodLight);
    px(g, sx - 6, cy - 3, 3, 2, s.contentColor);
    px(g, sx - 2, cy - 3, 3, 2, s.contentColor);
    px(g, sx + 2, cy - 3, 4, 2, s.contentColor);
    px(g, sx - 5, cy - 3, 1, 1, PAL.black);
    px(g, sx - 1, cy - 3, 1, 1, PAL.black);
    px(g, sx + 4, cy - 3, 1, 1, PAL.black);
  }

  parent.addChild(g);
}

function drawFountain(parent: Container, anchors: IslandAnchors) {
  const g = new Graphics();
  const cx = 240;
  const cy = 168;

  pixelEllipse(g, cx, cy + 1, 8, 3, PAL.stoneShade);
  pixelEllipse(g, cx, cy, 7, 2, PAL.stone);
  pixelEllipse(g, cx, cy - 1, 5, 2, 0x6cb6e6);
  px(g, cx - 1, cy - 5, 2, 4, PAL.stone);
  px(g, cx - 1, cy - 5, 2, 1, PAL.stoneShade);
  px(g, cx, cy - 6, 1, 1, PAL.stoneShade);

  anchors.fountainCenter = { x: cx, y: cy - 1 };

  parent.addChild(g);
}

// ─── New: extra town buildings ──────────────────────────────────────────────
// Buildings drawn BEHIND the bakery and coffee shop — they peek up above
// the front-row shops, creating layered depth like a Santorini hillside.
function drawTownBackrow(parent: Container) {
  const g = new Graphics();

  // Chapel-style tall houses behind the bakery & coffee shop
  drawHouse(g, 175, 132, 16, 14, {
    domeColor: PAL.dome,
    domeHi: PAL.domeHi,
    domeR: 4,
    windowCount: 1,
  });
  drawHouse(g, 305, 132, 16, 14, {
    domeColor: PAL.dome,
    domeHi: PAL.domeHi,
    domeR: 4,
    windowCount: 1,
    doorOnLeft: true,
  });

  // Two more back-row houses tucked further behind, slightly off-axis
  drawHouse(g, 150, 138, 12, 10, { windowCount: 1 });
  drawHouse(g, 330, 138, 12, 10, { windowCount: 1, doorOnLeft: true });

  parent.addChild(g);
}

// Tall houses immediately flanking the palace (front row, comparable height
// to the palace upper story so the silhouette steps up gracefully toward
// the central dome).
function drawTownFlanks(parent: Container) {
  const g = new Graphics();

  // West flank — 2-story with blue dome
  drawHouse(g, 200, 152, 22, 22, {
    story2: 12,
    domeColor: PAL.dome,
    domeHi: PAL.domeHi,
    domeR: 5,
    awning: PAL.awningBlue,
  });

  // East flank — 2-story with red roof accent (no dome, roof tile)
  drawHouse(g, 280, 152, 22, 22, {
    story2: 12,
    domeColor: PAL.dome,
    domeHi: PAL.domeHi,
    domeR: 5,
    awning: PAL.awningRed,
  });

  parent.addChild(g);
}

// Outer cottages spread along the east + west of the island, smaller
// and varied. Drawn AFTER bakery/coffee so a slight overlap reads as
// "neighbor leaning into the next house."
function drawTownOuter(parent: Container) {
  const g = new Graphics();

  // West side, near→far
  drawHouse(g, 145, 160, 18, 16, { domeColor: PAL.dome, domeHi: PAL.domeHi, domeR: 4 });
  drawHouse(g, 122, 165, 16, 13, { chimney: true });
  drawHouse(g, 100, 172, 14, 11, { domeColor: PAL.dome, domeHi: PAL.domeHi, domeR: 3, windowCount: 1 });
  drawHouse(g, 80, 178, 12, 9, { windowCount: 1, chimney: true });

  // East side, near→far
  drawHouse(g, 335, 160, 18, 16, { domeColor: PAL.dome, domeHi: PAL.domeHi, domeR: 4 });
  drawHouse(g, 358, 165, 16, 13, { chimney: true });
  drawHouse(g, 380, 172, 14, 11, { domeColor: PAL.dome, domeHi: PAL.domeHi, domeR: 3, windowCount: 1 });
  drawHouse(g, 400, 178, 12, 9, { windowCount: 1, chimney: true });

  // A couple of small back-row houses peeking from behind the flank towers
  drawHouse(g, 188, 144, 12, 10, { windowCount: 1, doorOnLeft: true });
  drawHouse(g, 292, 144, 12, 10, { windowCount: 1 });

  parent.addChild(g);
}

// ─── Trees / shrubs (sprinkle around the town) ──────────────────────────────
function drawDecorations(parent: Container) {
  const g = new Graphics();

  const cypresses: Array<[number, number]> = [
    [165, 172],
    [318, 172],
    [262, 175],
    [218, 175],
    [90, 184],
    [392, 184],
  ];
  for (const [x, y] of cypresses) {
    for (let i = 0; i < 8; i++) {
      const w = Math.max(1, 3 - Math.floor(i / 4));
      px(g, x - w, y - i, w * 2 + 1, 1, i < 4 ? PAL.grassDark : 0x6b8a4a);
    }
    px(g, x, y + 1, 1, 1, PAL.wood);
  }

  // A few small shrubs
  const shrubs: Array<[number, number]> = [
    [115, 178],
    [368, 178],
    [155, 188],
    [325, 188],
  ];
  for (const [x, y] of shrubs) {
    px(g, x - 2, y - 2, 5, 3, PAL.grassDark);
    px(g, x - 1, y - 3, 3, 1, PAL.grassDark);
    px(g, x - 1, y - 2, 3, 1, PAL.grass);
  }

  parent.addChild(g);
}

export function buildIsland(layers: Layers, _renderer: Renderer): IslandRefs {
  const anchors: IslandAnchors = {
    palaceCenter: { x: 240, y: 130 },
    balconyClothesline: { x1: 222, x2: 258, y: 130 },
    coffeeTables: [],
    bakeryChimney: { x: 0, y: 0 },
    fountainCenter: { x: 240, y: 167 },
  };

  // Back layer
  drawGround(layers.islandBack);
  drawRoads(layers.islandBack);

  // Mid layer (back-to-front by depth)
  drawTownBackrow(layers.islandMid); // chapels behind palace
  drawTownFlanks(layers.islandMid); // tall houses adjacent to palace
  drawPalace(layers.islandMid); // centerpiece
  drawTownOuter(layers.islandMid); // outer cottages, smaller
  drawBakery(layers.islandMid, anchors);
  drawCoffeeShop(layers.islandMid, anchors);
  drawDecorations(layers.islandMid);
  drawFountain(layers.islandMid, anchors);
  drawMarket(layers.islandMid);

  return {
    anchors,
    update(_dt: number) {
      // Static layout; ambient module animates dynamic elements.
    },
  };
}
