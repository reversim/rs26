// Sessionize room names → what the site shows. The venue signs use room
// numbers, so the main hall carries its number too. Applied once where the
// data is fetched, so the agenda, calendar invites and the kits all agree.
const ROOM_LABELS: Record<string, string> = {
  "Main hall": "Main hall (A10)",
};

export const roomLabel = (room: string) => ROOM_LABELS[room] ?? room;

export const MAIN_HALL = roomLabel("Main hall");
