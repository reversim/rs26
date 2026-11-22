// The moderator-kit banner designs. Each draws one banner for a whole track at
// a given size, in the speaker kit's visual language (src/helpers/speakerKit/draw.ts).
// Coordinates are per size; font sizes scale by the size's k. Tracks run from
// a handful of talks to over a dozen, so the grids size themselves to fit.

import {
  C,
  F,
  FORMATS,
  avatar,
  background,
  constellation,
  label,
  logo,
  rng,
  rr,
  sharedSize,
  stack,
} from "../speakerKit/draw";
import type { KitPerson, TrackAssets, TrackInfo, TrackTemplate } from "./types";

type Ctx = CanvasRenderingContext2D;
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Circle {
  x: number;
  y: number;
  r: number;
}

const shortUrl = (url: string) => url.replace(/^https?:\/\//, "");

/** Each speaker's photo by name, for drawing them per session. */
function photosByName(I: TrackInfo, A: TrackAssets) {
  const map = new Map<string, HTMLImageElement | null>();
  I.track.speakers.forEach((s, i) => map.set(s.name, A.speakers[i] ?? null));
  return (p: KitPerson) => map.get(p.name) ?? null;
}

/**
 * Packs n equal circles into a box, row by row (each row centred), at the
 * column count that makes them biggest, capped at maxR. With jitter, each is
 * nudged a little off the grid so it reads as a constellation, not a table.
 */
function pack(
  n: number,
  box: Box,
  maxR: number,
  jitter = 0,
  rand: () => number = Math.random,
): Circle[] {
  if (!n) return [];
  const ROW = 0.9;
  let cols = 1;
  let cell = 0;
  for (let c = 1; c <= n; c++) {
    const rows = Math.ceil(n / c);
    const size = Math.min(box.w / c, box.h / (1 + (rows - 1) * ROW));
    if (size > cell) [cols, cell] = [c, size];
  }
  const rows = Math.ceil(n / cols);
  const r = Math.min(maxR, cell * (jitter ? 0.36 : 0.42));
  const pitch = Math.min(cell, (2 * r) / 0.8);
  const height = pitch * (1 + (rows - 1) * ROW);
  const top = box.y + (box.h - height) / 2 + pitch / 2;
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, n - row * cols);
    // Odd rows of a jittered pack are offset half a cell, like a honeycomb.
    const shift = jitter && row % 2 && inRow === cols ? pitch * 0.25 : 0;
    const left = box.x + (box.w - inRow * pitch) / 2 + pitch / 2 + shift;
    return {
      x: left + (i % cols) * pitch + (rand() - 0.5) * pitch * jitter,
      y: top + row * pitch * ROW + (rand() - 0.5) * pitch * jitter,
      r,
    };
  });
}

/** The moderators' photos side by side, overlapping a little. Returns the right edge. */
function hostFaces(
  ctx: Ctx,
  I: TrackInfo,
  A: TrackAssets,
  x: number,
  cy: number,
  r: number,
) {
  I.hosts.forEach((h, i) =>
    avatar(ctx, A.hosts[i], h.name, x + r + i * r * 1.5, cy, r, {
      ring: I.color,
      ringW: Math.max(2, r * 0.07),
    }),
  );
  return x + 2 * r + Math.max(0, I.hosts.length - 1) * r * 1.5;
}

/** The track's day(s) and the track page's address, along the bottom. */
function footer(
  ctx: Ctx,
  I: TrackInfo,
  W: number,
  pad: number,
  base: number,
  k: number,
  stacked: boolean,
) {
  label(ctx, `${I.talks} · ${I.dateLine}`, pad, base, {
    font: F.mono(600),
    size: 22 * k,
    color: I.color,
    spacing: 0.04,
    maxW: stacked ? W - pad * 2 : W * 0.45,
  });
  label(
    ctx,
    shortUrl(I.url),
    stacked ? pad : W - pad,
    stacked ? base + 48 * k : base,
    {
      font: F.mono(400),
      size: 17 * k,
      color: C.muted,
      align: stacked ? "left" : "right",
      maxW: stacked ? W - pad * 2 : W * 0.5,
    },
  );
}

export const TEMPLATES: TrackTemplate[] = [
  {
    id: "lineup",
    name: "Lineup",
    // Every talk in the track, as a grid of cards.
    draw(ctx, fmt, I, A) {
      const { w: W, h: H, k } = FORMATS[fmt];
      const rand = rng(I.track.slug + this.id + fmt);
      const sessions = I.track.sessions;
      const n = sessions.length;
      const L = (
        {
          landscape: {
            pad: 56,
            logo: [56, 46, 190],
            head: { top: 120, bottom: 470, maxW: 330 },
            title: [54, 30],
            grid: { x: 412, y: 36, w: 752, h: 558 },
            cols: n <= 4 ? 1 : n <= 10 ? 2 : 3,
            base: 574,
            stacked: true,
          },
          square: {
            pad: 64,
            logo: [64, 56, 230],
            head: { top: 140, bottom: 330, maxW: 952 },
            title: [76, 40],
            grid: { x: 64, y: 360, w: 952, h: 600 },
            cols: n <= 5 ? 1 : n <= 10 ? 2 : 3,
            base: 1020,
            stacked: false,
          },
          story: {
            pad: 72,
            logo: [72, 100, 300],
            head: { top: 230, bottom: 560, maxW: 936 },
            title: [110, 56],
            grid: { x: 72, y: 600, w: 936, h: 1110 },
            cols: n <= 8 ? 1 : 2,
            base: 1790,
            stacked: true,
          },
        } as const
      )[fmt];

      background(ctx, W, H, rand);
      const [lx, ly, lw] = L.logo;
      logo(ctx, A.logo, lx, ly, lw);

      // ---- the track and its hosts
      stack(
        ctx,
        [
          {
            text: "// WE'RE HOSTING",
            font: F.mono(500),
            size: 20 * k,
            color: I.color,
            spacing: 0.12,
          },
          {
            text: I.title,
            font: F.display(700),
            size: L.title[0],
            minSize: L.title[1],
            lh: 1.04,
            maxLines: 2,
            color: C.white,
            gap: 12 * k,
          },
          {
            text: `Hosted by ${I.hostNames}`,
            font: F.display(600),
            size: 24 * k,
            minSize: 17 * k,
            maxLines: 2,
            color: C.blueBright,
            gap: 14 * k,
          },
        ],
        {
          x: L.pad,
          maxW: L.head.maxW,
          top: L.head.top,
          bottom: L.head.bottom,
          valign: "center",
        },
      );

      // ---- the talks
      const photo = photosByName(I, A);
      const { grid, cols } = L;
      const rows = Math.ceil(n / cols);
      const gap = 12 * k;
      const cellW = (grid.w - gap * (cols - 1)) / cols;
      const cellH = Math.min(
        170 * k,
        (grid.h - gap * (rows - 1)) / Math.max(1, rows),
      );
      const top = grid.y + (grid.h - (rows * cellH + gap * (rows - 1))) / 2;
      sessions.forEach((s, i) => {
        const x = grid.x + (i % cols) * (cellW + gap);
        const y = top + Math.floor(i / cols) * (cellH + gap);
        rr(ctx, x, y, cellW, cellH, Math.min(16 * k, cellH * 0.2));
        ctx.fillStyle = "rgba(16,32,74,0.88)";
        ctx.fill();
        ctx.strokeStyle = C.line;
        ctx.lineWidth = 2;
        ctx.stroke();

        const pad = Math.min(16 * k, cellH * 0.16);
        const r = Math.min(cellH * 0.3, 44 * k);
        const faces = s.speakers.slice(0, 2);
        const cy = y + cellH / 2;
        faces.forEach((p, j) =>
          avatar(ctx, photo(p), p.name, x + pad + r + j * r * 1.2, cy, r, {
            ring: I.color,
            ringW: Math.max(2, r * 0.07),
          }),
        );
        const textX = x + pad + 2 * r + (faces.length - 1) * r * 1.2 + 12 * k;
        stack(
          ctx,
          [
            {
              text: s.title,
              font: F.display(700),
              size: Math.min(24 * k, cellH * 0.2),
              minSize: Math.min(13 * k, cellH * 0.16),
              lh: 1.12,
              maxLines: 3,
              color: C.white,
              grow: true,
            },
            {
              text: s.speakers.map((p) => p.name).join(" & "),
              font: F.body(600),
              size: Math.min(16 * k, cellH * 0.15),
              minSize: Math.min(11 * k, cellH * 0.12),
              maxLines: 1,
              color: I.color,
              gap: 5 * k,
            },
          ],
          {
            x: textX,
            maxW: x + cellW - pad - textX,
            top: y + pad * 0.6,
            bottom: y + cellH - pad * 0.6,
            valign: "center",
          },
        );
      });

      footer(ctx, I, W, L.pad, L.base, k, L.stacked);
    },
  },

  {
    id: "constellation",
    name: "Constellation",
    // The track's speakers as nodes in the RS26 hero graph.
    draw(ctx, fmt, I, A) {
      const { w: W, h: H, k } = FORMATS[fmt];
      const rand = rng(I.track.slug + this.id + fmt);
      const L = (
        {
          landscape: {
            pad: 64,
            logo: [64, 52, 220],
            box: { x: 620, y: 24, w: 550, h: 516 },
            text: { top: 130, bottom: 440, maxW: 520 },
            title: [76, 40],
            hosts: 492,
            base: 574,
          },
          square: {
            pad: 72,
            logo: [72, 64, 250],
            box: { x: 50, y: 140, w: 980, h: 480 },
            text: { top: 640, bottom: 870, maxW: 936 },
            title: [96, 48],
            hosts: 930,
            base: 1024,
          },
          story: {
            pad: 80,
            logo: [80, 110, 320],
            box: { x: 50, y: 260, w: 980, h: 900 },
            text: { top: 1200, bottom: 1520, maxW: 920 },
            title: [124, 60],
            hosts: 1600,
            base: 1770,
          },
        } as const
      )[fmt];

      background(ctx, W, H, rand);
      const faces = pack(I.track.speakers.length, L.box, 110 * k, 0.22, rand);
      constellation(ctx, rand, L.box, faces, fmt === "story" ? 10 : 6);
      I.track.speakers.forEach((s, i) =>
        avatar(ctx, A.speakers[i], s.name, faces[i].x, faces[i].y, faces[i].r, {
          ring: I.color,
          ringW: Math.max(2, faces[i].r * 0.06),
          glow: "rgba(240,122,35,0.35)",
        }),
      );
      const [lx, ly, lw] = L.logo;
      logo(ctx, A.logo, lx, ly, lw);

      stack(
        ctx,
        [
          {
            text: "// WE'RE HOSTING THE TRACK",
            font: F.mono(500),
            size: 22 * k,
            color: C.mint,
            spacing: 0.12,
          },
          {
            text: I.title,
            font: F.display(700),
            size: L.title[0],
            minSize: L.title[1],
            lh: 1.02,
            maxLines: 2,
            color: C.white,
            gap: 14 * k,
          },
          {
            text: `${I.track.sessions.length} talks you don't want to miss`,
            font: F.display(500),
            size: 28 * k,
            minSize: 20 * k,
            maxLines: 2,
            color: C.text,
            gap: 16 * k,
          },
        ],
        {
          x: L.pad,
          maxW: L.text.maxW,
          top: L.text.top,
          bottom: L.text.bottom,
          valign: "center",
        },
      );

      const r = 30 * k;
      const right = hostFaces(ctx, I, A, L.pad, L.hosts, r);
      label(ctx, `Hosted by ${I.hostNames}`, right + 16 * k, L.hosts + 8 * k, {
        font: F.display(600),
        size: 22 * k,
        color: C.blueBright,
        maxW: (fmt === "landscape" ? 560 : W - L.pad) - right - 16 * k,
      });
      footer(ctx, I, W, L.pad, L.base, k, fmt === "story");
    },
  },

  {
    id: "bigtype",
    name: "Big type",
    // The track's name, huge, over a strip of its speakers' faces.
    draw(ctx, fmt, I, A) {
      const { w: W, h: H, k } = FORMATS[fmt];
      const rand = rng(I.track.slug + this.id + fmt);
      const L = (
        {
          landscape: {
            pad: 64,
            logo: [64, 50, 200],
            eyebrow: 182,
            name: { base: 300, max: 150 },
            strip: { x: 64, y: 336, w: 1072, h: 130 },
            rows: 1,
            hosts: 516,
            base: 592,
          },
          square: {
            pad: 72,
            logo: [72, 64, 240],
            eyebrow: 250,
            name: { base: 390, max: 170 },
            strip: { x: 72, y: 440, w: 936, h: 360 },
            rows: 2,
            hosts: 880,
            base: 1010,
          },
          story: {
            pad: 80,
            logo: [80, 110, 320],
            eyebrow: 430,
            name: { base: 600, max: 210 },
            strip: { x: 80, y: 680, w: 920, h: 700 },
            rows: 3,
            hosts: 1500,
            base: 1700,
          },
        } as const
      )[fmt];

      background(ctx, W, H, rand, { glow: false });
      const [lx, ly, lw] = L.logo;
      logo(ctx, A.logo, lx, ly, lw);

      label(ctx, `TRACK · ${I.talks}`, L.pad, L.eyebrow, {
        font: F.mono(600),
        size: 24 * k,
        color: I.color,
        spacing: 0.14,
      });
      const nameW = W - L.pad * 2;
      const size = sharedSize(
        ctx,
        [I.title],
        F.display(700),
        nameW,
        L.name.max,
        -0.02,
      );
      label(ctx, I.title, L.pad, L.name.base, {
        font: F.display(700),
        size,
        color: C.white,
        spacing: -0.02,
        maxW: nameW,
      });
      ctx.fillStyle = I.color;
      ctx.fillRect(L.pad, L.name.base + 22 * k, 96 * k, 6 * k);

      // ---- the faces: overlapping, in up to L.rows rows
      const people = I.track.speakers;
      const n = people.length;
      const STEP = 1.55;
      let best = { rows: 1, r: 0 };
      for (let rows = 1; rows <= L.rows; rows++) {
        const perRow = Math.ceil(n / rows);
        const r = Math.min(
          90 * k,
          L.strip.w / (2 + (perRow - 1) * STEP),
          L.strip.h / (2 * rows + (rows - 1) * 0.4),
        );
        if (r > best.r) best = { rows, r };
      }
      const { rows, r } = best;
      const perRow = Math.ceil(n / rows);
      const blockH = 2 * r * rows + 0.4 * r * (rows - 1);
      const top = L.strip.y + (L.strip.h - blockH) / 2 + r;
      people.forEach((p, i) => {
        const row = Math.floor(i / perRow);
        avatar(
          ctx,
          A.speakers[i],
          p.name,
          L.pad + r + (i % perRow) * r * STEP,
          top + row * r * 2.4,
          r,
          { ring: C.navy, ringW: Math.max(3, r * 0.08) },
        );
      });

      const hr = 30 * k;
      const right = hostFaces(ctx, I, A, L.pad, L.hosts, hr);
      label(ctx, `Hosted by ${I.hostNames}`, right + 16 * k, L.hosts + 8 * k, {
        font: F.display(600),
        size: 24 * k,
        color: C.blueBright,
        maxW: W - L.pad - right - 16 * k,
      });
      footer(ctx, I, W, L.pad, L.base, k, fmt === "story");
    },
  },
];
