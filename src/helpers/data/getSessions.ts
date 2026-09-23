import type { SessionGroup, Talk } from "../../types/session";
import speakersDay from "../../data/speakersDay.json";

export async function getSessions() {
  const result = await fetch(
    "https://sessionize.com/api/v2/1saptwag/view/Sessions",
  );

  const rawSessionsList: Talk[] = [];

  const data: SessionGroup[] = await result.json();
  data.forEach((group) => {
    group.sessions.forEach((talk) => {
      const { day = 1 } =
        speakersDay.find(
          (s: { talkId: number }) => String(s.talkId) === talk.id,
        ) || talk;
      rawSessionsList.push({ ...talk, day });
    });
  });
  return { rawData: data, rawSessionsList };
}
