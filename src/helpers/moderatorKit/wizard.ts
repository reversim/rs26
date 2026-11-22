// The moderator-kit wizard: a moderator promotes their whole track.
//   who are you → platform → design → post text → post it.
// It's the speaker kit's flow (src/helpers/speakerKit/wizard.ts) for a track in
// place of a session, and shares its posting steps and markup (and styles).
// startModeratorWizard() takes the build-time data (see src/pages/moderator-kit).

import {
  FORMATS,
  loadFonts,
  loadImage,
  resolveFonts,
} from "../speakerKit/draw";
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
  withWhatsappIcon,
  xLength,
  type ActionCtx,
  type Banner,
  type Lang,
  type PlatformBase,
  type PlatformId,
} from "../speakerKit/share";
import { TEMPLATES } from "./templates";
import type {
  Format,
  KitPerson,
  KitTrack,
  ModKitData,
  TrackInfo,
} from "./types";

type Step = "me" | "platform" | "design" | "text" | "post";

/** The wizard's state, read from the URL (?me= picks the moderator, so their track). */
interface State {
  /** Index into the tracks list. */
  track: number | null;
  /** Which of the track's moderators is posting. */
  as: number | null;
  platform: PlatformId | null;
  design: string | null;
  /** The post text has been reviewed. */
  ready: boolean;
  lang: Lang;
}

/** URL changes for go(): null removes a key. */
type Changes = Partial<
  Record<
    "me" | "platform" | "design" | "ready" | "lang",
    string | number | null
  >
>;

/** What the moderator adds in their own words; empty when they skip it. */
interface OwnWords {
  /** What the track is about: "DBs, serverless, data and agents". */
  topics: string;
  /** A question to their followers, in place of ours (X only). */
  question: string;
}
type OwnField = keyof OwnWords;

interface Platform extends PlatformBase {
  /** The suggested post; null for stories, which have no caption. */
  text: ((I: TrackInfo, lang: Lang, own: OwnWords) => string) | null;
  /** The OwnWords fields this platform's text works in. */
  own: OwnField[];
}

export function startModeratorWizard({
  tracks: TRACKS,
  logo: LOGO,
  icons,
}: ModKitData) {
  resolveFonts();

  const joinNames = (people: KitPerson[]) =>
    people.map((p) => p.name).join(" & ");

  // Everything the templates and post texts need, with the poster listed first.
  function describe(track: KitTrack, me: number): TrackInfo {
    const hosts = [
      track.moderators[me],
      ...track.moderators.filter((_, i) => i !== me),
    ];
    const n = track.sessions.length;
    return {
      track,
      hosts,
      others: hosts.slice(1),
      title: track.name,
      hostNames: joinNames(hosts),
      dateLine: track.dates.toUpperCase(),
      talks: `${n} ${n === 1 ? "TALK" : "TALKS"}`,
      color: track.color,
      url: track.url,
    };
  }

  // ---------------------------------------------------------------- post texts

  const n = (I: TrackInfo) => I.track.sessions.length;
  const others = (I: TrackInfo) => joinNames(I.others);
  // "about DBs, serverless and agents", when the moderator said what it's about.
  const about = (own: OwnWords, lead: string) =>
    own.topics.trim() ? `${lead}${own.topics.trim()}` : "";
  // The lineup, one talk per line.
  const lineup = (I: TrackInfo, bullet: string, he: boolean) =>
    I.track.sessions
      .map(
        (s) =>
          `${bullet}${he ? `"${s.title}"` : `“${s.title}”`} – ${joinNames(s.speakers)}`,
      )
      .join("\n");

  const BASES = platformBases("sessions");
  const PLATFORMS: Record<PlatformId, Platform> = {
    linkedin: {
      ...BASES.linkedin,
      own: ["topics"],
      text(I, lang, own) {
        if (lang === "he")
          return (
            `🎙️ השנה אני מנחה את טראק ה-${I.title} ב-Reversim Summit 2026, יחד עם ${others(I)}!\n\n` +
            `הכנו לכם ליינאפ מעולה של ${n(I)} הרצאות${about(own, " על ")}:\n${lineup(I, "▪️ ", true)}\n\n` +
            `📅 ${I.track.datesHe}\n\n` +
            `כל ההרצאות בכנס: ${I.url}\n\n${LRM}#RS26 #Reversim #ReversimSummit`
          );
        return (
          `🎙️ This year I'm moderating the ${I.title} track at Reversim Summit 2026, together with ${others(I)}!\n\n` +
          `We have an amazing lineup of ${n(I)} talks${about(own, " about ")}:\n${lineup(I, "▪️ ", false)}\n\n` +
          `📅 ${I.track.dates}\n\n` +
          `All the sessions: ${I.url}\n\n#RS26 #Reversim #ReversimSummit`
        );
      },
    },
    x: {
      ...BASES.x,
      own: ["topics", "question"],
      // X is for conversation: a hook, the pitch, and a question people can answer.
      text(I, lang, own) {
        const he = lang === "he";
        // Inside Hebrew text, an invisible left-to-right mark keeps each "@" on its handle's left.
        const at = (handle: string) => `${he ? LRM : ""}@${handle}`;
        const co = I.others
          .map((p) => (p.twitter ? at(p.twitter) : p.name))
          .join(" & ");
        const days = daysUntil(I.track.date);
        const question = own.question.trim();
        if (he) {
          const when =
            days > 2
              ? `עוד ${days} ימים `
              : days === 2
                ? "עוד יומיים "
                : days === 1
                  ? "מחר "
                  : "";
          return (
            `היי אנשי ${I.title} 👋 ${when}אני ו-${co} מנחים את הטראק ב-${at("reversim")} 26.\n` +
            `יש לנו ליינאפ מטורף של ${n(I)} הרצאות${about(own, " על ")} 🔥\n` +
            `${question || "על איזו אתם הכי מחכים? 👇"}\n\n${I.url}`
          );
        }
        const when =
          days > 1 ? ` ${days} days to go:` : days === 1 ? " Tomorrow:" : "";
        return (
          `Hey ${I.title} people 👋${when} ${co} and I are hosting the track at @reversim 26.\n` +
          `An amazing lineup of ${n(I)} talks${about(own, " about ")} 🔥\n` +
          `${question || "Which one are you coming for? 👇"}\n\n${I.url}`
        );
      },
    },
    facebook: {
      ...BASES.facebook,
      own: ["topics"],
      text(I, lang, own) {
        if (lang === "he")
          return (
            `🎙️ אני מנחה את טראק ה-${I.title} ב-Reversim Summit 2026 יחד עם ${others(I)}!\n\n` +
            `${n(I)} הרצאות${about(own, " על ")}:\n${lineup(I, "▪️ ", true)}\n\n` +
            `📅 ${I.track.datesHe}\nמגיעים? בואו להגיד היי 👋\n${I.url}\n\n${LRM}#RS26 #Reversim`
          );
        return (
          `🎙️ I'm moderating the ${I.title} track at Reversim Summit 2026 together with ${others(I)}!\n\n` +
          `${n(I)} talks${about(own, " about ")}:\n${lineup(I, "▪️ ", false)}\n\n` +
          `📅 ${I.track.dates}\nComing? Come say hi 👋\n${I.url}\n\n#RS26 #Reversim`
        );
      },
    },
    whatsapp: {
      ...BASES.whatsapp,
      own: ["topics"],
      // No emoji: WhatsApp Web/Desktop can turn emoji passed in a share link into "�".
      text(I, lang, own) {
        if (lang === "he")
          return (
            `השנה אני מנחה את טראק ה-*${I.title}* ב-*Reversim Summit 2026*, יחד עם ${others(I)}!\n\n` +
            `${n(I)} הרצאות${about(own, " על ")}:\n${lineup(I, "- ", true)}\n\n${I.track.datesHe}\n${I.url}`
          );
        return (
          `This year I'm moderating the *${I.title}* track at *Reversim Summit 2026*, together with ${others(I)}!\n\n` +
          `${n(I)} talks${about(own, " about ")}:\n${lineup(I, "- ", false)}\n\n${I.track.dates}\n${I.url}`
        );
      },
    },
    story: {
      ...BASES.story,
      own: [],
      // Stories have no caption; the link goes on a sticker instead.
      text: null,
    },
  };

  const ICONS: Record<string, string> = withWhatsappIcon(icons);

  // ---------------------------------------------------------------- banners

  const banners = new Map<string, Promise<Banner>>();

  // Renders (once) one design for a track, seen by moderator `as`, at a size.
  function bannerFor(
    I: TrackInfo,
    as: number,
    templateId: string,
    fmt: Format,
  ) {
    const key = [I.track.slug, as, fmt, templateId].join("|");
    let banner = banners.get(key);
    if (!banner) {
      banner = (async () => {
        const text = I.title + I.track.sessions.map((s) => s.title).join("");
        const [logoImg, hosts, speakers] = await Promise.all([
          loadImage(LOGO),
          Promise.all(I.hosts.map((p) => loadImage(p.photo))),
          Promise.all(I.track.speakers.map((p) => loadImage(p.photo))),
          loadFonts(),
          // Only fetches emoji subsets if the titles actually contain emoji.
          document.fonts.load('20px "Noto Color Emoji"', text).catch(() => {}),
        ]);
        const { w, h } = FORMATS[fmt];
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        TEMPLATES.find((t) => t.id === templateId)!.draw(
          canvas.getContext("2d")!,
          fmt,
          I,
          { logo: logoImg, hosts, speakers },
        );
        return toBanner(
          canvas,
          `rs26-${I.track.slug}-track-${templateId}-${fmt}.png`,
        );
      })();
      banners.set(key, banner);
    }
    return banner;
  }

  // ---------------------------------------------------------------- wizard
  // The URL holds the wizard's state (?me=&platform=&design=&ready=&lang=),
  // so the browser's Back button works and any step can be linked to directly.

  const $ = (id: string) => document.getElementById(id)!;
  const main = $("main");
  // Edited post texts and the moderator's own words, per track + moderator + platform + language.
  const edited = storedMap("rs26-moderator-kit-edits");
  const ownWords = storedMap("rs26-moderator-kit-own-words");

  const trackOf = (st: State) => TRACKS[st.track!];
  const info = (st: State) => describe(trackOf(st), st.as!);
  const platformOf = (st: State) => PLATFORMS[st.platform!];
  const getBanner = (st: State, templateId: string, fmt: Format) =>
    bannerFor(info(st), st.as!, templateId, fmt);

  const textKey = (st: State) =>
    [trackOf(st).slug, st.as, st.platform, st.lang].join("|");
  // Own words don't depend on the platform: what the track is about stays put.
  const ownKey = (st: State, field: OwnField) =>
    [trackOf(st).slug, st.as, st.lang, field].join("|");
  const ownOf = (st: State): OwnWords => ({
    topics: ownWords.get(ownKey(st, "topics")) ?? "",
    question: ownWords.get(ownKey(st, "question")) ?? "",
  });
  const postText = (st: State, I: TrackInfo) =>
    edited.get(textKey(st)) ??
    platformOf(st).text?.(I, st.lang, ownOf(st)) ??
    "";
  const saveText = (st: State, value: string | null) =>
    edited.set(textKey(st), value);
  let renderToken = 0;
  let previewUrl: string | null = null;

  // Every moderator, alphabetically, with where to find them: the "who are you" list.
  const MODERATORS = TRACKS.flatMap((t, track) =>
    t.moderators.map((m, as) => ({ m, track, as, t })),
  ).sort((a, b) => a.m.name.localeCompare(b.m.name));

  function readState(): State {
    const p = new URLSearchParams(location.search);
    const me = MODERATORS.find(({ m }) => m.slug === p.get("me"));
    const platform = p.get("platform");
    const design = p.get("design");
    return {
      track: me?.track ?? null,
      as: me?.as ?? null,
      platform:
        platform && platform in PLATFORMS ? (platform as PlatformId) : null,
      design: TEMPLATES.some((t) => t.id === design) ? design : null,
      ready: p.get("ready") === "1",
      // Hebrew unless asked otherwise.
      lang: p.get("lang") === "en" ? "en" : "he",
    };
  }

  function stepOf(st: State): Step {
    if (st.track === null || st.as === null) return "me";
    if (!st.platform) return "platform";
    if (!st.design) return "design";
    if (PLATFORMS[st.platform].text && !st.ready) return "text";
    return "post";
  }

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
    me: null,
    platform: null,
    design: null,
    ready: null,
  };

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
        ["me", "You", RESET],
        ["platform", "Platform", { platform: null, design: null, ready: null }],
        ["design", "Design", { design: null }],
        hasText && ["text", "Text", { ready: null }],
        ["post", "Post", {}],
      ] as (Entry | false)[]
    ).filter((e): e is Entry => !!e);
    const at = steps.findIndex(([id]) => id === step);
    $("progress").innerHTML = "";
    steps.forEach(([, label, changes], i) => {
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
      me: renderMe,
      platform: renderPlatform,
      design: renderDesign,
      text: renderText,
      post: renderPost,
    };
    return renderers[step](st, token);
  }

  // ---- 1. who are you

  // Like the speaker kit's session picker: search by your name or your track.
  function renderMe() {
    main.innerHTML = `
      <h1>Who <em>are you</em>?</h1>
      <p class="sub">Pick yourself, and you'll get banners with you, your co-moderator and your track's whole lineup, plus a ready-to-post text.</p>
      <input class="search" type="search" placeholder="Search by your name or your track" aria-label="Search moderators" />
      <ul class="list"></ul>`;
    const input = main.querySelector<HTMLInputElement>(".search")!;
    const list = main.querySelector<HTMLElement>(".list")!;
    const show = () => {
      const q = input.value.trim().toLowerCase();
      const hits = MODERATORS.filter(
        ({ m, t }) => !q || `${m.name} ${t.name}`.toLowerCase().includes(q),
      );
      list.innerHTML = hits.length
        ? hits
            .map(({ m, t }) => {
              const co = t.moderators.filter((o) => o !== m);
              return `
          <li><button class="pick" data-slug="${esc(m.slug ?? "")}">
            <span class="faces"><img src="${esc(m.photo)}" alt="" crossorigin="anonymous" loading="lazy" /></span>
            <span><span class="who">${esc(m.name)}</span><br /><span class="what">${esc(t.name)} track${co.length ? ` · with ${esc(joinNames(co))}` : ""} · ${t.sessions.length} talks</span></span>
          </button></li>`;
            })
            .join("")
        : `<li class="none">No moderator matches “${esc(input.value)}”.</li>`;
    };
    input.oninput = show;
    input.onkeydown = (e) => {
      if (e.key === "Enter")
        main.querySelector<HTMLButtonElement>(".pick")?.click();
    };
    list.onclick = (e) => {
      const b = (e.target as Element).closest<HTMLElement>(".pick");
      if (b) go({ ...RESET, me: b.dataset.slug });
    };
    show();
    input.focus();
  }

  // ---- 2. platform

  function renderPlatform(st: State) {
    main.append(backButton(RESET));
    main.insertAdjacentHTML(
      "beforeend",
      `<h1>Where are you <em>posting</em>?</h1>
       <p class="sub"><strong>${esc(info(st).title)}</strong> · ${esc(info(st).hostNames)}</p>
       <div class="tiles">${(
         Object.entries(PLATFORMS) as [PlatformId, Platform][]
       )
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

  // Shared by the last two steps: waits for the banner and returns a preview URL.
  async function bannerPreview(st: State, token: number) {
    const banner = await getBanner(st, st.design!, platformOf(st).format);
    const blob = await banner.blobPromise;
    if (token !== renderToken) return null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(blob);
    return banner;
  }

  // The post as a feed would show it, posted by this moderator.
  const moderatorPost = (st: State, I: TrackInfo, footer = "") =>
    livePost({
      platform: st.platform!,
      icon: ICONS[platformOf(st).icon] ?? "",
      avatar: I.hosts[0].photo,
      name: I.hosts[0].name,
      bannerUrl: previewUrl!,
      footer,
    });

  // ---- 4. your post (skipped for stories)

  const OWN_FIELDS: Record<
    OwnField,
    { label: string; he: string; en: string }
  > = {
    topics: {
      label: "What's the track about? (optional)",
      he: "למשל: דאטאבייסים, סרברלס, דאטה ואייג'נטים",
      en: "e.g. DBs, serverless, data and agents",
    },
    question: {
      label: "Your question to followers (optional)",
      he: "למשל: מי עוד מריץ את זה בפרודקשן?",
      en: "e.g. Who's still running this in production?",
    },
  };

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
           ${p.own
             .map(
               (
                 f,
               ) => `<label class="fieldlabel" for="own-${f}"><span>${esc(OWN_FIELDS[f].label)}</span></label>
                 <input id="own-${f}" class="own" data-field="${f}" dir="auto" lang="${st.lang}" maxlength="140" placeholder="${esc(OWN_FIELDS[f][st.lang])}" />`,
             )
             .join("")}
           ${
             p.own.length
               ? `<span class="hint ownhint">Say in a few words what the track covers, and it goes into the post.</span>
                  <span class="hint ownhint" hidden>You edited the post, so this isn't added. Reset to our suggestion to bring it in.</span>`
               : ""
           }
           <label class="fieldlabel" for="text"><span>Post text</span><span class="count"></span></label>
           <textarea id="text" spellcheck="true" dir="auto" lang="${st.lang}"></textarea>
           <div class="row">
             <button class="ghost reset">Reset to our suggestion</button>
           </div>
         </div>
         ${moderatorPost(st, I, `<div class="row end"><button class="next">Looks good →</button></div>`)}
       </div>`,
    );
    const ta = main.querySelector("textarea")!;
    const count = main.querySelector(".count")!;
    const renderPreview = fillLivePost(main, p.fold);
    const update = () => {
      renderPreview(ta.value);
      if (!p.limit) return;
      const len = xLength(ta.value);
      count.textContent = `${len} / ${p.limit}`;
      count.classList.toggle("over", len > p.limit);
    };
    const [whyHint, editedHint] =
      main.querySelectorAll<HTMLElement>(".ownhint");
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
         ${text === null ? "" : moderatorPost(st, I)}
       </div>
       <div class="more">
         <button class="other">↻ Post on another platform too</button>
         <a class="other" href="${esc(I.url)}" target="_blank" rel="noopener">See all the sessions</a>
       </div>`,
    );
    if (text !== null) fillLivePost(main, p.fold)(text);

    renderSteps(main.querySelector(".steps")!, p.steps(), ctx, p.label);
    main
      .querySelector(".share")
      ?.addEventListener("click", () => shareBanner(banner, text));
    main.querySelector<HTMLElement>(".other")!.onclick = () =>
      go({ platform: null, design: null, ready: null });
  }

  render();
}
