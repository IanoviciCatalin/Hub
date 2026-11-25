// Clasificare în categoriile existente UniPulse și validarea evenimentelor importate.
import { CATEGORIES, CITY_BOUNDS } from '../unipulse-events.mjs';
import { foldKey } from './text.mjs';
import { inCity } from './geo.mjs';

// Regulile specifice înaintea celor generale; fiecare termen începe la margine de cuvânt.
const RULES = [
  ['hackathon', /\bhackat?hon|\bhackaton|\bgame jam|\bcodecamp/],
  ['voluntariat', /\bvoluntar|\bvolunteer|\bcaritabil|\bdonare de sange/],
  ['cariera', /\btarg de cariera|\bjob fair|\binternship|\bcariera|\brecrutare/],
  ['conferinta', /\bconferint|\bconference|\bsimpozion|\bcongres|\bsummit|\bforum\b|\bdezbatere/],
  ['workshop', /\bworkshop|\batelier|\bbootcamp|\bmasterclass/],
  ['curs', /\bcurs\b|\bcursuri|\btraining|\bformare\b|\bwebinar/],
  ['concurs', /\bconcurs|\bcompetiti|\bolimpiad|\bcampionat/],
  ['sport', /\bmeci\b|\bmaraton|\balergare|\bfotbal|\bbaschet|\bvolei|\bhandbal|\btenis|\bcros\b/],
  ['meetup', /\bmeetup|\bnetworking|\bintalnire|\bcommunity night/],
  ['cultura', /\bteatru|\bspectacol|\bopera\b|\bbalet|\bexpozit|\bvernisaj|\bfilm\b|\bproiecti|\bconcert simfonic|\bfilarmonic|\blansare de carte/],
  ['social', /\bconcert|\bfestival|\bparty|\bpetrecere|\bstand.?up|\bdj\b|\bkaraoke/],
];

// → { category, confidence }. Categoria sursei (ex. teatrul → cultura) are prioritate față de cuvintele-cheie
// doar când textul nu indică clar altceva.
export function classify(raw, source) {
  const hint = CATEGORIES.includes(raw.categoryHint) ? raw.categoryHint : null;
  if (hint) return { category: hint, confidence: 1 };
  const text = foldKey([raw.title, ...(raw.tags || []), raw.description].join(' '));
  const found = RULES.find(([, re]) => re.test(text));
  if (source.defaultCategory && (!found || found[0] === source.defaultCategory)) return { category: source.defaultCategory, confidence: 0.9 };
  if (found) return { category: found[0], confidence: 0.7 };
  return { category: source.defaultCategory || 'social', confidence: source.defaultCategory ? 0.6 : 0.3 };
}

const HOUR = 3600000, DAY = 24 * HOUR;
export const IMPORT_LIMITS = { maxAhead: 365 * DAY, maxDuration: 14 * DAY, keepPast: 6 * HOUR };

// Probleme care opresc importul automat (evenimentul merge la revizuire cu motivul).
export function validateImported(event, source, now = Date.now()) {
  const problems = [];
  if (!event.externalId) problems.push('NO_EXTERNAL_ID');
  if (!event.title || event.title.length < 3) problems.push('INVALID_TITLE');
  if (!CATEGORIES.includes(event.category)) problems.push('INVALID_CATEGORY');
  if (!Object.hasOwn(CITY_BOUNDS, event.city)) problems.push('INVALID_CITY');
  if (!Number.isFinite(event.startAt)) problems.push('INVALID_START');
  else if (event.startAt > now + IMPORT_LIMITS.maxAhead) problems.push('TOO_FAR_AHEAD');
  if (!Number.isFinite(event.endAt) || event.endAt < event.startAt || event.endAt - event.startAt > IMPORT_LIMITS.maxDuration) problems.push('INVALID_END');
  if (!event.url) problems.push('INVALID_URL');
  if (event.attendance !== 'online' && !inCity(event.city, event.lat, event.lng)) problems.push('NO_PLACE');
  return problems;
}
