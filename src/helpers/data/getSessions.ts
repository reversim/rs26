import type { SessionGroup, Talk } from "../../types/session";

export async function getSessions() {
  const result = await fetch(
    "https://sessionize.com/api/v2/fan6lxrk/view/Sessions",
  );

  const rawSessionsList: Talk[] = [];

  const data: SessionGroup[] = await result.json();
  data.forEach((group) => {
    group.sessions.forEach((talk) => {
      rawSessionsList.push(talk);
    });
  });
  return { rawData: data, rawSessionsList };
}
