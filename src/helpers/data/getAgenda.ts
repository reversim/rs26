import type {
  AgendaDay,
  AgendaSession,
  Cell,
  RawGridDay,
} from "../../types/agenda";
import { resolveTrack } from "../agenda/trackName";

const AGENDA_URL = "https://sessionize.com/api/v2/fan6lxrk/view/GridSmart";

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function dateSlug(dateStr: string) {
  return new Date(dateStr).toISOString().split("T")[0];
}

export async function getAgendaDays(): Promise<AgendaDay[]> {
  const res = await fetch(AGENDA_URL);
  if (!res.ok) throw new Error("Failed fetching agenda");
  const raw: RawGridDay[] = await res.json();

  // Stable desired order by room id (Main Hall, A2+A3, A4+A5, Dining Hall, Entrance)
  const ROOM_ORDER = [59470, 59471, 59472, 70835, 70834];
  const orderIndex = new Map(ROOM_ORDER.map((id, i) => [id, i] as const));

  const days: AgendaDay[] = raw.map((day) => ({
    ...day,
    rooms: [...day.rooms].sort((a, b) => {
      const ai = orderIndex.has(a.id)
        ? orderIndex.get(a.id)!
        : ROOM_ORDER.length + a.id;
      const bi = orderIndex.has(b.id)
        ? orderIndex.get(b.id)!
        : ROOM_ORDER.length + b.id;
      return ai - bi;
    }),
    slug: dateSlug(day.date),
    label: formatDayLabel(day.date),
  }));

  days.sort((a, b) => a.slug.localeCompare(b.slug));
  return days;
}

export function buildDayGrid(day: AgendaDay) {
  const rooms = day.rooms;

  // Preprocess: compute length & mark lightning (Ignites track <=6min), neutralize plenum flag for grouping
  for (const room of rooms) {
    for (const s of room.sessions) {
      if (!s.lengthMinutes)
        s.lengthMinutes =
          (new Date(s.endsAt).getTime() - new Date(s.startsAt).getTime()) /
          60000;
      const trackCat = (s as any).categories?.find(
        (c: any) => c.name === "Track",
      );
      const tItem = trackCat?.categoryItems?.[0];
      let tName = tItem?.name;
      if (tName === "AI Apps" || tName === "AI Infra") tName = "AI";
      if (tName === "Ignites" && (s.lengthMinutes ?? 999) <= 6) {
        s.isLightning = true;
        if (s.isPlenumSession) s.isPlenumSession = false;
      }
    }
  }

  const startsSet = new Set<string>();
  rooms.forEach((r) => r.sessions.forEach((s) => startsSet.add(s.startsAt)));
  const starts = Array.from(startsSet).sort();

  const isLightningSession = (s: AgendaSession) => !!s?.isLightning;

  const rows = starts.map((startAt) => {
    const rowSessions = rooms.map((room) =>
      room.sessions.find((sess) => sess.startsAt === startAt),
    );
    const ends = rowSessions
      .filter(Boolean)
      .map((s) => new Date(s!.endsAt).getTime());
    const rowEnd = ends.length
      ? new Date(Math.max(...ends)).toISOString()
      : startAt;

    const cells: Cell[] = rowSessions.map((s, idx) => ({
      key: `${startAt}-${rooms[idx].id}`,
      session: s,
    }));

    for (let i = 0; i < cells.length; i++) {
      const s = cells[i].session;
      if (!s) continue;
      let span = 1;
      for (let j = i + 1; j < cells.length; j++) {
        if (cells[j].session && cells[j].session!.id === s.id) {
          span++;
          cells[j].hidden = true;
        } else break;
      }
      cells[i].span = span;
    }

    const plenumIdx = cells.findIndex((c) => c.session?.isPlenumSession);
    if (plenumIdx !== -1) {
      const plenum = cells[plenumIdx].session!;
      cells.forEach((c, i) => {
        if (i === 0) {
          c.session = plenum;
          c.span = rooms.length;
          c.hidden = false;
        } else {
          c.session = undefined;
          c.hidden = true;
        }
      });
    }

    const present = cells.filter((c) => c.session);
    const shortRow =
      present.length > 0 &&
      present.every(
        (c) =>
          isLightningSession(c.session!) &&
          !c.session!.isServiceSession &&
          !c.session!.isPlenumSession,
      );

    return { startsAt: startAt, endsAt: rowEnd, cells, shortRow };
  });

  const lightningIndices = rows
    .map((r, i) => (r.shortRow ? i : -1))
    .filter((i) => i >= 0);
  if (lightningIndices.length) {
    let startBlock = lightningIndices[0];
    let endBlock = startBlock;
    for (let i = 1; i < lightningIndices.length; i++) {
      if (lightningIndices[i] === endBlock + 1) endBlock = lightningIndices[i];
      else break;
    }
    const blockLength = endBlock - startBlock + 1;
    if (blockLength >= 2) {
      const blockRows = rows.slice(startBlock, endBlock + 1);
      const lightningSessions: AgendaSession[] = [];
      blockRows.forEach((r) =>
        r.cells.forEach((c) => {
          if (c.session) lightningSessions.push(c.session);
        }),
      );
      lightningSessions.sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
      const synthetic: AgendaSession = {
        id: `lightning-${day.slug}`,
        title: "Lightning Sessions",
        startsAt: blockRows[0].startsAt,
        endsAt: blockRows[blockRows.length - 1].endsAt,
        speakers: [],
        lengthMinutes:
          (new Date(blockRows[blockRows.length - 1].endsAt).getTime() -
            new Date(blockRows[0].startsAt).getTime()) /
          60000,
        isLightningGroup: true,
        lightningChildren: lightningSessions,
      };
      const lightningRow = {
        startsAt: blockRows[0].startsAt,
        endsAt: blockRows[blockRows.length - 1].endsAt,
        cells: [
          {
            key: `lightning-${day.slug}`,
            session: synthetic,
            span: rooms.length,
          },
        ],
        shortRow: false,
      };
      const newRows = rows.filter((_, i) => i < startBlock || i > endBlock);
      newRows.splice(startBlock, 0, lightningRow);
      return newRows;
    }
  }

  return rows;
}

export function getTrackName(session: AgendaSession): string | undefined {
  return resolveTrack(session) ?? undefined;
}
