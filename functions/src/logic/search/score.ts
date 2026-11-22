import type { Session, Speaker } from "../../data/agenda.types.js";
import type { FieldIndex, Scored, SessionIndex } from "./score.types.js";
import { stem, tokenize } from "./terms.js";
import type { Term } from "./terms.types.js";

const FIELD_WEIGHTS: Record<keyof SessionIndex, number> = {
  title: 3,
  track: 2.5,
  description: 1,
  speakers: 0.75,
};

const indexCache = new WeakMap<Session, SessionIndex>();

function indexField(text: string): FieldIndex {
  const tokens = tokenize(text);

  return { tokens: new Set(tokens), stems: new Set(tokens.map(stem)) };
}

function indexSession({ session, speakers }: { session: Session; speakers: Map<string, Speaker> }): SessionIndex {
  const cachedIndex = indexCache.get(session);
  if (cachedIndex) {
    return cachedIndex;
  }

  const speakerText = session.speakers
    .map((sessionSpeaker) => [sessionSpeaker.name, speakers.get(sessionSpeaker.id)?.tagLine ?? ""].join(" "))
    .join(" ");
  const sessionIndex = {
    title: indexField(session.title),
    track: indexField(session.track ?? ""),
    description: indexField(session.description ?? ""),
    speakers: indexField(speakerText),
  };
  indexCache.set(session, sessionIndex);

  return sessionIndex;
}

function fieldMatches({ field, term }: { field: FieldIndex; term: string }): boolean {
  return field.tokens.has(term) || field.stems.has(stem(term));
}

function termScore({ sessionIndex, term }: { sessionIndex: SessionIndex; term: string }): number {
  let score = 0;
  for (const field of Object.keys(FIELD_WEIGHTS) as (keyof SessionIndex)[]) {
    if (fieldMatches({ field: sessionIndex[field], term })) {
      score += FIELD_WEIGHTS[field];
    }
  }

  return score;
}

/** How well a session matches the terms. Only full-weight terms are reported as matched. */
export function scoreSession({
  session,
  terms,
  speakers,
}: {
  session: Session;
  terms: Term[];
  speakers: Map<string, Speaker>;
}): Scored {
  if (session.isService || terms.length === 0) {
    return { session, score: 0, matched: [] };
  }

  const sessionIndex = indexSession({ session, speakers });
  let score = 0;
  const matched: string[] = [];
  for (const { term, weight } of terms) {
    const fieldScore = termScore({ sessionIndex, term });
    if (fieldScore > 0) {
      score += fieldScore * weight;
      if (weight === 1) {
        matched.push(term);
      }
    }
  }

  return { session, score: Math.round(score * 10) / 10, matched };
}
