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
/** The post text's language. */
type Lang = "he" | "en";

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
  lang: Lang;
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
  /** Show the link this step sends, read-only, next to its button. (The post
   * text needs no copy here: it's in the preview beside the steps.) */
  payload?: "url";
  /** Offer to copy the post text, in case the platform didn't pick it up. */
  copyFallback?: boolean;
}
type PostStep = Action | { say: string };

/** What the speaker adds in their own words; empty when they skip it. */
interface OwnWords {
  /** A lesson or angle from the talk. */
  point: string;
  /** A question to their followers, in place of ours. */
  question: string;
}
type OwnField = keyof OwnWords;

interface Platform {
  label: string;
  icon: string;
  format: Format;
  note: string;
  /** The suggested post; null for stories, which have no caption. */
  text: ((I: BannerInfo, lang: Lang, own: OwnWords) => string) | null;
  /** Ask the speaker for OwnWords, which text() works in. */
  ownWords?: boolean;
  /** Character limit, shown as a counter. */
  limit?: number;
  /** Lines a feed shows before "…see more" (on mobile); none if it shows it all. */
  fold?: number;
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
    const { dayShort, dayLong, dayLongHe } = session;
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
      dayLongHe,
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

  // Whole days from today to a "YYYY-MM-DD" date, in the viewer's time zone.
  function daysUntil(date: string) {
    const [y, m, d] = date.split("-").map(Number);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round(
      (new Date(y, m - 1, d).getTime() - today.getTime()) / 864e5,
    );
  }

  // A left-to-right mark: keeps a leading "#" or "@" on its word's left inside Hebrew text.
  const LRM = "\u200E";

  const withNames = (I: BannerInfo, lead: string) =>
    I.others.length ? `${lead}${I.others.map((s) => s.name).join(" & ")}` : "";

  // Curly quotes get mirrored in right-to-left text, so Hebrew posts use straight ones.
  const quoteIn = (lang: Lang, title: string) =>
    lang === "he" ? `"${title}"` : quote(title);

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

  const downloadStep = (hint?: string): Action => ({
    label: "Download banner",
    run: downloadBanner,
    hint: hint ?? "Saves the banner as a PNG.",
  });
  // The first step of most platforms: get the banner onto the clipboard, or disk.
  const bannerStep = (hint?: string): Action =>
    canCopyImage
      ? {
          label: "Copy banner",
          run: copyBanner,
          hint: hint ?? "Puts the banner on your clipboard.",
        }
      : downloadStep(hint);
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
      fold: 3,
      text(I, lang) {
        if (lang === "he")
          return (
            `🎤 אני מרצה ב-Reversim Summit 2026!\n\n${quoteIn(lang, I.title)}${withNames(I, "\nיחד עם ")}\n\n` +
            `📅 ${I.dayLongHe}\n📍 ${I.room}\n\n` +
            `RS26 הוא כנס קהילתי בן יומיים לתעשיית התוכנה הישראלית (30.11–1.12). ` +
            `מגיעים? בואו להגיד היי.\n\nפרטי ההרצאה והאג'נדה המלאה: ${I.url}\n\n${LRM}#RS26 #Reversim #ReversimSummit`
          );
        return (
          `🎤 I'm speaking at Reversim Summit 2026!\n\n${quote(I.title)}${withNames(I, "\nTogether with ")}\n\n` +
          `📅 ${I.dayLong}\n📍 ${I.room}\n\n` +
          `RS26 is a two-day, community-driven conference for Israel's software industry (Nov 30 – Dec 1). ` +
          `If you're coming, come say hi.\n\nSession details and the full agenda: ${I.url}\n\n#RS26 #Reversim #ReversimSummit`
        );
      },
      // LinkedIn's composer doesn't reliably take a pasted image, so the banner is
      // always downloaded and attached.
      steps: () => [
        downloadStep(),
        {
          label: "Open LinkedIn",
          // Unofficial but working pre-fill.
          run: (ctx) =>
            openTab(
              `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(ctx.text())}`,
            ),
          hint: "Opens LinkedIn with your post filled in.",
          // LinkedIn's pre-fill is unofficial, so offer the text by hand too.
          copyFallback: true,
        },
        // The session link brings up a link preview, and while it's there LinkedIn
        // hides the photo button (a post has a link preview or media, not both).
        {
          say: "Close the link preview (×) at the bottom of the post. The photo button shows up.",
        },
        // A pre-filled "@..." stays plain text; only LinkedIn's own picker makes a real tag.
        {
          say: "Attach the banner you downloaded with the photo button. Tag us (type @Reversim Summit and pick the page from the list), then post.",
        },
      ],
    },
    x: {
      label: "X",
      icon: "x-twitter",
      format: "landscape",
      note: "Landscape banner",
      // X is for conversation: a short hook, something to react to, and a question
      // people can actually answer. Title, day and room are on the banner already.
      text(I, lang, own) {
        const he = lang === "he";
        // Inside Hebrew text, an invisible left-to-right mark keeps each "@" on its handle's left.
        const at = (handle: string) => `${he ? "\u200E" : ""}@${handle}`;
        const others = I.others
          .map((s) => (s.twitter ? at(s.twitter) : s.name))
          .join(" & ");
        const days = daysUntil(I.session.date);
        const point = own.point.trim();
        const question = own.question.trim();
        if (he) {
          const who = others ? `אני ו-${others}` : "אני";
          const when =
            days > 2
              ? `עוד ${days} ימים `
              : days === 2
                ? "עוד יומיים "
                : days === 1
                  ? "מחר "
                  : days === 0
                    ? "היום "
                    : "";
          return (
            `${when}${who} על הבמה ב-${at("reversim")} 26 🎤\n` +
            `${point || `ממש ${I.plural ? "מחכים" : "מחכה"} לזה 🔥`}\n` +
            `${question || "מי עוד יהיה שם? 👇"}\n\n${I.url}`
          );
        }
        const who = others ? `${others} and I are` : "I'm";
        const when =
          days > 1
            ? `${days} days until `
            : days === 1
              ? "Tomorrow "
              : days === 0
                ? "Today "
                : "";
        return (
          `${when}${who} on stage at @reversim 26 🎤\n` +
          `${point || `Really looking forward to this one 🔥`}\n` +
          `${question || "Who else is coming? 👇"}\n\n${I.url}`
        );
      },
      limit: 280,
      ownWords: true,
      steps: () => [
        bannerStep(),
        {
          label: "Open X",
          run: (ctx) =>
            openTab(
              `https://x.com/intent/post?text=${encodeURIComponent(ctx.text())}`,
            ),
          hint: "Opens X with your post filled in.",
        },
        { say: `${pasteIt}, then post.` },
      ],
    },
    facebook: {
      label: "Facebook",
      icon: "facebook",
      format: "landscape",
      note: "Landscape banner",
      fold: 5,
      text(I, lang) {
        if (lang === "he")
          return (
            `🎤 אני מרצה ב-Reversim Summit 2026${withNames(I, " יחד עם ")}!\n\n${quoteIn(lang, I.title)}\n📅 ${I.dayLongHe} · ${I.room}\n\n` +
            `מגיעים ל-RS26? בואו להגיד היי 👋\n${I.url}\n\n${LRM}#RS26 #Reversim`
          );
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
          hint: "Facebook doesn't let other sites fill in a post, so this copies it. Start a new post and paste.",
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
      text(I, lang) {
        if (lang === "he")
          return `אני מרצה ב-*Reversim Summit 2026*${withNames(I, " יחד עם ")}!\n\n*${I.title}*\n${I.dayLongHe} · ${I.room}\n\n${I.url}`;
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
          hint: "Opens WhatsApp with your message filled in. You pick the chat.",
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

  // Every id the wizard looks up (main, progress, toast) is in the page's static markup.
  const $ = (id: string) => document.getElementById(id)!;
  const main = $("main");
  // A Map kept in sessionStorage, so a reload doesn't lose what's in it.
  function storedMap(storageKey: string) {
    const map = new Map<string, string>(
      (() => {
        try {
          return JSON.parse(sessionStorage.getItem(storageKey) ?? "[]");
        } catch {
          return [];
        }
      })(),
    );
    return {
      get: (k: string) => map.get(k),
      has: (k: string) => map.has(k),
      // null removes the entry.
      set(k: string, value: string | null) {
        if (value === null) map.delete(k);
        else map.set(k, value);
        try {
          sessionStorage.setItem(storageKey, JSON.stringify([...map]));
        } catch {}
      },
    };
  }
  // Edited post texts and the speaker's own words, per session + speaker + platform + language.
  const edited = storedMap("rs26-speaker-kit-edits");
  const ownWords = storedMap("rs26-speaker-kit-own-words");

  // Every step after "session" (and "as") has those set; these read them.
  const sessionOf = (st: State) => SESSIONS[st.session!];
  const info = (st: State) => describe(sessionOf(st), st.as!);
  const platformOf = (st: State) => PLATFORMS[st.platform!];

  const textKey = (st: State) =>
    [sessionOf(st).slug, st.as, st.platform, st.lang].join("|");
  const ownKey = (st: State, field: OwnField) => `${textKey(st)}|${field}`;
  const postText = (st: State, I: BannerInfo) =>
    edited.get(textKey(st)) ??
    platformOf(st).text?.(I, st.lang, {
      point: ownWords.get(ownKey(st, "point")) ?? "",
      question: ownWords.get(ownKey(st, "question")) ?? "",
    }) ??
    "";
  const saveText = (st: State, value: string | null) =>
    edited.set(textKey(st), value);
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

  // A post's text as a feed shows it: each line sets its own direction, like the
  // platforms do, and links, hashtags and mentions are highlighted.
  function postHtml(text: string) {
    return text
      .split("\n")
      .map((line) =>
        line.trim()
          ? `<div dir="auto">${esc(line).replace(
              /https?:\/\/[^\s<]+|[#@][\w-]+/g,
              (m) => `<span class="lp-link">${m}</span>`,
            )}</div>`
          : `<div class="lp-gap"></div>`,
      )
      .join("");
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
      // Hebrew unless asked otherwise.
      lang: p.get("lang") === "en" ? "en" : "he",
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
  // With replace, the change doesn't get its own history entry.
  function go(changes: Changes, replace = false) {
    const p = new URLSearchParams(location.search);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === undefined) p.delete(k);
      else p.set(k, String(v));
    }
    const url = `${location.pathname}${p.size ? `?${p}` : ""}`;
    if (replace) history.replaceState(null, "", url);
    else history.pushState(null, "", url);
    const rendered = render();
    if (!replace) {
      window.scrollTo(0, 0);
      focusStep(rendered);
    }
  }
  window.addEventListener("popstate", () => focusStep(render()));

  // A new step replaces the page's content, so screen readers and keyboards start
  // over at its heading, unless the step focused something itself (the search).
  async function focusStep(rendered: void | Promise<void>) {
    const token = renderToken;
    await rendered;
    if (token !== renderToken || main.contains(document.activeElement)) return;
    const h1 = main.querySelector("h1");
    if (!h1) return;
    h1.tabIndex = -1;
    h1.focus({ preventScroll: true });
  }

  const RESET: Changes = {
    session: null,
    as: null,
    platform: null,
    design: null,
    ready: null,
  };
  const isPlural = (st: State) => sessionOf(st).speakers.length > 1;

  // Always "Back", whatever step it goes to: one less thing to read.
  function backButton(changes: Changes) {
    const b = document.createElement("button");
    b.className = "back";
    b.textContent = "← Back";
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
    return renderers[step](st, token);
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

  // Sessions picked before, newest first, kept in localStorage so they're still
  // there on the next visit. Stored by slug; ones no longer in the agenda drop out.
  const RECENT_KEY = "rs26-speaker-kit-recent";
  const MAX_RECENT = 3;
  const recent = {
    read(): typeof sortedSessions {
      let slugs: unknown = [];
      try {
        slugs = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
      } catch {}
      if (!Array.isArray(slugs)) return [];
      return slugs
        .map((slug) => sortedSessions.find(({ s }) => s.slug === slug))
        .filter((e) => e !== undefined);
    },
    write(slugs: string[]) {
      try {
        if (slugs.length)
          localStorage.setItem(RECENT_KEY, JSON.stringify(slugs));
        else localStorage.removeItem(RECENT_KEY);
      } catch {}
    },
    add(slug: string) {
      const slugs = recent.read().map(({ s }) => s.slug);
      recent.write(
        [slug, ...slugs.filter((s) => s !== slug)].slice(0, MAX_RECENT),
      );
    },
  };

  function renderSession() {
    main.innerHTML = `
      <h1>Which session is <em>yours</em>?</h1>
      <p class="sub">Pick your talk, and you'll get banners and a ready-to-post text for it.</p>
      <input class="search" type="search" placeholder="Search by your name or your talk's title" aria-label="Search sessions" />
      <div class="picker">
        <section class="group recent" aria-labelledby="recent-label" hidden>
          <div class="fieldlabel">
            <h2 id="recent-label">Recent</h2>
            <button class="ghost clear">Clear</button>
          </div>
          <ul class="list"></ul>
        </section>
        <section class="group all" aria-labelledby="all-label">
          <div class="fieldlabel" hidden><h2 id="all-label">All sessions</h2></div>
          <ul class="list"></ul>
        </section>
      </div>`;
    const input = main.querySelector<HTMLInputElement>(".search")!;
    const recentGroup = main.querySelector<HTMLElement>(".recent")!;
    const allLabel = main.querySelector<HTMLElement>(".all .fieldlabel")!;
    const [recentList, list] = main.querySelectorAll<HTMLElement>(".list");
    const items = (entries: typeof sortedSessions) =>
      entries
        .map(
          ({ i, who, s }) => `
          <li><button class="pick" data-i="${i}">
            ${faces(s.speakers)}
            <span><span class="who">${esc(who)}</span><br /><span class="what" dir="auto">${esc(s.title)}</span></span>
          </button></li>`,
        )
        .join("");
    const show = () => {
      const q = input.value.trim().toLowerCase();
      // Recent picks only while the search is empty; a search covers them anyway.
      const recents = q ? [] : recent.read();
      recentGroup.hidden = allLabel.hidden = !recents.length;
      recentList.innerHTML = items(recents);
      const hits = sortedSessions.filter(
        ({ who, s }) => !q || `${who} ${s.title}`.toLowerCase().includes(q),
      );
      list.innerHTML = hits.length
        ? items(hits)
        : `<li class="none">No session matches “${esc(input.value)}”.</li>`;
    };
    input.oninput = show;
    input.onkeydown = (e) => {
      if (e.key === "Enter")
        main.querySelector<HTMLButtonElement>(".pick")?.click();
    };
    main.querySelector<HTMLElement>(".picker")!.onclick = (e) => {
      const target = e.target as Element;
      if (target.closest(".clear")) {
        recent.write([]);
        show();
        input.focus();
        return;
      }
      const b = target.closest<HTMLElement>(".pick");
      if (!b) return;
      const { slug } = SESSIONS[Number(b.dataset.i)];
      recent.add(slug);
      go({ ...RESET, session: slug });
    };
    show();
    input.focus();
  }

  // ---- 1b. who's posting (two-speaker sessions only)

  function renderAs(st: State) {
    const s = sessionOf(st);
    main.append(backButton(RESET));
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
    main.append(isPlural(st) ? backButton({ as: null }) : backButton(RESET));
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
    main.append(backButton({ platform: null }));
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

  function ownField(
    field: OwnField,
    label: string,
    lang: Lang,
    placeholder: string,
  ) {
    return `<label class="fieldlabel" for="own-${field}"><span>${esc(label)}</span></label>
      <input id="own-${field}" class="own" data-field="${field}" dir="auto" lang="${lang}" maxlength="140" placeholder="${esc(placeholder)}" />`;
  }

  // The post as a feed would show it: speaker, text, banner. See postHtml().
  function livePost(st: State, I: BannerInfo) {
    const p = platformOf(st);
    return `<aside class="livepost" aria-label="Post preview">
      <div class="fieldlabel"><span>Preview</span><span>Approximate · on mobile</span></div>
      <div class="lp" data-platform="${st.platform}">
        <div class="lp-head">
          <img class="lp-avatar" src="${esc(I.speakers[0].photo)}" alt="" crossorigin="anonymous" />
          <span class="lp-name">${esc(I.speakers[0].name)}</span>
          <span class="lp-icon">${ICONS[p.icon] ?? ""}</span>
        </div>
        <div class="lp-text"></div>
        <button class="lp-more" hidden>…see more</button>
        <img class="lp-banner" src="${previewUrl}" alt="Your banner" />
      </div>
    </aside>`;
  }

  // Wires the livePost() on the page; the returned function shows a text in it.
  // Feeds that fold long posts show the fold, until "…see more" is clicked, like
  // the real thing.
  function fillLivePost(p: Platform) {
    const lpText = main.querySelector<HTMLElement>(".lp-text")!;
    const more = main.querySelector<HTMLElement>(".lp-more")!;
    let expanded = false;
    let shown = "";
    const show = (text: string) => {
      shown = text;
      lpText.innerHTML = postHtml(text);
      if (!p.fold) return;
      lpText.style.maxHeight = expanded ? "" : `${p.fold * 1.4}em`;
      more.hidden = expanded || lpText.scrollHeight <= lpText.clientHeight + 1;
    };
    more.onclick = () => {
      expanded = true;
      show(shown);
    };
    return show;
  }

  async function renderText(st: State, token: number) {
    const p = platformOf(st);
    const I = info(st);
    if (!(await bannerPreview(st, token))) return;

    main.append(backButton({ design: null }));
    main.insertAdjacentHTML(
      "beforeend",
      `<h1>Your <em>post</em></h1>
       <p class="sub">We wrote one for ${esc(p.label)}. Make it yours, or keep it as is.</p>
       <div class="compose">
         <div>
           <div class="lang" role="group" aria-label="Post language">
             <button data-lang="he" lang="he" aria-pressed="${st.lang === "he"}">עברית</button>
             <button data-lang="en" aria-pressed="${st.lang === "en"}">English</button>
           </div>
           ${
             p.ownWords
               ? `${ownField("point", "A point from your talk (optional)", st.lang, st.lang === "he" ? "למשל: קוברנטיס גמורה" : "e.g. Kubernetes is dead")}
                  ${ownField("question", "Your question to followers (optional)", st.lang, st.lang === "he" ? "למשל: מישהו עדיין מריץ את הזבל הזה בפרודקשן?" : "e.g. Is anyone still running this garbage in production?")}
                  <span class="hint ownhint">A point gives people something to react to, and a real question gives them a reason to reply. Leave the question empty and we'll ask who else is coming.</span>
                  <span class="hint ownhint" hidden>You edited the post, so these aren't added. Reset to our suggestion to bring them in.</span>`
               : ""
           }
           <label class="fieldlabel" for="text"><span>Post text</span><span class="count"></span></label>
           <textarea id="text" spellcheck="true" dir="auto" lang="${st.lang}"></textarea>
           <div class="row">
             <button class="next">Looks good →</button>
             <button class="ghost reset">Reset to our suggestion</button>
           </div>
         </div>
         ${livePost(st, I)}
       </div>`,
    );
    const ta = main.querySelector("textarea")!;
    const count = main.querySelector(".count")!;
    // The preview follows the text as it changes.
    const renderPreview = fillLivePost(p);
    const update = () => {
      renderPreview(ta.value);
      if (!p.limit) return;
      const n = xLength(ta.value);
      count.textContent = `${n} / ${p.limit}`;
      count.classList.toggle("over", n > p.limit);
    };
    // The speaker's own words go into our suggestion, so they only show while the
    // post hasn't been edited by hand.
    const [whyHint, editedHint] =
      main.querySelectorAll<HTMLElement>(".ownhint");
    // One hint at a time: why to add them, or why they aren't showing.
    const showHint = (isEdited: boolean) => {
      if (!whyHint) return;
      whyHint.hidden = isEdited;
      editedHint.hidden = !isEdited;
    };
    const refresh = () => {
      ta.value = postText(st, I);
      showHint(edited.has(textKey(st)));
      update();
    };
    main.querySelectorAll<HTMLInputElement>(".own").forEach((input) => {
      const key = ownKey(st, input.dataset.field as OwnField);
      input.value = ownWords.get(key) ?? "";
      input.oninput = () => {
        ownWords.set(key, input.value || null);
        if (!edited.has(textKey(st))) refresh();
      };
    });
    ta.oninput = () => {
      saveText(st, ta.value);
      showHint(true);
      update();
    };
    refresh();
    main.querySelector<HTMLElement>(".reset")!.onclick = () => {
      saveText(st, null);
      refresh();
    };
    main.querySelectorAll<HTMLElement>(".lang button").forEach((b) => {
      b.onclick = () => {
        const lang = b.dataset.lang!;
        // Hebrew is the default, so it's left out of the URL.
        if (lang !== st.lang) go({ lang: lang === "he" ? null : lang }, true);
      };
    });
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
      p.text ? backButton({ ready: null }) : backButton({ design: null }),
    );
    main.insertAdjacentHTML(
      "beforeend",
      `<h1>${p.text ? `Post it on <em>${esc(p.label)}</em>` : "Post it to your <em>story</em>"}</h1>
       <p class="sub">Follow the steps in order.</p>
       <div class="${text === null ? "post" : "compose"}" data-format="${p.format}">
         ${text === null ? `<div class="preview"><img src="${previewUrl}" alt="Your banner" /></div>` : ""}
         <div>
           ${
             canShareFiles
               ? `<button class="share">${p.text ? "Share banner + text…" : "Share banner…"}</button>
                  <div class="or">or step by step</div>`
               : ""
           }
           <ol class="steps"></ol>
         </div>
         ${text === null ? "" : livePost(st, I)}
       </div>
       <div class="more">
         <button class="other">↻ Post on another platform too</button>
       </div>`,
    );
    if (text !== null) fillLivePost(p)(text);

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
      // sends the link shows it, read-only, in the same card.
      const body = document.createElement("div");
      if (s.payload) body.className = "carry";
      body.append(b);
      body.insertAdjacentHTML(
        "beforeend",
        `<span class="hint">${esc(s.hint)}</span>`,
      );
      if (s.copyFallback) {
        body.insertAdjacentHTML(
          "beforeend",
          `<div class="row"><button class="ghost copy">Text didn't show up? Copy it</button></div>`,
        );
        body.querySelector<HTMLElement>(".copy")!.onclick = async () => {
          if (await copyText(ctx.text()))
            toast(`Text copied. Paste it into ${p.label}.`);
        };
      }
      if (s.payload === "url") {
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
    main.querySelector<HTMLElement>(".other")!.onclick = () =>
      go({ platform: null, design: null, ready: null });
  }

  render();
}
