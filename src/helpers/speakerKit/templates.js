// The banner designs. Each draws one banner for a session at a given size;
// coordinates are per size and font sizes scale by the size's k.

import {
  C,
  EVENT_DATES,
  F,
  FORMATS,
  SITE_SHORT,
  avatar,
  background,
  circle,
  constellation,
  label,
  logo,
  measure,
  paint,
  photoRect,
  pills,
  quote,
  rng,
  rr,
  sharedSize,
  stack,
} from "./draw.js";

// Each template draws one banner for a session at the given format.
// Coordinates are per format; font sizes scale by the format's k.

// A slightly rotated rubber-stamp mark ("SPEAKER") for the Ticket design.
function stamp(ctx, { cx, cy, w, h }, I, rand) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.12);
  ctx.strokeStyle = C.orange;
  ctx.lineWidth = h * 0.05;
  rr(ctx, -w / 2, -h / 2, w, h, h * 0.16);
  ctx.stroke();
  ctx.lineWidth = h * 0.02;
  rr(
    ctx,
    -w / 2 + h * 0.09,
    -h / 2 + h * 0.09,
    w - h * 0.18,
    h - h * 0.18,
    h * 0.1,
  );
  ctx.stroke();
  label(ctx, "★ RS26 ★", 0, -h * 0.12, {
    font: F.mono(700),
    size: h * 0.15,
    color: C.orange,
    align: "center",
    spacing: 0.3,
  });
  label(ctx, I.plural ? "SPEAKERS" : "SPEAKER", 0, h * 0.27, {
    font: F.display(700),
    size: h * 0.36,
    color: C.orange,
    align: "center",
    spacing: 0.08,
    maxW: w - h * 0.4,
  });
  // Worn-ink speckle: paper-colored flecks knocked out of the mark.
  ctx.fillStyle = C.paper;
  for (let i = 0; i < 70; i++) {
    circle(
      ctx,
      (rand() - 0.5) * w,
      (rand() - 0.5) * h,
      h * (0.008 + rand() * 0.022),
    );
    ctx.fill();
  }
  ctx.restore();
}

export const TEMPLATES = [
  {
    id: "constellation",
    name: "Constellation",
    desc: "Your photo as a node in the RS26 hero graph.",
    draw(ctx, fmt, I, A) {
      const { w: W, h: H, k } = FORMATS[fmt];
      const rand = rng(I.session.slug + this.id + fmt);
      const L = {
        landscape: {
          pad: 64,
          logo: [64, 52, 230],
          photos: I.plural
            ? [
                [870, 190, 135],
                [1040, 410, 135],
              ]
            : [[930, 290, 190]],
          box: { x: 690, y: 30, w: 480, h: 480 },
          text: { top: 140, bottom: 528, maxW: 590 },
          title: [56, 30],
          base: 574,
        },
        square: {
          pad: 72,
          logo: [72, 64, 260],
          photos: I.plural
            ? [
                [370, 335, 165],
                [710, 375, 165],
              ]
            : [[540, 345, 215]],
          box: { x: 40, y: 130, w: 1000, h: 420 },
          text: { top: 590, bottom: 950, maxW: 936 },
          title: [68, 34],
          base: 1010,
        },
        story: {
          pad: 80,
          logo: [80, 110, 320],
          photos: I.plural
            ? [
                [330, 590, 240],
                [750, 880, 240],
              ]
            : [[540, 690, 330]],
          box: { x: 40, y: 250, w: 1000, h: 860 },
          text: { top: 1150, bottom: 1700, maxW: 920 },
          title: [92, 46],
          base: 1800,
        },
      }[fmt];

      background(ctx, W, H, rand);
      const anchors = L.photos.map(([x, y, r]) => ({ x, y, r }));
      constellation(ctx, rand, L.box, anchors, fmt === "story" ? 12 : 9);
      L.photos.forEach(([x, y, r], i) =>
        avatar(ctx, A.photos[i], I.speakers[i].name, x, y, r, {
          glow: "rgba(240,122,35,0.45)",
        }),
      );
      logo(ctx, A.logo, ...L.logo);

      stack(
        ctx,
        [
          {
            text: `// ${I.speaking}`,
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
            lh: 1.08,
            spacing: -0.01,
            color: C.white,
            grow: true,
            gap: 18 * k,
          },
          {
            text: I.names,
            font: F.display(600),
            size: 30 * k,
            minSize: 22 * k,
            maxLines: 2,
            color: C.blueBright,
            gap: 22 * k,
          },
          {
            text: I.tagLine,
            font: F.body(400),
            size: 21 * k,
            minSize: 18 * k,
            maxLines: 2,
            color: C.muted,
            gap: 6 * k,
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
      const tall = fmt === "story";
      label(ctx, I.dateLine, L.pad, L.base, {
        font: F.mono(600),
        size: 24 * k,
        color: C.orange,
        spacing: 0.04,
        maxW: tall ? W - L.pad * 2 : W * 0.55,
      });
      label(
        ctx,
        SITE_SHORT,
        tall ? L.pad : W - L.pad,
        tall ? L.base + 56 : L.base,
        {
          font: F.mono(400),
          size: 17 * k,
          color: C.muted,
          align: tall ? "left" : "right",
        },
      );
    },
  },

  {
    id: "spotlight",
    name: "Spotlight",
    desc: "A big photo, with the details in pills.",
    draw(ctx, fmt, I, A) {
      const { w: W, h: H, k } = FORMATS[fmt];
      const rand = rng(I.session.slug + this.id + fmt);
      const wide = fmt === "landscape";
      background(ctx, W, H, rand, { glow: !wide });
      const n = I.speakers.length;
      // Two speakers split the photo area side by side.
      const photos = (px, py, pw, ph) => {
        I.speakers.forEach((s, i) =>
          photoRect(
            ctx,
            A.photos[i],
            s.name,
            px + (pw / n) * i,
            py,
            pw / n,
            ph,
          ),
        );
        if (n > 1) {
          ctx.fillStyle = C.navy;
          ctx.fillRect(px + pw / 2 - 2, py, 4, ph);
        }
      };

      const L = {
        landscape: {
          pad: 64,
          logo: [64, 52, 220],
          text: { top: 130, bottom: 478, maxW: 590 },
          title: [54, 30],
          pills: 518,
        },
        square: {
          pad: 72,
          logo: [72, 72, 250],
          photo: [600, 72, 408, 408],
          text: { top: 520, bottom: 905, maxW: 936 },
          title: [66, 34],
          pills: 950,
        },
        story: {
          pad: 80,
          logo: [80, 96, 300],
          photo: [160, 230, 760, 760],
          text: { top: 1070, bottom: 1630, maxW: 920 },
          title: [92, 46],
          pills: 1680,
        },
      }[fmt];

      if (wide) {
        // Full-bleed photo on the right, fading into the navy text side.
        photos(700, 0, 500, H);
        const fw = n > 1 ? 70 : 200;
        const fade = ctx.createLinearGradient(700, 0, 700 + fw, 0);
        fade.addColorStop(0, C.navy);
        fade.addColorStop(1, "rgba(14,29,66,0)");
        ctx.fillStyle = fade;
        ctx.fillRect(700, 0, fw, H);
      } else {
        // Sessionize photos are only 400px, so tall formats frame them instead of going full-bleed.
        const [px, py, pw, ph] = L.photo;
        const off = 18 * k;
        rr(ctx, px + off, py + off, pw, ph, 28 * k);
        ctx.fillStyle = C.orange;
        ctx.fill();
        ctx.save();
        rr(ctx, px, py, pw, ph, 28 * k);
        ctx.clip();
        photos(px, py, pw, ph);
        ctx.restore();
      }
      logo(ctx, A.logo, ...L.logo);

      const eyebrow = {
        text: I.speaking + " AT RS26",
        font: F.mono(600),
        size: 20 * k,
        color: C.orange,
        spacing: 0.14,
      };
      const title = {
        text: I.title,
        font: F.display(700),
        size: L.title[0],
        minSize: L.title[1],
        lh: 1.08,
        spacing: -0.01,
        color: C.white,
        grow: true,
        gap: 16 * k,
      };
      const names = {
        text: I.names,
        font: F.display(600),
        size: 28 * k,
        minSize: 20 * k,
        maxLines: 2,
        color: C.blueBright,
        gap: 20 * k,
      };
      const tag = {
        text: I.tagLine,
        font: F.body(400),
        size: 20 * k,
        minSize: 17 * k,
        maxLines: 2,
        color: C.muted,
        gap: 4 * k,
      };
      if (fmt === "square") {
        // Who's speaking sits beside the photo; the title gets the full width below.
        stack(
          ctx,
          [
            eyebrow,
            { ...names, size: 38, minSize: 26, gap: 14 },
            { ...tag, maxLines: 3 },
          ],
          {
            x: L.pad,
            maxW: 480,
            top: 170,
            bottom: 470,
            valign: "bottom",
          },
        );
        stack(ctx, [title], {
          x: L.pad,
          maxW: L.text.maxW,
          top: L.text.top,
          bottom: L.text.bottom,
          valign: "center",
        });
      } else {
        stack(ctx, [eyebrow, title, names, tag], {
          x: L.pad,
          maxW: L.text.maxW,
          top: L.text.top,
          bottom: L.text.bottom,
          valign: wide ? "center" : "top",
        });
      }
      const end = pills(
        ctx,
        [I.dayShort.toUpperCase(), I.room.toUpperCase()],
        L.pad,
        L.pills,
        {
          size: 19 * k,
          h: 46 * k,
          padX: 18 * k,
          gap: 10 * k,
          color: C.white,
          stroke: C.dashed,
          fill: "rgba(10,23,54,0.8)",
          maxW: L.text.maxW,
        },
      );
      if (fmt === "story")
        label(ctx, SITE_SHORT, L.pad, end + 90, {
          font: F.mono(400),
          size: 26,
          color: C.muted,
        });
      ctx.fillStyle = C.orange;
      ctx.fillRect(0, H - 8 * k, W, 8 * k);
    },
  },

  {
    id: "terminal",
    name: "Terminal",
    desc: "Your talk as shell output, in JetBrains Mono.",
    draw(ctx, fmt, I, A) {
      const { w: W, h: H, k } = FORMATS[fmt];
      const rand = rng(I.session.slug + this.id + fmt);
      background(ctx, W, H, rand);
      const glow = ctx.createRadialGradient(
        W * 0.1,
        H * 0.95,
        0,
        W * 0.1,
        H * 0.95,
        W * 0.6,
      );
      glow.addColorStop(0, "rgba(240,122,35,0.22)");
      glow.addColorStop(1, "rgba(240,122,35,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // area is the vertical band the window may use; tall formats shrink the window to fit
      // its content and center it there, landscape always fills it.
      const L = {
        landscape: {
          x: 56,
          w: 1088,
          area: [100, 574],
          logo: [56, 34, 190],
          dates: [1144, 66, "right"],
          url: [56, 610, "left"],
        },
        square: {
          x: 60,
          w: 960,
          area: [170, 960],
          logo: [60, 64, 250],
          dates: [1020, 108, "right"],
          url: [60, 1030, "left"],
        },
        story: {
          x: 60,
          w: 960,
          area: [800, 1640],
          logo: [330, 150, 420],
          dates: [540, 330, "center"],
          url: [540, 1720, "center"],
        },
      }[fmt];
      logo(ctx, A.logo, ...L.logo);
      label(ctx, EVENT_DATES, L.dates[0], L.dates[1], {
        font: F.mono(500),
        size: 18 * k,
        color: C.muted,
        align: L.dates[2],
        spacing: 0.08,
      });
      label(ctx, SITE_SHORT, L.url[0], L.url[1], {
        font: F.mono(400),
        size: 18 * k,
        color: C.muted,
        align: L.url[2],
      });

      const { x, w } = L;
      const bar = 48 * k;
      const pad = 36 * k;
      // Story is too narrow to put a big photo beside the text, so there the
      // photo sits above the window instead of inside it.
      const above = fmt === "story";
      const r = {
        landscape: I.plural ? 92 : 125,
        square: I.plural ? 100 : 135,
        story: I.plural ? 150 : 190,
      }[fmt];
      const avatarSpace = above ? 0 : I.plural ? r * 3.6 : r * 2.6;
      const cursorH = 18 * k + 24 * k;
      const prompt = (text, gap) => ({
        text,
        font: F.mono(500),
        size: 20 * k,
        color: C.mint,
        gap,
      });
      const specs = [
        prompt("$ whoami"),
        {
          text: I.names,
          font: F.mono(700),
          size: 26 * k,
          minSize: 20 * k,
          maxLines: 2,
          color: C.white,
          gap: 8 * k,
        },
        {
          text: I.tagLine,
          font: F.mono(400),
          size: 17 * k,
          minSize: 15 * k,
          maxLines: 1,
          color: C.muted,
          gap: 4 * k,
        },
        prompt("$ cat talk.txt", 20 * k),
        {
          text: I.title,
          font: F.display(700),
          size: { landscape: 42, square: 58, story: 80 }[fmt],
          minSize: 22 * k,
          lh: 1.12,
          color: C.white,
          grow: true,
          gap: 10 * k,
        },
        prompt("$ rs26 when", 20 * k),
        {
          text: I.dateLine,
          font: F.mono(600),
          size: 22 * k,
          minSize: 16 * k,
          maxLines: 1,
          color: C.orange,
          gap: 8 * k,
        },
      ];
      const contentW = w - pad * 2 - avatarSpace;
      const maxContentH =
        L.area[1] - L.area[0] - bar - pad / 1.2 - pad - cursorH;
      const contentH = Math.max(
        stack(ctx, specs, {
          x: 0,
          maxW: contentW,
          top: 0,
          bottom: maxContentH,
          dry: true,
        }).bottom,
        above ? 0 : r * (I.plural ? 2.6 : 2),
      );
      const h =
        fmt === "landscape"
          ? L.area[1] - L.area[0]
          : bar + pad / 1.2 + contentH + cursorH + pad;
      const y = L.area[0] + (L.area[1] - L.area[0] - h) / 2;

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 16;
      rr(ctx, x, y, w, h, 22);
      ctx.fillStyle = C.panel2;
      ctx.fill();
      ctx.restore();
      ctx.save();
      rr(ctx, x, y, w, h, 22);
      ctx.clip();
      ctx.fillStyle = C.panel;
      ctx.fillRect(x, y, w, bar);
      ctx.fillStyle = C.line;
      ctx.fillRect(x, y + bar - 1, w, 2);
      ctx.restore();
      rr(ctx, x, y, w, h, 22);
      ctx.strokeStyle = C.line;
      ctx.lineWidth = 2;
      ctx.stroke();
      [C.orange, C.mint, C.blue].forEach((c, i) => {
        circle(ctx, x + 28 * k + i * 24 * k, y + bar / 2, 7 * k);
        ctx.fillStyle = c;
        ctx.fill();
      });
      label(ctx, "speaker@rs26: ~", x + w / 2, y + bar / 2 + 6 * k, {
        font: F.mono(500),
        size: 16 * k,
        color: C.muted,
        align: "center",
      });

      const top = y + bar + pad / 1.2;
      const spots = above
        ? I.plural
          ? [
              [W / 2 - r * 0.7, 540],
              [W / 2 + r * 0.7, 540 + r * 0.4],
            ]
          : [[W / 2, 570]]
        : I.speakers.map((_, i) => [
            x + w - pad - r - i * r * 1.5,
            top + r + i * r * 0.5,
          ]);
      I.speakers.forEach((s, i) =>
        avatar(ctx, A.photos[i], s.name, ...spots[i], r, {
          ring: i ? C.mint : C.orange,
          glow: above ? "rgba(240,122,35,0.35)" : null,
        }),
      );
      const blocks = stack(ctx, specs, {
        x: x + pad,
        maxW: contentW,
        top,
        bottom: top + maxContentH,
      });
      // Blinking-cursor prompt under the output.
      const cy = blocks.bottom + 18 * k;
      label(ctx, "$", x + pad, cy + 20 * k, {
        font: F.mono(500),
        size: 20 * k,
        color: C.mint,
      });
      ctx.fillStyle = C.orange;
      ctx.fillRect(x + pad + 22 * k, cy + 2 * k, 12 * k, 22 * k);
    },
  },

  {
    id: "ticket",
    name: "Ticket",
    desc: "Your talk as a ticket-style card.",
    // Nothing on it should read as a real admission ticket: no barcode, no
    // "admit one", no "pass". A rubber stamp marks it as a speaker card instead.
    draw(ctx, fmt, I, A) {
      const { w: W, h: H, k } = FORMATS[fmt];
      const rand = rng(I.session.slug + this.id + fmt);
      background(ctx, W, H, rand, { glow: false });
      const wide = fmt === "landscape";
      const L = {
        landscape: { card: [50, 55, 1100, 520], stub: 360, notch: 22 },
        square: { card: [60, 60, 960, 960], stub: 470, notch: 26 },
        story: { card: [70, 170, 940, 1580], stub: 760, notch: 32 },
      }[fmt];
      const [x, y, w, h] = L.card;
      // Card with an orange stub; the stub is the left (wide) or top (tall) part.
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 50;
      ctx.shadowOffsetY = 20;
      rr(ctx, x, y, w, h, 26);
      ctx.fillStyle = C.paper;
      ctx.fill();
      ctx.restore();
      ctx.save();
      rr(ctx, x, y, w, h, 26);
      ctx.clip();
      ctx.fillStyle = C.orange;
      if (wide) ctx.fillRect(x, y, L.stub, h);
      else ctx.fillRect(x, y, w, L.stub);
      ctx.restore();
      // Perforation: notches punched out of the edges plus a dashed line between them.
      const notches = wide
        ? [
            [x + L.stub, y],
            [x + L.stub, y + h],
          ]
        : [
            [x, y + L.stub],
            [x + w, y + L.stub],
          ];
      notches.forEach(([nx, ny]) => {
        circle(ctx, nx, ny, L.notch);
        ctx.fillStyle = C.navy;
        ctx.fill();
      });
      ctx.save();
      ctx.setLineDash([10 * k, 10 * k]);
      ctx.strokeStyle = "rgba(14,29,66,0.35)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (wide) {
        ctx.moveTo(x + L.stub, y + L.notch + 10);
        ctx.lineTo(x + L.stub, y + h - L.notch - 10);
      } else {
        ctx.moveTo(x + L.notch + 10, y + L.stub);
        ctx.lineTo(x + w - L.notch - 10, y + L.stub);
      }
      ctx.stroke();
      ctx.restore();

      // Stub: logo, photo(s), I'M SPEAKING.
      const stub = wide ? { x, y, w: L.stub, h } : { x, y, w, h: L.stub };
      const logoW = { landscape: 220, square: 240, story: 340 }[fmt];
      if (wide)
        logo(ctx, A.logo, stub.x + (stub.w - logoW) / 2, stub.y + 36, logoW);
      else logo(ctx, A.logo, stub.x + 44 * k, stub.y + 44 * k, logoW);
      const admit = I.speaking;
      if (wide)
        label(ctx, admit, stub.x + stub.w / 2, stub.y + stub.h - 34, {
          font: F.mono(700),
          size: 20,
          color: C.navy,
          align: "center",
          spacing: 0.24,
        });
      else if (fmt === "square")
        label(ctx, admit, stub.x + stub.w - 44 * k, stub.y + 44 * k + 36, {
          font: F.mono(700),
          size: 20 * k,
          color: C.navy,
          align: "right",
          spacing: 0.24,
        });
      else
        label(ctx, admit, stub.x + stub.w / 2, stub.y + stub.h - 50, {
          font: F.mono(700),
          size: 30,
          color: C.navy,
          align: "center",
          spacing: 0.24,
        });
      const ph = {
        landscape: I.plural
          ? [
              [180, 290, 98],
              [290, 385, 98],
            ]
          : [[230, 315, 130]],
        square: I.plural
          ? [
              [450, 295, 130],
              [640, 340, 130],
            ]
          : [[540, 300, 165]],
        story: I.plural
          ? [
              [400, 540, 180],
              [680, 660, 180],
            ]
          : [[540, 575, 245]],
      }[fmt];
      ph.forEach(([cx, cy, r], i) =>
        avatar(ctx, A.photos[i], I.speakers[i].name, cx, cy, r, {
          ring: C.paper,
          ringW: 8 * k,
        }),
      );

      // Body.
      const pad = 48 * k;
      const body = wide
        ? {
            x: x + L.stub + pad,
            top: y + 44,
            maxW: w - L.stub - pad * 2,
            fields: y + h - 120,
          }
        : {
            x: x + pad,
            top: y + L.stub + 44 * k,
            maxW: w - pad * 2,
            fields: fmt === "square" ? y + h - 150 : y + h - 300,
          };
      stack(
        ctx,
        [
          {
            text: "REVERSIM SUMMIT 2026",
            font: F.mono(600),
            size: 18 * k,
            minSize: 14 * k,
            maxLines: 1,
            color: C.orange,
            spacing: 0.12,
          },
          {
            text: I.title,
            font: F.display(700),
            size: { landscape: 48, square: 60, story: 82 }[fmt],
            minSize: 26 * k,
            lh: 1.08,
            spacing: -0.01,
            color: C.navy,
            grow: true,
            gap: 14 * k,
          },
          {
            text: I.names,
            font: F.display(600),
            size: 28 * k,
            minSize: 20 * k,
            maxLines: 2,
            color: C.blueInk,
            gap: 18 * k,
          },
          {
            text: fmt === "landscape" ? "" : I.tagLine,
            font: F.body(400),
            size: 20 * k,
            minSize: 16 * k,
            maxLines: 2,
            color: C.mutedInk,
            gap: 4 * k,
          },
        ],
        {
          x: body.x,
          maxW: body.maxW,
          top: body.top,
          bottom: body.fields - 30 * k,
        },
      );
      // Fields row: DAY / ROOM.
      let fx = body.x;
      const fields = [
        ["DAY", I.dayShort],
        ["ROOM", I.room],
      ];
      fields.forEach(([name, value]) => {
        const lw = label(ctx, name, fx, body.fields + 18 * k, {
          font: F.mono(500),
          size: 15 * k,
          color: C.mutedInk,
          spacing: 0.16,
        });
        const vw = label(ctx, value, fx, body.fields + 56 * k, {
          font: F.display(600),
          size: 28 * k,
          color: C.navy,
        });
        fx += Math.max(lw, vw) + 40 * k;
      });
      // Stamp: right of the fields when wide/square, centered below them on story.
      const st =
        fmt === "story"
          ? {
              cx: body.x + body.maxW / 2,
              cy: body.fields + 190,
              w: 360,
              h: 120,
            }
          : {
              cx: x + w - pad - 105 * k,
              cy: body.fields + 30 * k,
              w: 210 * k,
              h: 92 * k,
            };
      if (fx < st.cx - st.w / 2 || fmt === "story") stamp(ctx, st, I, rand);
      if (fmt === "story")
        label(ctx, SITE_SHORT, W / 2, 1850, {
          font: F.mono(400),
          size: 28,
          color: C.muted,
          align: "center",
        });
    },
  },

  {
    id: "bigtype",
    name: "Big type",
    desc: "The hero's stacked headline, in white, blue and orange.",
    draw(ctx, fmt, I, A) {
      const { w: W, h: H, k } = FORMATS[fmt];
      const rand = rng(I.session.slug + this.id + fmt);
      const L = {
        landscape: {
          pad: 64,
          photos: I.plural
            ? [
                [935, 205, 115],
                [1065, 400, 115],
              ]
            : [[1000, 290, 160]],
          box: { x: 800, y: 30, w: 370, h: 500 },
          text: { top: 56, bottom: 520, maxW: 720 },
          hero: 92,
          base: 574,
          logo: [W - 64 - 200, 574 - 40, 200],
        },
        square: {
          pad: 72,
          photos: I.plural
            ? [
                [790, 175, 115],
                [945, 255, 115],
              ]
            : [[880, 200, 150]],
          box: { x: 480, y: 30, w: 570, h: 330 },
          text: { top: 390, bottom: 940, maxW: 936 },
          hero: 120,
          base: 1008,
          logo: [72, 64, 240],
        },
        story: {
          pad: 80,
          photos: I.plural
            ? [
                [380, 500, 215],
                [700, 690, 215],
              ]
            : [[540, 560, 290]],
          box: { x: 40, y: 200, w: 1000, h: 740 },
          text: { top: 940, bottom: 1700, maxW: 920 },
          hero: 150,
          base: 1790,
          logo: [80, 100, 300],
        },
      }[fmt];
      background(ctx, W, H, rand);
      constellation(
        ctx,
        rand,
        L.box,
        L.photos.map(([x, y, r]) => ({ x, y, r })),
        fmt === "story" ? 10 : 6,
      );
      L.photos.forEach(([x, y, r], i) =>
        avatar(ctx, A.photos[i], I.speakers[i].name, x, y, r, {
          ring: i ? C.mint : C.orange,
        }),
      );
      logo(ctx, A.logo, ...L.logo);

      const hero = [I.speaking, "AT REVERSIM", "SUMMIT 2026"];
      const size = sharedSize(
        ctx,
        hero,
        F.display(700),
        L.text.maxW,
        L.hero,
        -0.02,
      );
      const heroLine = (text, color, gap) => ({
        text,
        font: F.display(700),
        size,
        maxLines: 1,
        lh: 0.98,
        spacing: -0.02,
        color,
        gap,
      });
      stack(
        ctx,
        [
          heroLine(hero[0], C.white),
          heroLine(hero[1], C.blue),
          heroLine(hero[2], C.orange),
          {
            text: quote(I.title),
            font: F.body(600),
            size: 30 * k,
            minSize: 20 * k,
            lh: 1.2,
            maxLines: fmt === "landscape" ? 3 : 4,
            color: C.white,
            grow: true,
            gap: 30 * k,
          },
          {
            text: `— ${I.names}`,
            font: F.mono(500),
            size: 21 * k,
            minSize: 16 * k,
            maxLines: 2,
            color: C.mint,
            gap: 14 * k,
          },
        ],
        {
          x: L.pad,
          maxW: L.text.maxW,
          top: L.text.top,
          bottom: L.text.bottom,
          valign: fmt === "landscape" ? "top" : "center",
        },
      );
      label(ctx, I.dateLine, L.pad, L.base, {
        font: F.mono(600),
        size: 24 * k,
        color: C.orange,
        spacing: 0.04,
        maxW: fmt === "landscape" ? 680 : W - L.pad * 2,
      });
      if (fmt !== "landscape")
        label(
          ctx,
          SITE_SHORT,
          fmt === "story" ? L.pad : W - L.pad,
          fmt === "story" ? L.base + 56 : L.base,
          {
            font: F.mono(400),
            size: 17 * k,
            color: C.muted,
            align: fmt === "story" ? "left" : "right",
          },
        );
    },
  },

  {
    id: "minimal",
    name: "Minimal",
    desc: "A big photo, your name and the logo.",
    // Deliberately no title, tagline or URL: the post text carries those.
    // The photo dominates: full-height in landscape, a large frame in tall formats
    // (Sessionize photos are 400px, so full-width would look soft there).
    draw(ctx, fmt, I, A) {
      const { w: W, h: H, k } = FORMATS[fmt];
      const L = {
        landscape: {
          photo: [0, 0, 630, 630],
          radius: 0,
          block: { x: 700, maxW: 440, top: 0, bottom: H, align: "left" },
          name: 50,
          logoW: 320,
        },
        square: {
          photo: [210, 70, 660, 660],
          radius: 32,
          block: {
            x: 72,
            maxW: 936,
            top: 750,
            bottom: 1050,
            align: "center",
          },
          name: 58,
          logoW: 300,
        },
        story: {
          photo: [160, 250, 760, 760],
          radius: 40,
          block: {
            x: 80,
            maxW: 920,
            top: 1070,
            bottom: 1760,
            align: "center",
          },
          name: 92,
          logoW: 480,
        },
      }[fmt];

      // Plain navy with one soft glow behind the photo; no stars or graph.
      const [px, py, pw, ph] = L.photo;
      ctx.fillStyle = C.navy;
      ctx.fillRect(0, 0, W, H);
      const glow = ctx.createRadialGradient(
        px + pw / 2,
        py + ph / 2,
        0,
        px + pw / 2,
        py + ph / 2,
        Math.max(W, H) * 0.6,
      );
      glow.addColorStop(0, "#1a2f68");
      glow.addColorStop(1, "rgba(14,29,66,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // Two speakers split the photo area side by side.
      const n = I.speakers.length;
      ctx.save();
      if (L.radius) {
        rr(ctx, px, py, pw, ph, L.radius);
        ctx.clip();
      }
      I.speakers.forEach((s, i) =>
        photoRect(ctx, A.photos[i], s.name, px + (pw / n) * i, py, pw / n, ph),
      );
      if (n > 1) {
        ctx.fillStyle = C.navy;
        ctx.fillRect(px + pw / 2 - 3, py, 6, ph);
      }
      ctx.restore();
      if (L.radius) {
        rr(ctx, px, py, pw, ph, L.radius);
        ctx.lineWidth = 6 * k;
        ctx.strokeStyle = C.orange;
        ctx.stroke();
      } else {
        ctx.fillStyle = C.orange;
        ctx.fillRect(px + pw, 0, 6, H);
      }

      // Name / SPEAKING AT / logo / day line, centered vertically in the block.
      const { x, maxW, top, bottom, align } = L.block;
      const name = measure(
        ctx,
        {
          // Two speakers: one name per line rather than wrapping mid-name.
          text: I.speakers.map((s) => s.name).join(" &\n"),
          font: F.display(700),
          size: L.name,
          minSize: L.name * 0.6,
          maxLines: 2,
          lh: 1.05,
          spacing: -0.01,
          color: C.white,
        },
        maxW,
      );
      const logoH = A.logo ? (L.logoW * A.logo.height) / A.logo.width : 0;
      const cap = 18 * k;
      const gaps = [24 * k, 14 * k, 30 * k];
      const total =
        name.height + gaps[0] + cap + gaps[1] + logoH + gaps[2] + cap;
      const ax = align === "center" ? x + maxW / 2 : x;
      let y = top + (bottom - top - total) / 2;
      paint(ctx, name, ax, y, align);
      y += name.height + gaps[0];
      label(ctx, "SPEAKING AT", ax, y + cap * 0.8, {
        font: F.mono(500),
        size: cap,
        color: C.muted,
        align,
        spacing: 0.24,
      });
      y += cap + gaps[1];
      logo(
        ctx,
        A.logo,
        align === "center" ? x + (maxW - L.logoW) / 2 : x,
        y,
        L.logoW,
      );
      y += logoH + gaps[2];
      label(ctx, I.dateLine, ax, y + cap * 0.8, {
        font: F.mono(600),
        size: cap,
        color: C.orange,
        align,
        spacing: 0.08,
        maxW,
      });
    },
  },

  {
    id: "titlecard",
    name: "Title card",
    desc: "Your photo, your talk's title and the logo. Nothing else.",
    // No name, day or room: the talk title is the hook, the post text has the rest.
    draw(ctx, fmt, I, A) {
      const { w: W, h: H, k } = FORMATS[fmt];
      const L = {
        landscape: {
          photos: I.plural
            ? [
                [230, 245, 190],
                [430, 395, 190],
              ]
            : [[315, 315, 260]],
          block: {
            x: 640,
            maxW: 500,
            top: 70,
            bottom: 560,
            align: "left",
          },
          title: [50, 28],
          logoW: 250,
        },
        square: {
          photos: I.plural
            ? [
                [420, 300, 200],
                [660, 370, 200],
              ]
            : [[540, 320, 265]],
          block: {
            x: 80,
            maxW: 920,
            top: 630,
            bottom: 1010,
            align: "center",
          },
          title: [62, 34],
          logoW: 280,
        },
        story: {
          photos: I.plural
            ? [
                [370, 560, 280],
                [710, 750, 280],
              ]
            : [[540, 620, 380]],
          block: {
            x: 80,
            maxW: 920,
            top: 1080,
            bottom: 1760,
            align: "center",
          },
          title: [88, 46],
          logoW: 420,
        },
      }[fmt];

      // Same plain navy + single glow as Minimal.
      ctx.fillStyle = C.navy;
      ctx.fillRect(0, 0, W, H);
      const [gx, gy] = L.photos[0];
      const glow = ctx.createRadialGradient(
        gx,
        gy,
        0,
        gx,
        gy,
        Math.max(W, H) * 0.6,
      );
      glow.addColorStop(0, "#1a2f68");
      glow.addColorStop(1, "rgba(14,29,66,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);
      L.photos.forEach(([x, y, r], i) =>
        avatar(ctx, A.photos[i], I.speakers[i].name, x, y, r, {
          ring: i ? C.mint : C.orange,
        }),
      );

      // Title, then the logo, centered vertically in the block.
      const { x, maxW, top, bottom, align } = L.block;
      const logoH = A.logo ? (L.logoW * A.logo.height) / A.logo.width : 0;
      const gap = 40 * k;
      const title = measure(
        ctx,
        {
          text: I.title,
          font: F.display(700),
          size: L.title[0],
          minSize: L.title[1],
          lh: 1.08,
          spacing: -0.01,
          color: C.white,
        },
        maxW,
        bottom - top - gap - logoH,
      );
      let y = top + (bottom - top - (title.height + gap + logoH)) / 2;
      paint(ctx, title, align === "center" ? x + maxW / 2 : x, y, align);
      y += title.height + gap;
      logo(
        ctx,
        A.logo,
        align === "center" ? x + (maxW - L.logoW) / 2 : x,
        y,
        L.logoW,
      );
    },
  },
];
