export interface AgendaSpeaker {
  id: string | number;
  name?: string;

  firstName?: string;
  lastName?: string;
  fullName?: string;
  tagLine?: string;
  bio?: string;
  profilePicture?: string;
  slug?: string;
  isTopSpeaker?: boolean;
  sessions?: any[];
  links?: { title: string; url: string; linkType: string }[];
}

export interface AgendaSession {
  id: string | number;
  title: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  roomId?: number;
  room?: string;
  speakers: AgendaSpeaker[];
  isServiceSession?: boolean;
  isPlenumSession?: boolean;
  categories?: any[];
  lengthMinutes?: number;
  isLightningGroup?: boolean;
  lightningChildren?: AgendaSession[];
  isLightning?: boolean;
}

export interface AgendaRoom {
  id: number;
  name: string;
  sort?: number;
  sessions: AgendaSession[];
}

export interface RawGridDay {
  date: string;
  isDefault?: boolean;
  rooms: AgendaRoom[];
  hasOnlyPlenumSessions?: boolean;
}

export interface AgendaDay extends RawGridDay {
  slug: string;
  label: string;
}

export interface Cell {
  key: string;
  session?: AgendaSession;
  span?: number;
  hidden?: boolean;
}

export interface CurrentDay {
  grid: {
    startsAt: string;
    endsAt: string;
    cells: Cell[];
    shortRow: boolean;
  }[];
  slug: string;
  label: string;
  date: string;
  isDefault?: boolean;
  rooms: AgendaRoom[];
  hasOnlyPlenumSessions?: boolean;
}
