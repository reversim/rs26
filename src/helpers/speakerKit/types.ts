// Shapes shared by the speaker-kit modules.

/** One speaker of a session, as embedded in the page at build time. */
export interface KitSpeaker {
  name: string;
  tagLine: string;
  photo: string;
  twitter: string | null;
}

/** One session, as embedded in the page at build time. */
export interface KitSession {
  slug: string;
  title: string;
  room: string;
  /** e.g. "Mon, Nov 30" */
  dayShort: string;
  /** e.g. "Monday, Nov 30" */
  dayLong: string;
  /** e.g. "יום שני, 30 בנובמבר" */
  dayLongHe: string;
  speakers: KitSpeaker[];
}

/** Everything the page hands to startWizard(). */
export interface KitData {
  sessions: KitSession[];
  logo: string;
  icons: Record<string, string>;
}

export type Format = "landscape" | "square" | "story";

/** A session as seen by one of its speakers: what banners and post texts use. */
export interface BannerInfo {
  session: KitSession;
  /** The poster first. */
  speakers: KitSpeaker[];
  plural: boolean;
  others: KitSpeaker[];
  title: string;
  names: string;
  tagLine: string;
  dayShort: string;
  dayLong: string;
  dayLongHe: string;
  room: string;
  dateLine: string;
  speaking: string;
  url: string;
}

/** Images a template draws: the logo and each speaker's photo (null if it failed to load). */
export interface BannerAssets {
  logo: HTMLImageElement | null;
  photos: (HTMLImageElement | null)[];
}

export interface Template {
  id: string;
  name: string;
  desc: string;
  draw(
    ctx: CanvasRenderingContext2D,
    fmt: Format,
    I: BannerInfo,
    A: BannerAssets,
  ): void;
}

/** Builds a CSS font shorthand for a given pixel size. */
export type FontFn = (size: number) => string;

/** A block of text to lay out: shrinks from size towards minSize to fit. */
export interface TextSpec {
  text: string;
  font: FontFn;
  size: number;
  minSize?: number;
  lh?: number;
  maxLines?: number;
  color: string;
  /** Letter spacing, in em. */
  spacing?: number;
  /** Space above this block when stacked. */
  gap?: number;
  /** Takes whatever height the other blocks in a stack leave over. */
  grow?: boolean;
}

/** A TextSpec after layout. */
export interface TextBlock extends TextSpec {
  lines: string[];
  lineH: number;
  height: number;
}
