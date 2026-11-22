// Shapes shared by the moderator-kit modules.

import type { Format, FontFn } from "../speakerKit/types";

export type { Format, FontFn };

/** A moderator or a speaker, as the kit draws and mentions them. */
export interface KitPerson {
  name: string;
  /** Moderators only: their /about slug, which picks them in the URL. */
  slug?: string;
  photo: string;
  /** X handle, without the "@". */
  twitter: string | null;
}

export interface KitTrackSession {
  title: string;
  speakers: KitPerson[];
}

/** One track, as embedded in the page at build time. */
export interface KitTrack {
  slug: string;
  name: string;
  /** The track's accent color. */
  color: string;
  /** The page the posts link to. */
  url: string;
  /** The track's first day, "YYYY-MM-DD", for "N days until". */
  date: string;
  /** "Tue, Dec 1", or "Nov 30 – Dec 1, 2026" for a track on both days. */
  dates: string;
  /** The same in Hebrew. */
  datesHe: string;
  moderators: KitPerson[];
  sessions: KitTrackSession[];
  /** Every speaker once, in session order. */
  speakers: KitPerson[];
}

/** Everything the page hands to startModeratorWizard(). */
export interface ModKitData {
  tracks: KitTrack[];
  logo: string;
  icons: Record<string, string>;
}

/** A track as seen by one of its moderators: what banners and post texts use. */
export interface TrackInfo {
  track: KitTrack;
  /** The poster first. */
  hosts: KitPerson[];
  /** The other moderators. */
  others: KitPerson[];
  title: string;
  /** "Avi Youkhananov & Ayelet Dekel" */
  hostNames: string;
  /** e.g. "TUE, DEC 1" */
  dateLine: string;
  /** e.g. "6 TALKS" */
  talks: string;
  color: string;
  url: string;
}

/** Images a template draws (null where one failed to load). */
export interface TrackAssets {
  logo: HTMLImageElement | null;
  /** Per TrackInfo.hosts. */
  hosts: (HTMLImageElement | null)[];
  /** Per KitTrack.speakers. */
  speakers: (HTMLImageElement | null)[];
}

export interface TrackTemplate {
  id: string;
  name: string;
  draw(
    ctx: CanvasRenderingContext2D,
    fmt: Format,
    I: TrackInfo,
    A: TrackAssets,
  ): void;
}
