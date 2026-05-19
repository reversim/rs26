import slug from "slug";
import type { AgendaSpeaker } from "../../types/agenda";

export async function getSpeakers(): Promise<AgendaSpeaker[]> {
  const result = await fetch(
    "https://sessionize.com/api/v2/fan6lxrk/view/Speakers",
  );

  const data: AgendaSpeaker[] = await result.json();
  return data.map((speaker) => ({
    ...speaker,
    slug: slug(speaker?.fullName || ""),
  }));
}

export async function getSpeakerById(id: string): Promise<AgendaSpeaker> {
  const speakers = await getSpeakers();
  return (
    speakers.find((speaker: AgendaSpeaker) => speaker.id === id) || {
      id: "",
      name: "",
    }
  );
}
