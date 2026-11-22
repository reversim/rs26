import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from "astro";
import { getSessions } from "../../helpers/data/getSessions";
import { getSpeakers } from "../../helpers/data/getSpeakers";
import { markdown, speakerMarkdown } from "../../helpers/agents/markdown";

export const getStaticPaths = (async () => {
  const [speakers, { rawSessionsList }] = await Promise.all([
    getSpeakers(),
    getSessions(),
  ]);

  return speakers.map((speaker) => ({
    params: { speaker: speaker.slug },
    props: {
      speaker,
      // A speaker's own talks, in the order they run.
      talks: rawSessionsList
        .filter((session) =>
          session.speakers.some((s) => String(s.id) === String(speaker.id)),
        )
        .sort(
          (a, b) =>
            (a.day ?? 1) - (b.day ?? 1) || a.startsAt.localeCompare(b.startsAt),
        ),
    },
  }));
}) satisfies GetStaticPaths;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export const GET: APIRoute<Props> = ({ props }) =>
  markdown(speakerMarkdown(props));
