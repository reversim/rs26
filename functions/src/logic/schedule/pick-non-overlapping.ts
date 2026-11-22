import type { WeightedSession } from "./pick-non-overlapping.types.js";

/** For each item, how many items (a prefix of `sorted`) end at or before it starts. Binary search. */
function compatiblePrefixLengths<Item extends WeightedSession>(sorted: Item[]): number[] {
  return sorted.map((item, position) => {
    let low = 0;
    let high = position;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (sorted[middle].session.endsAt <= item.session.startsAt) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    return low;
  });
}

/** Classic weighted interval scheduling: maximum total weight of non-overlapping sessions. */
export function pickNonOverlapping<Item extends WeightedSession>(candidates: Item[]): Item[] {
  const sorted = [...candidates].sort(
    (first, second) =>
      first.session.endsAt.localeCompare(second.session.endsAt) ||
      first.session.startsAt.localeCompare(second.session.startsAt),
  );
  const count = sorted.length;
  const previous = compatiblePrefixLengths(sorted);
  // best[prefix] = the highest total weight using only the first `prefix` items.
  const best = Array.from({ length: count + 1 }, () => 0);
  for (let prefix = 1; prefix <= count; prefix++) {
    best[prefix] = Math.max(best[prefix - 1], sorted[prefix - 1].weight + best[previous[prefix - 1]]);
  }

  const picked: Item[] = [];
  for (let prefix = count; prefix > 0;) {
    const item = sorted[prefix - 1];
    if (item.weight + best[previous[prefix - 1]] >= best[prefix - 1] && item.weight > 0) {
      picked.push(item);
      prefix = previous[prefix - 1];
    } else {
      prefix--;
    }
  }

  return picked.reverse();
}
