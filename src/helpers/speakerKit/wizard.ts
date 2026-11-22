// The speaker-kit wizard. It starts by asking what the speaker is after:
//   a post about their talk: session → platform → design → post text → post it;
//   an "I'm a speaker" sticker: platform → the image (no session, no text).
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
import {
  LRM,
  canShareFiles,
  daysUntil,
  esc,
  fillLivePost,
  livePost,
  platformBases,
  renderSteps,
  shareBanner,
  storedMap,
  toBanner,
  toast,
  withWhatsappIcon,
  xLength,
  type ActionCtx,
  type Banner,
  type Lang,
  type PlatformBase,
  type PlatformId,
} from "./share";
import { TEMPLATES } from "./templates";
import type { BannerInfo, Format, KitData, KitSession } from "./types";

type Step =
  | "kind"
  | "session"
  | "as"
  | "platform"
  | "design"
  | "text"
  | "post"
  | "sticker";
/** What the speaker is making. */
type Kind = "post" | "sticker";

/** The wizard's state, read from the URL. */
interface State {
  kind: Kind | null;
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

/** What the speaker adds in their own words; empty when they skip it. */
interface OwnWords {
  /** A lesson or angle from the talk. */
  point: string;
  /** A question to their followers, in place of ours. */
  question: string;
}
type OwnField = keyof OwnWords;

interface Platform extends PlatformBase {
  /** The suggested post; null for stories, which have no caption. */
  text: ((I: BannerInfo, lang: Lang, own: OwnWords) => string) | null;
  /** Ask the speaker for OwnWords, which text() works in. */
  ownWords?: boolean;
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

  const withNames = (I: BannerInfo, lead: string) =>
    I.others.length ? `${lead}${I.others.map((s) => s.name).join(" & ")}` : "";

  // Curly quotes get mirrored in right-to-left text, so Hebrew posts use straight ones.
  const quoteIn = (lang: Lang, title: string) =>
    lang === "he" ? `"${title}"` : quote(title);

  // ---------------------------------------------------------------- platforms
  // Each platform picks the banner size, writes the post, and lists the actions
  // in the order that platform needs them.

  const BASES = platformBases("session");
  const PLATFORMS: Record<PlatformId, Platform> = {
    linkedin: {
      ...BASES.linkedin,
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
    },
    x: {
      ...BASES.x,
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
      ownWords: true,
    },
    facebook: {
      ...BASES.facebook,
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
    },
    whatsapp: {
      ...BASES.whatsapp,
      // No emoji: WhatsApp Web/Desktop can turn emoji passed in a share link into "�".
      text(I, lang) {
        if (lang === "he")
          return `אני מרצה ב-*Reversim Summit 2026*${withNames(I, " יחד עם ")}!\n\n*${I.title}*\n${I.dayLongHe} · ${I.room}\n\n${I.url}`;
        return `I'm speaking at *Reversim Summit 2026*${withNames(I, " together with ")}!\n\n*${I.title}*\n${I.dayLong} · ${I.room}\n\n${I.url}`;
      },
    },
    story: {
      ...BASES.story,
      // Stories have no caption; the link goes on a sticker instead.
      text: null,
    },
  };

  const ICONS: Record<string, string> = withWhatsappIcon(icons);

  // The "I'm a speaker" stickers, in public/speaker-kit/stickers: the same image for
  // everyone, so they need no session. Only the platforms with a sticker size.
  const STICKERS: Partial<
    Record<PlatformId, { file: string; size: [number, number] }>
  > = {
    linkedin: { file: "im-a-speaker-linkedin.png", size: [1200, 627] },
    x: { file: "im-a-speaker-x.png", size: [1600, 900] },
    facebook: { file: "im-a-speaker-facebook.png", size: [1200, 630] },
  };
  const stickerSrc = (id: PlatformId) =>
    `/speaker-kit/stickers/${STICKERS[id]!.file}`;

  // ---------------------------------------------------------------- banners

  // A head and shoulders, for the sample session's photo.
  const SILHOUETTE = `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">' +
      '<rect width="400" height="400" fill="#10204a"/>' +
      '<circle cx="200" cy="165" r="72" fill="#3b5590"/>' +
      '<path d="M60 400C60 315 125 262 200 262S340 315 340 400Z" fill="#3b5590"/></svg>',
  )}`;

  // Stands in for the speaker's session before they've picked one. The day and room
  // are a real session's, so it lays out like a real banner.
  const SAMPLE: KitSession | undefined = SESSIONS[0] && {
    ...SESSIONS[0],
    slug: "sample",
    title: "Your talk's title",
    speakers: [
      {
        name: "Your Name",
        tagLine: "Your tagline",
        photo: SILHOUETTE,
        twitter: null,
      },
    ],
  };

  const banners = new Map<string, Promise<Banner>>();

  // Renders (once) one template for the current session and size.
  const getBanner = (st: State, templateId: string, fmt: Format) =>
    bannerFor(info(st), st.as!, templateId, fmt);

  // The same for any session, seen by its speaker number `as`.
  function bannerFor(
    I: BannerInfo,
    as: number,
    templateId: string,
    fmt: Format,
  ): Promise<Banner> {
    const key = [I.session.slug, as, fmt, templateId].join("|");
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
        return toBanner(
          canvas,
          `rs26-${I.session.slug.slice(0, 60)}-${templateId}-${fmt}.png`,
        );
      })();
      banners.set(key, banner);
    }
    return banner;
  }

  // ---------------------------------------------------------------- wizard
  // The URL holds the wizard's state (?kind=&session=&as=&platform=&design=&ready=), so the
  // browser's Back button works and any step can be linked to directly.

  // Every id the wizard looks up (main, progress, toast) is in the page's static markup.
  const $ = (id: string) => document.getElementById(id)!;
  const main = $("main");
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

  function readState(): State {
    const p = new URLSearchParams(location.search);
    const idx = SESSIONS.findIndex((s) => s.slug === p.get("session"));
    const session = idx >= 0 ? idx : null;
    const n = session === null ? 0 : SESSIONS[session].speakers.length;
    const as = Number(p.get("as"));
    const platform = p.get("platform");
    const design = p.get("design");
    // Links from before the sticker/post choice have a session but no kind.
    const kind = p.get("kind");
    const isKind = kind === "post" || kind === "sticker";
    return {
      kind: isKind ? kind : session === null ? null : "post",
      session,
      // Solo talks skip the "who's posting" question.
      as: n === 1 ? 0 : p.has("as") && as >= 0 && as < n ? as : null,
      platform:
        platform && platform in (kind === "sticker" ? STICKERS : PLATFORMS)
          ? (platform as PlatformId)
          : null,
      design: TEMPLATES.some((t) => t.id === design) ? design : null,
      ready: p.get("ready") === "1",
      // Hebrew unless asked otherwise.
      lang: p.get("lang") === "en" ? "en" : "he",
    };
  }

  function stepOf(st: State): Step {
    if (!st.kind) return "kind";
    if (st.kind === "sticker") return st.platform ? "sticker" : "platform";
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
    const start: Entry = ["kind", "Start", { ...RESET, kind: null }];
    // Before the speaker picks, it shows the post's steps: that's what most come for.
    const steps = (
      (st.kind === "sticker"
        ? [
            start,
            ["platform", "Platform", { platform: null }],
            ["sticker", "Sticker", {}],
          ]
        : [
            start,
            ["session", "Session", RESET],
            [
              "platform",
              "Platform",
              { platform: null, design: null, ready: null },
            ],
            ["design", "Design", { design: null }],
            hasText && ["text", "Text", { ready: null }],
            ["post", "Post", {}],
          ]) as (Entry | false)[]
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
      kind: renderKind,
      session: renderSession,
      as: renderAs,
      platform: renderPlatform,
      design: renderDesign,
      text: renderText,
      post: renderPost,
      sticker: renderSticker,
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

  // ---- 0. a post or a sticker

  // Each choice shows what it makes: a post is text over a banner, a sticker is
  // just the image. The banner is the speaker's own if they've been here before
  // (their latest pick), else a placeholder one.
  function renderKind(_: State, token: number) {
    const { w, h } = FORMATS.landscape;
    main.innerHTML = `
      <h1>What are you <em>posting</em>?</h1>
      <p class="sub">Tell people you're speaking at Reversim Summit 2026.</p>
      <div class="tiles kinds">
        <button class="tile" data-kind="post">
          <span class="sample" aria-hidden="true">
            <span class="lines"><span></span><span></span><span></span></span>
            <canvas width="${w}" height="${h}"></canvas>
          </span>
          <span class="name">A post about your talk</span>
          <span class="hint">A banner with your session, and a post text we wrote for you.</span>
        </button>
        <button class="tile" data-kind="sticker">
          <span class="sample" aria-hidden="true">
            <img src="${stickerSrc("linkedin")}" alt="" />
          </span>
          <span class="name">An “I'm a speaker” sticker</span>
          <span class="hint">Just an image. No session to pick, no text to write.</span>
        </button>
      </div>`;
    main.querySelector<HTMLElement>(".tiles")!.onclick = (e) => {
      const b = (e.target as Element).closest<HTMLElement>(".tile");
      if (b) go({ kind: b.dataset.kind });
    };
    const session = recent.read()[0]?.s ?? SAMPLE;
    if (!session) return;
    const ph = main.querySelector(".sample canvas")!;
    bannerFor(describe(session, 0), 0, TEMPLATES[0].id, "landscape").then(
      (banner) => {
        if (token === renderToken) ph.replaceWith(banner.canvas);
      },
    );
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
    main.prepend(backButton({ kind: null }));
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

  // The sticker comes in fewer sizes, so it has fewer platforms to pick from.
  function renderPlatform(st: State) {
    const sticker = st.kind === "sticker";
    if (sticker) main.append(backButton({ kind: null }));
    else
      main.append(isPlural(st) ? backButton({ as: null }) : backButton(RESET));
    const sub = sticker
      ? "You'll get the sticker in that platform's size."
      : `<strong dir="auto">${esc(info(st).title)}</strong> · ${esc(info(st).names)}`;
    main.insertAdjacentHTML(
      "beforeend",
      `<h1>Where are you <em>posting</em>?</h1>
       <p class="sub">${sub}</p>
       <div class="tiles">${(
         Object.entries(PLATFORMS) as [PlatformId, Platform][]
       )
         .filter(([id]) => !sticker || id in STICKERS)
         .map(
           ([id, p]) => `<button class="tile" data-id="${id}">
             ${ICONS[p.icon] ?? ""}
             <span class="name">${esc(p.label)}</span>
             <span class="note">${sticker ? STICKERS[id]!.size.join("×") : esc(p.note)}</span>
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

  // The post as a feed would show it, posted by this speaker. See share.ts.
  const speakerPost = (st: State, I: BannerInfo, footer = "") =>
    livePost({
      platform: st.platform!,
      icon: ICONS[platformOf(st).icon] ?? "",
      avatar: I.speakers[0].photo,
      name: I.speakers[0].name,
      bannerUrl: previewUrl!,
      footer,
    });

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
             <button class="ghost reset">Reset to our suggestion</button>
           </div>
         </div>
         ${speakerPost(st, I, `<div class="row end"><button class="next">Looks good →</button></div>`)}
       </div>`,
    );
    const ta = main.querySelector("textarea")!;
    const count = main.querySelector(".count")!;
    // The preview follows the text as it changes.
    const renderPreview = fillLivePost(main, p.fold);
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
    const ctx: ActionCtx = { url: I.url, banner, text: () => text ?? I.url };

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
         ${text === null ? "" : speakerPost(st, I)}
       </div>
       <div class="more">
         <button class="other">↻ Post on another platform too</button>
         <button class="other to-sticker">Get an “I'm a speaker” sticker too</button>
       </div>`,
    );
    if (text !== null) fillLivePost(main, p.fold)(text);

    renderSteps(main.querySelector(".steps")!, p.steps(), ctx, p.label);
    main
      .querySelector(".share")
      ?.addEventListener("click", () => shareBanner(banner, text));
    main.querySelector<HTMLElement>(".other")!.onclick = () =>
      go({ platform: null, design: null, ready: null });
    main.querySelector<HTMLElement>(".to-sticker")!.onclick = () =>
      go({
        ...RESET,
        kind: "sticker",
        platform: st.platform! in STICKERS ? st.platform : null,
      });
  }

  // ---- the sticker: just the image, to share or download

  function renderSticker(st: State) {
    const p = platformOf(st);
    const { file, size } = STICKERS[st.platform!]!;
    const src = stickerSrc(st.platform!);
    // Fetched up front, so Share can hand it over while the click still counts.
    const blob = fetch(src).then((r) => (r.ok ? r.blob() : Promise.reject()));
    blob.catch(() => {});
    main.append(backButton({ platform: null }));
    main.insertAdjacentHTML(
      "beforeend",
      `<h1>Your <em>sticker</em> for ${esc(p.label)}</h1>
       <p class="sub">Attach it to a post, or put it on your profile.</p>
       <div class="sticker-out">
         <img src="${src}" alt="I'm a speaker at Reversim Summit 2026" width="${size[0]}" height="${size[1]}" />
         <div class="row">
           <a class="act" href="${src}" download>Download sticker</a>
           ${canShareFiles ? `<button class="act share-sticker">Share…</button>` : ""}
         </div>
       </div>
       <div class="more">
         <button class="other">↻ Get it for another platform</button>
         <button class="other to-post">Post about your talk too</button>
       </div>`,
    );
    main
      .querySelector(".share-sticker")
      ?.addEventListener("click", async () => {
        try {
          const png = new File([await blob], file, { type: "image/png" });
          await navigator.share({ files: [png] });
        } catch (err) {
          if ((err as Error | undefined)?.name !== "AbortError")
            toast("Sharing didn't work here. Download the sticker instead.");
        }
      });
    main.querySelector<HTMLElement>(".other")!.onclick = () =>
      go({ platform: null });
    main.querySelector<HTMLElement>(".to-post")!.onclick = () =>
      go({ kind: "post", platform: null });
  }

  render();
}
