// Potrivirea unui eveniment nou cu evenimentele deja existente în catalog.
import { foldKey, normalizeUrl, textSimilarity } from './text.mjs';
import { distanceM } from './geo.mjs';

export const MATCH = { sure: 0.85, maybe: 0.6, window: 36 * 3600000 };

function placeScore(a, b) {
  if (a.venueKey && a.venueKey === b.venueKey) return 1;
  if ([a.lat, a.lng, b.lat, b.lng].every(Number.isFinite)) {
    const d = distanceM(a, b);
    return d <= 150 ? 1 : d <= 400 ? 0.5 : 0;
  }
  return foldKey(a.locationName) && foldKey(a.locationName) === foldKey(b.locationName) ? 1 : 0;
}

function timeScore(a, b) {
  if (a.dateOnly || b.dateOnly) return 0;
  const diff = Math.abs(a.startAt - b.startAt);
  return diff <= 30 * 60000 ? 1 : diff <= 2 * 3600000 ? 0.4 : 0;
}

// Scor 0..1 între doi candidați din același oraș și aceeași perioadă.
export function matchScore(a, b) {
  if (a.url && b.url && normalizeUrl(a.url) === normalizeUrl(b.url)) return { score: 1, rule: 'url' };
  const title = textSimilarity(a.title, b.title);
  const organizer = a.organizer && b.organizer ? textSimilarity(a.organizer, b.organizer) : 0;
  const score = 0.45 * title + 0.25 * placeScore(a, b) + 0.2 * timeScore(a, b) + 0.1 * organizer;
  return { score: Math.round(score * 1000) / 1000, rule: 'score' };
}

// Cel mai bun candidat. candidates = evenimente din același oraș, start la ±36 h.
export function bestMatch(event, candidates) {
  let best = null;
  for (const candidate of candidates) {
    if (candidate.city !== event.city || Math.abs(candidate.startAt - event.startAt) > MATCH.window) continue;
    const result = matchScore(event, candidate);
    if (!best || result.score > best.score) best = { ...result, event: candidate };
  }
  return best;
}
