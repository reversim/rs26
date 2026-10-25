// The speaker-kit wizard: session → platform → design → post text → post it.
// startWizard() takes the build-time data (see src/pages/speaker-kit/index.astro).

import {
  FORMATS,
  RTL,
  SITE,
  loadFonts,
  loadImage,
  quote,
  resolveFonts,
} from "./draw";
import { TEMPLATES } from "./templates";
import type { BannerInfo, Format, KitData, KitSession } from "./types";

type PlatformId = "linkedin" | "x" | "facebook" | "whatsapp" | "story";
type Step = "session" | "as" | "platform" | "design" | "text" | "post";

/** The wizard's state, read from the URL. */
interface State {
  /** Index into the sessions list. */
  session: number | null;
  /** Which of the session's speakers is posting. */
  as: number | null;
  platform: PlatformId | null;
  design: string | null;
  /** The post text has been reviewed. */
  ready: boolean;
}

/** URL changes for go(): null removes a key. */
type Changes = Partial<Record<keyof State, string | number | null>>;

interface Banner {
  canvas: HTMLCanvasElement;
  blob: Blob | null;
  blobPromise: Promise<Blob>;
  fileName: string;
}

/** What a post step's action gets to work with. */
interface ActionCtx {
  I: BannerInfo;
  banner: Banner;
  /** The post text (the session link for stories). */
  text: () => string;
}

interface Action {
  label: string;
  run: (ctx: ActionCtx) => boolean | Promise<boolean>;
  hint: string;
  /** Show the text (or link) this step sends, read-only, next to its button. */
  payload?: "text" | "url";
  copyFallback?: boolean;
}
type PostStep = Action | { say: string };

interface Platform {
  label: string;
  icon: string;
  format: Format;
  note: string;
  /** The suggested post; null for stories, which have no caption. */
  text: ((I: BannerInfo) => string) | null;
  /** Character limit, shown as a counter. */
  limit?: number;
  steps: () => PostStep[];
}

export function startWizard({
  sessions: SESSIONS,
  logo: LOGO,
  icons,
}: KitData) {
  resolveFonts();

  // Everything the templates and post texts need, with the poster listed first.
  // Start times aren't final yet, so they're deliberately left out: banners and
  // posts show the day and room only.
  function describe(session: KitSession, me: number): BannerInfo {
    const speakers = [
      session.speakers[me],
      ...session.speakers.filter((_, i) => i !== me),
    ];
    const plural = speakers.length > 1;
    const { dayShort, dayLong } = session;
    return {
      session,
      speakers,
      plural,
      others: speakers.slice(1),
      title: session.title,
      names: speakers.map((s) => s.name).join(" & "),
      tagLine: plural ? "" : speakers[0].tagLine,
      dayShort,
      dayLong,
      room: session.room,
      dateLine: `${dayShort} · ${session.room}`.toUpperCase(),
      speaking: plural ? "WE'RE SPEAKING" : "I'M SPEAKING",
      url: `${SITE}/session/${session.slug}`,
    };
  }

  // ---------------------------------------------------------------- post texts

  // X weighs most non-Latin code points and emoji as 2, and every URL as 23.
  function xLength(text: string) {
    let n = 0;
    for (const ch of text.replace(/https?:\/\/\S+/g, "x".repeat(23))) {
      const cp = ch.codePointAt(0)!;
      const light =
        cp <= 4351 ||
        (cp >= 8192 && cp <= 8205) ||
        (cp >= 8208 && cp <= 8223) ||
        (cp >= 8242 && cp <= 8247);
      n += light ? 1 : 2;
    }
    return n;
  }

  const withNames = (I: BannerInfo, lead: string) =>
    I.others.length ? `${lead}${I.others.map((s) => s.name).join(" & ")}` : "";

  // ---------------------------------------------------------------- actions

  const canCopyImage =
    typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;
  const canShareFiles = (() => {
    try {
      return !!navigator.canShare?.({
        files: [new File([""], "x.png", { type: "image/png" })],
      });
    } catch {
      return false;
    }
  })();

  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  function toast(msg: string) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
  }

  // Synchronous copy first, so a window.open() right after still counts as part of
  // the click (popup blockers); the async clipboard API is the fallback.
  async function copyText(text: string) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    ta.remove();
    if (ok) return true;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  function openTab(url: string) {
    window.open(url, "_blank", "noopener");
    return true;
  }

  async function copyBanner(ctx: ActionCtx) {
    try {
      // Hand over the promise directly; Safari requires the write to start in the click.
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": ctx.banner.blobPromise }),
      ]);
      toast("Banner copied.");
      return true;
    } catch {
      toast("Couldn't copy the banner here. Downloading it instead.");
      return downloadBanner(ctx);
    }
  }

  function downloadBanner(ctx: ActionCtx) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(ctx.banner.blob!);
    a.download = ctx.banner.fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    return true;
  }

  // The first step of most platforms: get the banner onto the clipboard, or disk.
  const bannerStep = (hint?: string): Action =>
    canCopyImage
      ? {
          label: "Copy banner",
          run: copyBanner,
          hint: hint ?? "Puts the banner on your clipboard.",
        }
      : {
          label: "Download banner",
          run: downloadBanner,
          hint: hint ?? "Saves the banner as a PNG.",
        };
  const pasteIt = canCopyImage
    ? "Paste the banner into the post (Ctrl/⌘+V)"
    : "Attach the banner you downloaded";

  // ---------------------------------------------------------------- platforms
  // Each platform picks the banner size, writes the post, and lists the actions
  // in the order that platform needs them.

  const PLATFORMS: Record<PlatformId, Platform> = {
    linkedin: {
      label: "LinkedIn",
      icon: "linkedin",
      format: "landscape",
      note: "Landscape banner",
      text(I) {
        return (
          `🎤 I'm speaking at Reversim Summit 2026!\n\n${quote(I.title)}${withNames(I, "\nTogether with ")}\n\n` +
          `📅 ${I.dayLong}\n📍 ${I.room}\n\n` +
          `RS26 is a two-day, community-driven conference for Israel's software industry (Nov 30 – Dec 1). ` +
          `If you're coming, come say hi.\n\nSession details and the full agenda: ${I.url}\n\n#RS26 #Reversim #ReversimSummit`
        );
      },
      steps: () => [
        bannerStep(),
        {
          label: "Open LinkedIn",
          // Unofficial but working pre-fill.
          run: (ctx) =>
            openTab(
              `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(ctx.text())}`,
            ),
          hint: "Opens LinkedIn with this post filled in:",
          payload: "text",
          // LinkedIn's pre-fill is unofficial, so offer the text by hand too.
          copyFallback: true,
        },
        { say: `${pasteIt}, then post.` },
      ],
    },
    x: {
      label: "X",
      icon: "x-twitter",
      format: "landscape",
      note: "Landscape banner",
      text(I) {
        const mention = (s: BannerInfo["speakers"][number]) =>
          s.twitter ? `@${s.twitter}` : s.name;
        const withPart = I.others.length
          ? ` with ${I.others.map(mention).join(" & ")}`
          : "";
        const build = (title: string) =>
          `🎤 I'm speaking at #RS26, Reversim Summit 2026!\n\n${quote(title)}${withPart}\n📅 ${I.dayLong} · ${I.room}\n\nCome say hi 👋\n${I.url}`;
        let title = I.title;
        while (xLength(build(title)) > 280 && title.length > 10)
          title = title.slice(0, -2).trimEnd() + "…";
        return build(title);
      },
      limit: 280,
      steps: () => [
        bannerStep(),
        {
          label: "Open X",
          run: (ctx) =>
            openTab(
              `https://x.com/intent/post?text=${encodeURIComponent(ctx.text())}`,
            ),
          hint: "Opens X with this post filled in:",
          payload: "text",
        },
        { say: `${pasteIt}, then post.` },
      ],
    },
    facebook: {
      label: "Facebook",
      icon: "facebook",
      format: "landscape",
      note: "Landscape banner",
      text(I) {
        return (
          `🎤 I'm speaking at Reversim Summit 2026${withNames(I, " together with ")}!\n\n${quote(I.title)}\n📅 ${I.dayLong} · ${I.room}\n\n` +
          `Coming to RS26? Come say hi 👋\n${I.url}\n\n#RS26 #Reversim`
        );
      },
      // Facebook doesn't allow pre-filled post text, so the text goes via the clipboard first.
      steps: () => [
        {
          label: "Copy text & open Facebook",
          run: async (ctx) => {
            const ok = await copyText(ctx.text());
            openTab("https://www.facebook.com/");
            return ok;
          },
          hint: "Facebook doesn't let other sites fill in a post, so this copies it. Start a new post and paste:",
          payload: "text",
        },
        bannerStep(
          canCopyImage
            ? "Then paste it into the same post."
            : "Then attach it to the same post.",
        ),
        { say: "Post." },
      ],
    },
    whatsapp: {
      label: "WhatsApp",
      icon: "whatsapp",
      format: "square",
      note: "Square banner",
      // No emoji: WhatsApp Web/Desktop can turn emoji passed in a share link into "�".
      text(I) {
        return `I'm speaking at *Reversim Summit 2026*${withNames(I, " together with ")}!\n\n*${I.title}*\n${I.dayLong} · ${I.room}\n\n${I.url}`;
      },
      steps: () => [
        bannerStep(),
        {
          label: "Open WhatsApp",
          run: (ctx) =>
            openTab(
              // Not wa.me: its redirect is the usual culprit for mangled characters.
              `https://api.whatsapp.com/send?text=${encodeURIComponent(ctx.text())}`,
            ),
          hint: "Opens WhatsApp with this message filled in. You pick the chat:",
          payload: "text",
        },
        { say: `${pasteIt}, then send.` },
      ],
    },
    story: {
      label: "Story",
      icon: "instagram",
      format: "story",
      note: "Instagram · WhatsApp Status",
      // Stories have no caption; the link goes on a sticker instead.
      text: null,
      steps: () => [
        {
          label: "Download banner",
          run: downloadBanner,
          hint: "A story-sized PNG.",
        },
        {
          label: "Copy session link",
          run: async (ctx) =>
            (await copyText(ctx.I.url)) && (toast("Link copied."), true),
          hint: "For Instagram's Link sticker:",
          payload: "url",
        },
        { say: "Post it to your story." },
      ],
    },
  };

  // Generic chat bubble: the site's icon set has no WhatsApp glyph.
  const ICONS: Record<string, string> = {
    ...icons,
    whatsapp:
      '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1C4.13 1 1 3.69 1 7c0 1.62.75 3.09 1.97 4.17L2.3 15l3.73-1.86c.62.15 1.28.23 1.97.23 3.87 0 7-2.69 7-6S11.87 1 8 1z"/></svg>',
  };

  // ---------------------------------------------------------------- banners

  const banners = new Map<string, Promise<Banner>>();

  // Renders (once) one template for the current session and size.
  function getBanner(
    st: State,
    templateId: string,
    fmt: Format,
  ): Promise<Banner> {
    const I = info(st);
    const key = [I.session.slug, st.as, fmt, templateId].join("|");
    let banner = banners.get(key);
    if (!banner) {
      banner = (async () => {
        const [logoImg, photos] = await Promise.all([
          loadImage(LOGO),
          Promise.all(I.speakers.map((s) => loadImage(s.photo))),
          loadFonts(),
          // Only fetches emoji subsets if the session text actually contains emoji.
          document.fonts
            .load('20px "Noto Color Emoji"', I.title + I.names + I.tagLine)
            .catch(() => {}),
        ]);
        const { w, h } = FORMATS[fmt];
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const template = TEMPLATES.find((t) => t.id === templateId)!;
        template.draw(canvas.getContext("2d")!, fmt, I, {
          logo: logoImg,
          photos,
        });
        const rendered: Banner = {
          canvas,
          blob: null,
          blobPromise: new Promise((resolve, reject) =>
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
              "image/png",
            ),
          ),
          fileName: `rs26-${I.session.slug.slice(0, 60)}-${templateId}-${fmt}.png`,
        };
        rendered.blobPromise.then(
          (b) => (rendered.blob = b),
          () => {},
        );
        return rendered;
      })();
      banners.set(key, banner);
    }
    return banner;
  }

  // ---------------------------------------------------------------- wizard
  // The URL holds the wizard's state (?session=&as=&platform=&design=&ready=), so the
  // browser's Back button works and any step can be linked to directly.

  // Every id the wizard looks up is in the page's static markup.
  const $ = (id: string) => document.getElementById(id)!;
  const main = $("main");
  // Edited post texts, per session + speaker + platform. Kept in sessionStorage so a
  // reload doesn't lose them.
  const EDITS_KEY = "rs26-speaker-kit-edits";
  const edited = new Map<string, string>(
    (() => {
      try {
        return JSON.parse(sessionStorage.getItem(EDITS_KEY) ?? "[]");
      } catch {
        return [];
      }
    })(),
  );

  // Every step after "session" (and "as") has those set; these read them.
  const sessionOf = (st: State) => SESSIONS[st.session!];
  const info = (st: State) => describe(sessionOf(st), st.as!);
  const platformOf = (st: State) => PLATFORMS[st.platform!];

  const textKey = (st: State) =>
    [sessionOf(st).slug, st.as, st.platform].join("|");
  const postText = (st: State, I: BannerInfo) =>
    edited.get(textKey(st)) ?? platformOf(st).text?.(I) ?? "";
  function saveText(st: State, value: string | null) {
    if (value === null) edited.delete(textKey(st));
    else edited.set(textKey(st), value);
    try {
      sessionStorage.setItem(EDITS_KEY, JSON.stringify([...edited]));
    } catch {}
  }
  let renderToken = 0;
  let previewUrl: string | null = null;

  const ENTITIES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  };
  function esc(s: string) {
    return String(s).replace(/[&<>"]/g, (c) => ENTITIES[c]);
  }

  function readState(): State {
    const p = new URLSearchParams(location.search);
    const idx = SESSIONS.findIndex((s) => s.slug === p.get("session"));
    const session = idx >= 0 ? idx : null;
    const n = session === null ? 0 : SESSIONS[session].speakers.length;
    const as = Number(p.get("as"));
    const platform = p.get("platform");
    const design = p.get("design");
    return {
      session,
      // Solo talks skip the "who's posting" question.
      as: n === 1 ? 0 : p.has("as") && as >= 0 && as < n ? as : null,
      platform:
        platform && platform in PLATFORMS ? (platform as PlatformId) : null,
      design: TEMPLATES.some((t) => t.id === design) ? design : null,
      ready: p.get("ready") === "1",
    };
  }

  function stepOf(st: State): Step {
    if (st.session === null) return "session";
    if (st.as === null) return "as";
    if (!st.platform) return "platform";
    if (!st.design) return "design";
    // Stories have no post text, so they skip straight to posting.
    if (PLATFORMS[st.platform].text && !st.ready) return "text";
    return "post";
  }

  // Applies changes to the URL (null removes a key) and renders the new step.
  function go(changes: Changes) {
    const p = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === undefined) p.delete(k);
      else p.set(k, String(v));
    }
    history.pushState(null, "", `${location.pathname}${p.size ? `?${p}` : ""}`);
    render();
    window.scrollTo(0, 0);
  }
  window.addEventListener("popstate", render);

  const RESET: Changes = {
    session: null,
    as: null,
    platform: null,
    design: null,
    ready: null,
  };
  const isPlural = (st: State) => sessionOf(st).speakers.length > 1;

  function backButton(changes: Changes, label: string) {
    const b = document.createElement("button");
    b.className = "back";
    b.textContent = `← ${label}`;
    b.onclick = () => go(changes);
    return b;
  }

  function renderProgress(st: State, step: Step) {
    const hasText = !st.platform || !!PLATFORMS[st.platform].text;
    type Entry = [Step, string, Changes];
    const steps = (
      [
        ["session", "Session", RESET],
        ["platform", "Platform", { platform: null, design: null, ready: null }],
        ["design", "Design", { design: null }],
        hasText && ["text", "Text", { ready: null }],
        ["post", "Post", {}],
      ] as (Entry | false)[]
    ).filter((e): e is Entry => !!e);
    const current = step === "as" ? "session" : step;
    const at = steps.findIndex(([id]) => id === current);
    $("progress").innerHTML = "";
    steps.forEach(([id, label, changes], i) => {
      const li = document.createElement("li");
      li.className = i < at ? "done" : i === at ? "current" : "";
      if (i < at) {
        const b = document.createElement("button");
        b.textContent = label;
        b.onclick = () => go(changes);
        li.append(b);
      } else li.textContent = label;
      if (i === at) li.setAttribute("aria-current", "step");
      $("progress").append(li);
    });
  }

  function render() {
    const token = ++renderToken;
    const st = readState();
    const step = stepOf(st);
    renderProgress(st, step);
    main.innerHTML = "";
    const renderers: Record<
      Step,
      (st: State, token: number) => void | Promise<void>
    > = {
      session: renderSession,
      as: renderAs,
      platform: renderPlatform,
      design: renderDesign,
      text: renderText,
      post: renderPost,
    };
    renderers[step](st, token);
  }

  function faces(speakers: KitSession["speakers"]) {
    return `<span class="faces">${speakers
      .map(
        (s) =>
          `<img src="${esc(s.photo)}" alt="" crossorigin="anonymous" loading="lazy" />`,
      )
      .join("")}</span>`;
  }

  // ---- 1. session

  const sortedSessions = SESSIONS.map((s, i) => ({
    i,
    who: s.speakers.map((p) => p.name).join(" & "),
    s,
  })).sort((a, b) => a.who.localeCompare(b.who));

  function renderSession() {
    main.innerHTML = `
      <h1>Which session is <em>yours</em>?</h1>
      <p class="sub">Pick your talk, and you'll get banners and a ready-to-post text for it.</p>
      <input class="search" type="search" placeholder="Search by your name or your talk's title" aria-label="Search sessions" />
      <ul class="list"></ul>`;
    const input = main.querySelector<HTMLInputElement>(".search")!;
    const list = main.querySelector<HTMLElement>(".list")!;
    const show = () => {
      const q = input.value.trim().toLowerCase();
      const hits = sortedSessions.filter(
        ({ who, s }) => !q || `${who} ${s.title}`.toLowerCase().includes(q),
      );
      list.innerHTML = hits.length
        ? hits
            .map(
              ({ i, who, s }) => `
              <li><button class="pick" data-i="${i}">
                ${faces(s.speakers)}
                <span><span class="who">${esc(who)}</span><br /><span class="what" dir="auto">${esc(s.title)}</span></span>
              </button></li>`,
            )
            .join("")
        : `<li class="none">No session matches “${esc(input.value)}”.</li>`;
    };
    input.oninput = show;
    input.onkeydown = (e) => {
      if (e.key === "Enter")
        list.querySelector<HTMLButtonElement>(".pick")?.click();
    };
    list.onclick = (e) => {
      const b = (e.target as Element).closest<HTMLElement>(".pick");
      if (b) go({ ...RESET, session: SESSIONS[Number(b.dataset.i)].slug });
    };
    show();
    input.focus();
  }

  // ---- 1b. who's posting (two-speaker sessions only)

  function renderAs(st: State) {
    const s = sessionOf(st);
    main.append(backButton(RESET, "Different session"));
    main.insertAdjacentHTML(
      "beforeend",
      `<h1>Who's <em>posting</em>?</h1>
       <p class="sub" dir="auto"><strong>${esc(s.title)}</strong></p>
       <div class="tiles">${s.speakers
         .map(
           (p, i) => `<button class="tile" data-i="${i}">
             <img src="${esc(p.photo)}" alt="" crossorigin="anonymous" />
             <span class="name">${esc(p.name)}</span>
           </button>`,
         )
         .join("")}</div>`,
    );
    main.querySelector<HTMLElement>(".tiles")!.onclick = (e) => {
      const b = (e.target as Element).closest<HTMLElement>(".tile");
      if (b) go({ as: b.dataset.i });
    };
  }

  // ---- 2. platform

  function renderPlatform(st: State) {
    const I = info(st);
    main.append(
      isPlural(st)
        ? backButton({ as: null }, "Who's posting")
        : backButton(RESET, "Different session"),
    );
    main.insertAdjacentHTML(
      "beforeend",
      `<h1>Where are you <em>posting</em>?</h1>
       <p class="sub"><strong dir="auto">${esc(I.title)}</strong> · ${esc(I.names)}</p>
       <div class="tiles">${Object.entries(PLATFORMS)
         .map(
           ([id, p]) => `<button class="tile" data-id="${id}">
             ${ICONS[p.icon] ?? ""}
             <span class="name">${esc(p.label)}</span>
             <span class="note">${esc(p.note)}</span>
           </button>`,
         )
         .join("")}</div>`,
    );
    main.querySelector<HTMLElement>(".tiles")!.onclick = (e) => {
      const b = (e.target as Element).closest<HTMLElement>(".tile");
      if (b) go({ platform: b.dataset.id, design: null, ready: null });
    };
  }

  // ---- 3. design

  function renderDesign(st: State, token: number) {
    const p = platformOf(st);
    const { w, h } = FORMATS[p.format];
    main.append(backButton({ platform: null }, "Platform"));
    main.insertAdjacentHTML(
      "beforeend",
      `<h1>Pick a <em>design</em></h1>
       <p class="sub">For ${esc(p.label)} · ${w}×${h}</p>
       <div class="designs" data-format="${p.format}"></div>`,
    );
    const grid = main.querySelector(".designs")!;
    for (const t of TEMPLATES) {
      const b = document.createElement("button");
      b.className = "design";
      b.setAttribute("aria-label", `${t.name} design`);
      // Placeholder with the banner's aspect ratio until it's drawn.
      const ph = document.createElement("canvas");
      ph.width = w;
      ph.height = h;
      b.append(ph);
      b.insertAdjacentHTML(
        "beforeend",
        `<span class="name">${esc(t.name)}</span>`,
      );
      b.onclick = () => go({ design: t.id });
      grid.append(b);
      getBanner(st, t.id, p.format).then((banner) => {
        if (token === renderToken) ph.replaceWith(banner.canvas);
      });
    }
  }

  // Shared by the last two stages: waits for the banner and returns a preview URL.
  async function bannerPreview(st: State, token: number) {
    const banner = await getBanner(st, st.design!, platformOf(st).format);
    const blob = await banner.blobPromise;
    if (token !== renderToken) return null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(blob);
    return banner;
  }

  // ---- 4. your post (skipped for stories)

  async function renderText(st: State, token: number) {
    const p = platformOf(st);
    const I = info(st);
    if (!(await bannerPreview(st, token))) return;

    main.append(backButton({ design: null }, "Design"));
    main.insertAdjacentHTML(
      "beforeend",
      `<h1>Your <em>post</em></h1>
       <p class="sub">We wrote one for ${esc(p.label)}. Make it yours, or keep it as is.</p>
       <div class="post" data-format="${p.format}">
         <div class="preview"><img src="${previewUrl}" alt="Your banner" /></div>
         <div>
           <label class="fieldlabel" for="text"><span>Post text</span><span class="count"></span></label>
           <textarea id="text" spellcheck="true"></textarea>
           <div class="row">
             <button class="next">Looks good →</button>
             <button class="ghost reset">Reset to our suggestion</button>
           </div>
         </div>
       </div>`,
    );
    const ta = main.querySelector("textarea")!;
    const count = main.querySelector(".count")!;
    const update = () => {
      if (!p.limit) return;
      const n = xLength(ta.value);
      count.textContent = `${n} / ${p.limit}`;
      count.classList.toggle("over", n > p.limit);
    };
    ta.value = postText(st, I);
    ta.oninput = () => {
      saveText(st, ta.value);
      update();
    };
    update();
    main.querySelector<HTMLElement>(".reset")!.onclick = () => {
      saveText(st, null);
      ta.value = postText(st, I);
      update();
    };
    main.querySelector<HTMLElement>(".next")!.onclick = () =>
      go({ ready: "1" });
  }

  // ---- 5. post it

  async function renderPost(st: State, token: number) {
    const p = platformOf(st);
    const I = info(st);
    const banner = await bannerPreview(st, token);
    if (!banner) return;
    const text = p.text ? postText(st, I) : null;
    const ctx: ActionCtx = { I, banner, text: () => text ?? I.url };

    main.append(
      p.text
        ? backButton({ ready: null }, "Your post")
        : backButton({ design: null }, "Design"),
    );
    main.insertAdjacentHTML(
      "beforeend",
      `<h1>${p.text ? `Post it on <em>${esc(p.label)}</em>` : "Post it to your <em>story</em>"}</h1>
       <p class="sub">Follow the steps in order.</p>
       <div class="post" data-format="${p.format}">
         <div class="preview">
           <img src="${previewUrl}" alt="Your banner" />
           <button class="ghost change">← Change design</button>
         </div>
         <div>
           ${
             canShareFiles
               ? `<button class="share">${p.text ? "Share banner + text…" : "Share banner…"}</button>
                  <div class="or">or step by step</div>`
               : ""
           }
           <ol class="steps"></ol>
         </div>
       </div>
       <div class="more">
         <button class="ghost other">Post on another platform too →</button>
         <button class="ghost restart">Start over</button>
       </div>`,
    );

    const ol = main.querySelector(".steps")!;
    for (const s of p.steps()) {
      const li = document.createElement("li");
      if ("say" in s) {
        li.innerHTML = `<span class="say">${esc(s.say)}</span>`;
        ol.append(li);
        continue;
      }
      const b = document.createElement("button");
      b.className = "act";
      b.textContent = s.label;
      b.onclick = async () => {
        if (await s.run(ctx)) li.classList.add("done");
      };
      // Button and hint share the column next to the step number. A step that
      // sends the text (or link) shows it, read-only, in the same card.
      const body = document.createElement("div");
      if (s.payload) body.className = "carry";
      body.append(b);
      body.insertAdjacentHTML(
        "beforeend",
        `<span class="hint">${esc(s.hint)}</span>`,
      );
      if (s.payload === "text") {
        body.insertAdjacentHTML(
          "beforeend",
          `<blockquote class="payload" dir="auto">${esc(ctx.text())}</blockquote>
           <div class="row">
             <button class="ghost edit">Edit post</button>
             ${s.copyFallback ? `<button class="ghost copy">Text didn't show up? Copy it</button>` : ""}
           </div>`,
        );
        body.querySelector<HTMLElement>(".edit")!.onclick = () =>
          go({ ready: null });
        const copy = body.querySelector<HTMLElement>(".copy");
        if (copy)
          copy.onclick = async () => {
            if (await copyText(ctx.text()))
              toast("Text copied. Paste it into LinkedIn.");
          };
      } else if (s.payload === "url") {
        body.insertAdjacentHTML(
          "beforeend",
          `<div class="payload url">${esc(I.url)}</div>`,
        );
      }
      li.append(body);
      ol.append(li);
    }

    main.querySelector(".share")?.addEventListener("click", async () => {
      const file = new File([banner.blob!], banner.fileName, {
        type: "image/png",
      });
      try {
        await navigator.share(
          text ? { files: [file], text } : { files: [file] },
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError")
          toast("Sharing didn't work here. Use the steps below.");
      }
    });
    main.querySelector<HTMLElement>(".change")!.onclick = () =>
      go({ design: null });
    main.querySelector<HTMLElement>(".other")!.onclick = () =>
      go({ platform: null, design: null, ready: null });
    main.querySelector<HTMLElement>(".restart")!.onclick = () => go(RESET);
  }

  ($("logo") as HTMLImageElement).src = LOGO;
  render();
}
