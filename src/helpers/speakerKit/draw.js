// Canvas drawing helpers for the speaker kit: palette, fonts, banner sizes,
// text layout, photos and the RS26 background motifs.

const SITE = "https://summit2026.reversim.com";
const SITE_SHORT = "summit2026.reversim.com";
const EVENT_DATES = "NOV 30 – DEC 1, 2026";

const C = {
  navy: "#0e1d42",
  navy2: "#0a1631",
  navy3: "#060f25",
  line: "#1e2f58",
  panel: "#0a1736",
  panel2: "#10204a",
  white: "#ffffff",
  paper: "#f4f6fb",
  blue: "#6c8cc7",
  blueBright: "#84a2da",
  blueInk: "#3b5590",
  orange: "#f07a23",
  mint: "#7ccfa8",
  pink: "#f3a0c5",
  text: "#c3cdea",
  muted: "#8fa0c8",
  mutedInk: "#5b6f9e",
  dashed: "#3a4d7a",
};

// The site self-hosts its fonts through Astro, which hashes the family names, so
// the canvas reads the real font stacks from the site's CSS variables at startup.
const families = {
  display: '"Space Grotesk"',
  body: '"Hanken Grotesk"',
  mono: '"JetBrains Mono"',
};
const GENERIC =
  /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-[a-z-]+)$/;
function resolveFonts() {
  const css = getComputedStyle(document.documentElement);
  const vars = {
    display: "--font-space-grotesk",
    body: "--font-hanken-grotesk",
    mono: "--font-jetbrains-mono",
  };
  for (const [key, name] of Object.entries(vars)) {
    const stack = css
      .getPropertyValue(name)
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f && !GENERIC.test(f));
    if (stack.length) families[key] = stack.join(", ");
  }
}

// Heebo and Noto Color Emoji follow every family so Hebrew and emoji in titles always render.
const EXTRA = 'Heebo, "Noto Color Emoji"';
const F = {
  display: (w) => (s) =>
    `${w} ${s}px ${families.display}, ${EXTRA}, sans-serif`,
  body: (w) => (s) => `${w} ${s}px ${families.body}, ${EXTRA}, sans-serif`,
  mono: (w) => (s) => `${w} ${s}px ${families.mono}, ${EXTRA}, monospace`,
};

const FORMATS = {
  landscape: {
    w: 1200,
    h: 630,
    k: 1,
  },
  square: {
    w: 1080,
    h: 1080,
    k: 1.2,
  },
  story: {
    w: 1080,
    h: 1920,
    k: 1.5,
  },
};

const RTL = /[֐-׿]/;

// Curly quotes get mirrored around right-to-left titles, so those get straight ones.
const quote = (t) => (RTL.test(t) ? `"${t}"` : `“${t}”`);

// ---------------------------------------------------------------- assets

const imageCache = new Map();
function loadImage(src) {
  if (!imageCache.has(src)) {
    imageCache.set(
      src,
      new Promise((resolve) => {
        const img = new Image();
        // Sessionize sends Access-Control-Allow-Origin: *, so the canvas stays exportable.
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
      }),
    );
  }
  return imageCache.get(src);
}

let fontsReady;
function loadFonts() {
  if (!fontsReady) {
    // A face that can't load (e.g. Astro's local("Arial") metric fallback where
    // there's no Arial) just falls back; it shouldn't surface as an error.
    const load = (font, text) =>
      document.fonts.load(font, text).catch(() => []);
    const latin = [
      [families.display, [400, 500, 600, 700]],
      [families.body, [400, 600]],
      [families.mono, [400, 500, 600, 700]],
    ].flatMap(([family, weights]) =>
      weights.map((w) => load(`${w} 20px ${family}`, "Aa09 █")),
    );
    const hebrew = [400, 600, 700].map((w) => load(`${w} 20px Heebo`, "אבג"));
    fontsReady = Promise.all([...latin, ...hebrew]);
  }
  return fontsReady;
}

// ---------------------------------------------------------------- drawing helpers

function rng(seed) {
  let a = 0;
  for (const ch of seed) a = (Math.imul(a, 31) + ch.charCodeAt(0)) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setFont(ctx, font, size, spacing = 0) {
  ctx.font = font(size);
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing * size}px`;
}

// Word-wraps to maxW; an explicit "\n" always starts a new line.
function wrap(ctx, text, maxW) {
  const lines = [];
  for (const para of text.split("\n")) {
    let cur = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = cur ? `${cur} ${word}` : word;
      if (!cur || ctx.measureText(next).width <= maxW) cur = next;
      else {
        lines.push(cur);
        cur = word;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

function ellipsize(ctx, line, maxW) {
  let s = line;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW)
    s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

// Lays out a text spec: shrinks from spec.size towards spec.minSize until it fits
// maxW x maxH within spec.maxLines; truncates with an ellipsis as a last resort.
function measure(ctx, spec, maxW, maxH = Infinity) {
  const lh = spec.lh ?? 1.2;
  const minSize = spec.minSize ?? spec.size;
  const maxLines = spec.maxLines ?? 99;
  let lines, size;
  for (size = Math.round(spec.size); ; size -= 1) {
    setFont(ctx, spec.font, size, spec.spacing);
    lines = wrap(ctx, spec.text, maxW);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const fits =
      lines.length <= maxLines &&
      lines.length * size * lh <= maxH + 0.5 &&
      widest <= maxW;
    if (fits || size <= minSize) break;
  }
  const allowed = Math.max(
    1,
    Math.min(maxLines, Math.floor((maxH + 0.5) / (size * lh))),
  );
  if (lines.length > allowed) {
    lines = lines.slice(0, allowed);
    lines[allowed - 1] = ellipsize(ctx, lines[allowed - 1], maxW);
  }
  lines = lines.map((l) =>
    ctx.measureText(l).width > maxW ? ellipsize(ctx, l, maxW) : l,
  );
  return {
    ...spec,
    lines,
    size,
    lineH: size * lh,
    height: lines.length * size * lh,
  };
}

// y is the top of the block's first line box.
function paint(ctx, block, x, y, align = "left") {
  setFont(ctx, block.font, block.size, block.spacing);
  ctx.fillStyle = block.color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.direction = RTL.test(block.text) ? "rtl" : "ltr";
  const baseline = (block.lineH - block.size) / 2 + block.size * 0.8;
  block.lines.forEach((line, i) =>
    ctx.fillText(line, x, y + baseline + i * block.lineH),
  );
  ctx.direction = "ltr";
}

// Stacks text specs vertically inside [top, bottom]. A spec with grow: true gets
// whatever height the others leave over. Falsy specs and empty texts are skipped.
// With dry: true nothing is painted; use it to measure the stack's height first.
function stack(
  ctx,
  specs,
  { x, top, bottom, maxW, align = "left", valign = "top", dry = false },
) {
  specs = specs.filter((s) => s && s.text);
  const gapOf = (s, i) => (i ? (s.gap ?? 0) : 0);
  const fixed = new Map(
    specs.filter((s) => !s.grow).map((s) => [s, measure(ctx, s, maxW)]),
  );
  const used =
    [...fixed.values()].reduce((a, b) => a + b.height, 0) +
    specs.reduce((a, s, i) => a + gapOf(s, i), 0);
  const blocks = specs.map((s) =>
    s.grow ? measure(ctx, s, maxW, bottom - top - used) : fixed.get(s),
  );
  const total = blocks.reduce(
    (a, b, i) => a + b.height + gapOf(specs[i], i),
    0,
  );
  let y =
    valign === "center"
      ? top + (bottom - top - total) / 2
      : valign === "bottom"
        ? bottom - total
        : top;
  y = Math.max(top, y);
  const start = y;
  const ax =
    align === "center" ? x + maxW / 2 : align === "right" ? x + maxW : x;
  blocks.forEach((b, i) => {
    y += gapOf(specs[i], i);
    if (!dry) paint(ctx, b, ax, y, align);
    y += b.height;
  });
  return { top: start, bottom: y };
}

// Single line of text at a baseline, shrunk to fit maxW if given.
function label(
  ctx,
  text,
  x,
  baseline,
  { font, size, color, align = "left", spacing = 0, maxW = Infinity },
) {
  let s = size;
  setFont(ctx, font, s, spacing);
  while (s > size * 0.6 && ctx.measureText(text).width > maxW)
    setFont(ctx, font, --s, spacing);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.direction = RTL.test(text) ? "rtl" : "ltr";
  ctx.fillText(text, x, baseline);
  ctx.direction = "ltr";
  return ctx.measureText(text).width;
}

// Largest size (<= maxSize) at which every text fits on one line within maxW.
function sharedSize(ctx, texts, font, maxW, maxSize, spacing = 0) {
  setFont(ctx, font, 100, spacing);
  const widest = Math.max(...texts.map((t) => ctx.measureText(t).width));
  // 2% slack: text width doesn't scale perfectly linearly with font size, and a
  // line that overshoots by a pixel would wrap and get cut with an ellipsis.
  return Math.min(maxSize, Math.floor((98 * maxW) / widest));
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

// focusY 0.15: headshots keep the face in the upper part of the frame.
function drawCover(ctx, img, x, y, w, h, focusY = 0.15) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(
    img,
    (img.width - sw) / 2,
    (img.height - sh) * focusY,
    sw,
    sh,
    x,
    y,
    w,
    h,
  );
}

function initials(name) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// A photo box (rect) with initials as the fallback when the photo didn't load.
function photoRect(ctx, img, name, x, y, w, h) {
  if (img) drawCover(ctx, img, x, y, w, h);
  else {
    ctx.fillStyle = C.panel2;
    ctx.fillRect(x, y, w, h);
    label(ctx, initials(name), x + w / 2, y + h / 2 + Math.min(w, h) * 0.12, {
      font: F.display(700),
      size: Math.min(w, h) * 0.32,
      color: C.blueBright,
      align: "center",
    });
  }
}

function avatar(
  ctx,
  img,
  name,
  cx,
  cy,
  r,
  { ring = C.orange, ringW = r * 0.05, glow = null } = {},
) {
  if (glow) {
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = r * 0.7;
    circle(ctx, cx, cy, r + ringW);
    ctx.fillStyle = glow;
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  circle(ctx, cx, cy, r);
  ctx.clip();
  photoRect(ctx, img, name, cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
  if (ring) {
    circle(ctx, cx, cy, r + ringW / 2);
    ctx.lineWidth = ringW;
    ctx.strokeStyle = ring;
    ctx.stroke();
  }
}

function background(ctx, W, H, rand, { glow = true } = {}) {
  ctx.fillStyle = C.navy;
  ctx.fillRect(0, 0, W, H);
  if (glow) {
    const g = ctx.createRadialGradient(
      W * 0.8,
      H * 0.15,
      0,
      W * 0.8,
      H * 0.15,
      Math.max(W, H) * 0.9,
    );
    g.addColorStop(0, "#182c63");
    g.addColorStop(0.55, C.navy);
    g.addColorStop(1, C.navy2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // Faint dot grid, as on the site's hero.
  ctx.fillStyle = "rgba(132,162,218,0.07)";
  for (let y = 20; y < H; y += 32)
    for (let x = 20; x < W; x += 32) ctx.fillRect(x, y, 2, 2);
  // Stars.
  const n = Math.round((W * H) / 9000);
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = `rgba(200,214,245,${0.15 + rand() * 0.5})`;
    circle(ctx, rand() * W, rand() * H, 0.8 + rand() * 1.6);
    ctx.fill();
  }
}

// The hero's node graph: small colored nodes joined to their nearest neighbours.
// Anchors (where photos go) take part in the edges but are drawn by the caller.
function constellation(ctx, rand, box, anchors = [], count = 9) {
  const colors = [
    C.blue,
    C.mint,
    C.orange,
    C.pink,
    C.blueBright,
    C.mint,
    C.blue,
  ];
  const nodes = anchors.map((a) => ({ ...a, anchor: true }));
  for (
    let tries = 0;
    nodes.length < anchors.length + count && tries < 400;
    tries++
  ) {
    const p = { x: box.x + rand() * box.w, y: box.y + rand() * box.h };
    const clear = nodes.every(
      (o) => Math.hypot(o.x - p.x, o.y - p.y) > (o.anchor ? o.r + 40 : 70),
    );
    if (clear)
      nodes.push({
        ...p,
        r: 4 + rand() * 5,
        color: colors[Math.floor(rand() * colors.length)],
      });
  }
  const edges = new Set();
  nodes.forEach((n, i) => {
    const near = nodes
      .map((o, j) => [j, Math.hypot(o.x - n.x, o.y - n.y)])
      .filter(([j]) => j !== i)
      .sort((a, b) => a[1] - b[1]);
    const take = rand() < 0.5 ? 2 : 1;
    near
      .slice(0, take)
      .forEach(([j]) => edges.add(i < j ? `${i}-${j}` : `${j}-${i}`));
  });
  const list = [...edges].map((e) => e.split("-").map(Number));
  const hot = Math.floor(rand() * list.length);
  list.forEach(([a, b], i) => {
    ctx.beginPath();
    ctx.moveTo(nodes[a].x, nodes[a].y);
    ctx.lineTo(nodes[b].x, nodes[b].y);
    ctx.strokeStyle =
      i === hot ? "rgba(240,122,35,0.75)" : "rgba(132,162,218,0.3)";
    ctx.lineWidth = i === hot ? 2.5 : 1.5;
    ctx.stroke();
  });
  nodes
    .filter((n) => !n.anchor)
    .forEach((n) => {
      ctx.save();
      ctx.shadowColor = n.color;
      ctx.shadowBlur = 18;
      circle(ctx, n.x, n.y, n.r);
      ctx.fillStyle = n.color;
      ctx.fill();
      ctx.restore();
      circle(ctx, n.x, n.y, n.r);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
}

function logo(ctx, img, x, y, w) {
  if (img) ctx.drawImage(img, x, y, w, (w * img.height) / img.width);
}

// Rounded "pill" chips in a row; wraps when maxW is exceeded. Returns the bottom y.
function pills(
  ctx,
  items,
  x,
  y,
  { size, h, padX, gap, color, stroke, fill = null, maxW },
) {
  let cx = x;
  let cy = y;
  for (const text of items) {
    setFont(ctx, F.mono(500), size, 0.06);
    const w = ctx.measureText(text).width + padX * 2;
    if (cx > x && cx + w > x + maxW) {
      cx = x;
      cy += h + gap;
    }
    rr(ctx, cx, cy, w, h, h / 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, text, cx + padX, cy + h / 2 + size * 0.36, {
      font: F.mono(500),
      size,
      color,
      spacing: 0.06,
    });
    cx += w + gap;
  }
  return cy + h;
}

export {
  C,
  EVENT_DATES,
  F,
  FORMATS,
  RTL,
  SITE,
  SITE_SHORT,
  avatar,
  background,
  circle,
  constellation,
  drawCover,
  label,
  loadFonts,
  loadImage,
  logo,
  measure,
  paint,
  photoRect,
  pills,
  quote,
  resolveFonts,
  rng,
  rr,
  sharedSize,
  stack,
};
