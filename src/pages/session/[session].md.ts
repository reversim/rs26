import type { APIRoute, GetStaticPaths, InferGetStaticPropsType } from "astro";
import slugify from "slug";
import { getSessions } from "../../helpers/data/getSessions";
import { getSpeakers } from "../../helpers/data/getSpeakers";
import { markdown, sessionMarkdown } from "../../helpers/agents/markdown";

export const getStaticPaths = (async () => {
  const [{ rawSessionsList }, speakers] = await Promise.all([
    getSessions(),
    getSpeakers(),
  ]);
  const speakersById = new Map(speakers.map((s) => [String(s.id), s]));

  return rawSessionsList.map((session) => ({
    params: { session: slugify(session.title) },
    props: {
      session,
      speakers: session.speakers
        .map((s) => speakersById.get(String(s.id)))
        .filter((s): s is NonNullable<typeof s> => Boolean(s)),
    },
  }));
}) satisfies GetStaticPaths;

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export const GET: APIRoute<Props> = ({ props }) =>
  markdown(sessionMarkdown(props));
