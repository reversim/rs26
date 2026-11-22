// What the speaker kit and the moderator kit share once there's a banner and a
// post text: rendering the banner to a file, the clipboard and share actions,
// each platform's posting steps, the live post preview and the steps list.
// Every id these look up (toast) is in both pages' static markup.

export type PlatformId = "linkedin" | "x" | "facebook" | "whatsapp" | "story";
/** The post text's language. */
export type Lang = "he" | "en";

export interface Banner {
  canvas: HTMLCanvasElement;
  blob: Blob | null;
  blobPromise: Promise<Blob>;
  fileName: string;
}

/** What a post step's action gets to work with. */
export interface ActionCtx {
  /** The page the post links to. */
  url: string;
  banner: Banner;
  /** The post text (the link for stories). */
  text: () => string;
}

export interface Action {
  label: string;
  run: (ctx: ActionCtx) => boolean | Promise<boolean>;
  hint: string;
  /** Show the link this step sends, read-only, next to its button. (The post
   * text needs no copy here: it's in the preview beside the steps.) */
  payload?: "url";
  /** Offer to copy the post text, in case the platform didn't pick it up. */
  copyFallback?: boolean;
}
export type PostStep = Action | { say: string };

/** What's the same for a platform in both kits; each kit adds its post texts. */
export interface PlatformBase {
  label: string;
  icon: string;
  format: "landscape" | "square" | "story";
  note: string;
  /** Character limit, shown as a counter. */
  limit?: number;
  /** Lines a feed shows before "…see more" (on mobile); none if it shows it all. */
  fold?: number;
  steps: () => PostStep[];
}

// A left-to-right mark: keeps a leading "#" or "@" on its word's left inside Hebrew text.
export const LRM = "‎";

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};
export function esc(s: string) {
  return String(s).replace(/[&<>"]/g, (c) => ENTITIES[c]);
}

// X weighs most non-Latin code points and emoji as 2, and every URL as 23.
export function xLength(text: string) {
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
export function daysUntil(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round(
    (new Date(y, m - 1, d).getTime() - today.getTime()) / 864e5,
  );
}

// A post's text as a feed shows it: each line sets its own direction, like the
// platforms do, and links, hashtags and mentions are highlighted.
export function postHtml(text: string) {
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

// A Map kept in sessionStorage, so a reload doesn't lose what's in it.
export function storedMap(storageKey: string) {
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

// ---------------------------------------------------------------- actions

export const canCopyImage =
  typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;
export const canShareFiles = (() => {
  try {
    return !!navigator.canShare?.({
      files: [new File([""], "x.png", { type: "image/png" })],
    });
  } catch {
    return false;
  }
})();

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string) {
  const t = document.getElementById("toast")!;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

// Synchronous copy first, so a window.open() right after still counts as part of
// the click (popup blockers); the async clipboard API is the fallback.
export async function copyText(text: string) {
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

export function openTab(url: string) {
  window.open(url, "_blank", "noopener");
  return true;
}

/** Wraps a drawn canvas as a Banner; its PNG is encoded in the background. */
export function toBanner(canvas: HTMLCanvasElement, fileName: string): Banner {
  const banner: Banner = {
    canvas,
    blob: null,
    blobPromise: new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/png",
      ),
    ),
    fileName,
  };
  banner.blobPromise.then(
    (b) => (banner.blob = b),
    () => {},
  );
  return banner;
}

function downloadBanner(ctx: ActionCtx) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(ctx.banner.blob!);
  a.download = ctx.banner.fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
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
// Each platform picks the banner size and lists the actions in the order that
// platform needs them. `linkLabel` names what the link points to ("session").

export function platformBases(
  linkLabel: string,
): Record<PlatformId, PlatformBase> {
  return {
    linkedin: {
      label: "LinkedIn",
      icon: "linkedin",
      format: "landscape",
      note: "Landscape banner",
      fold: 3,
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
        // The link brings up a link preview, and while it's there LinkedIn
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
      limit: 280,
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
      steps: () => [
        {
          label: "Download banner",
          run: downloadBanner,
          hint: "A story-sized PNG.",
        },
        {
          label: `Copy ${linkLabel} link`,
          run: async (ctx) =>
            (await copyText(ctx.url)) && (toast("Link copied."), true),
          hint: "For Instagram's Link sticker:",
          payload: "url",
        },
        { say: "Post it to your story." },
      ],
    },
  };
}

/** The site's social icons, plus a generic chat bubble: the icon set has no WhatsApp glyph. */
export const withWhatsappIcon = (icons: Record<string, string>) => ({
  ...icons,
  whatsapp:
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1C4.13 1 1 3.69 1 7c0 1.62.75 3.09 1.97 4.17L2.3 15l3.73-1.86c.62.15 1.28.23 1.97.23 3.87 0 7-2.69 7-6S11.87 1 8 1z"/></svg>',
});

// ---------------------------------------------------------------- the post

/** The post as a feed would show it: poster, text, banner. Footer goes under it. */
export function livePost({
  platform,
  icon,
  avatar,
  name,
  bannerUrl,
  footer = "",
}: {
  platform: PlatformId;
  icon: string;
  avatar: string;
  name: string;
  bannerUrl: string;
  footer?: string;
}) {
  return `<aside class="livepost" aria-label="Post preview">
      <div class="fieldlabel"><span>Preview</span><span>Approximate · on mobile</span></div>
      <div class="lp" data-platform="${platform}">
        <div class="lp-head">
          <img class="lp-avatar" src="${esc(avatar)}" alt="" crossorigin="anonymous" />
          <span class="lp-name">${esc(name)}</span>
          <span class="lp-icon">${icon}</span>
        </div>
        <div class="lp-text"></div>
        <button class="lp-more" hidden>…see more</button>
        <img class="lp-banner" src="${bannerUrl}" alt="Your banner" />
      </div>
      ${footer}
    </aside>`;
}

// Wires the livePost() inside root; the returned function shows a text in it.
// Feeds that fold long posts show the fold, until "…see more" is clicked, like
// the real thing.
export function fillLivePost(root: HTMLElement, fold?: number) {
  const lpText = root.querySelector<HTMLElement>(".lp-text")!;
  const more = root.querySelector<HTMLElement>(".lp-more")!;
  let expanded = false;
  let shown = "";
  const show = (text: string) => {
    shown = text;
    lpText.innerHTML = postHtml(text);
    if (!fold) return;
    lpText.style.maxHeight = expanded ? "" : `${fold * 1.4}em`;
    more.hidden = expanded || lpText.scrollHeight <= lpText.clientHeight + 1;
  };
  more.onclick = () => {
    expanded = true;
    show(shown);
  };
  return show;
}

/** Fills the post step's list: a card per action, plain lines for the rest. */
export function renderSteps(
  ol: Element,
  steps: PostStep[],
  ctx: ActionCtx,
  platformLabel: string,
) {
  for (const s of steps) {
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
          toast(`Text copied. Paste it into ${platformLabel}.`);
      };
    }
    if (s.payload === "url") {
      body.insertAdjacentHTML(
        "beforeend",
        `<div class="payload url">${esc(ctx.url)}</div>`,
      );
    }
    li.append(body);
    ol.append(li);
  }
}

/** Shares the banner (and text) through the OS share sheet. */
export async function shareBanner(banner: Banner, text: string | null) {
  const file = new File([banner.blob!], banner.fileName, { type: "image/png" });
  try {
    await navigator.share(text ? { files: [file], text } : { files: [file] });
  } catch (err) {
    if ((err as Error).name !== "AbortError")
      toast("Sharing didn't work here. Use the steps below.");
  }
}
