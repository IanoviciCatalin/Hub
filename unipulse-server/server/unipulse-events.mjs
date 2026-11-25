// Evenimente create de utilizatori: vizibile tuturor imediat, cu raportare și ștergere.
// Primește același adaptor SQL ca UniPulseChat (exec(query, ...bindings) → { toArray() }).
import { ChatError, cleanText } from './unipulse-chat.mjs';

export const CATEGORIES = ['hackathon', 'workshop', 'conferinta', 'cariera', 'curs', 'concurs',
  'meetup', 'sport', 'cultura', 'social', 'voluntariat'];
// bounds = [[vest, sud], [est, nord]], la fel ca CITIES din site/unipulse/js/data.js.
export const CITY_BOUNDS = {
  timisoara: [[21.12, 45.69], [21.33, 45.82]],
  cluj: [[23.48, 46.71], [23.70, 46.83]],
  bucuresti: [[25.93, 44.33], [26.25, 44.54]],
  iasi: [[27.48, 47.10], [27.69, 47.23]],
};
const HOUR = 3600000, DAY = 24 * HOUR;
export const LIMITS = { activePerPlayer: 5, createdPerDay: 10, reportsToHide: 3, maxDuration: 14 * DAY, maxAhead: 365 * DAY };

const fail = (code, status = 400) => { throw new ChatError(code, status); };
function checkPlayer(player) {
  if (!player || typeof player.id !== 'string' || !player.id) fail('PLAYER_REQUIRED', 401);
  return { id: player.id, name: cleanText(player.name, 24) || 'Student' };
}
function safeUrl(value) {
  const text = String(value ?? '').trim();
  if (!text) return '';
  try {
    const url = new URL(text);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') fail('INVALID_URL');
    return url.href.slice(0, 300);
  } catch (error) {
    if (error instanceof ChatError) throw error;
    return fail('INVALID_URL');
  }
}
function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return 'c-' + [...bytes].map((b) => (b % 36).toString(36)).join('');
}

// Validează și normalizează datele trimise de client. Aruncă ChatError cu un cod clar.
export function validateEvent(input, now = Date.now()) {
  const data = input && typeof input === 'object' ? input : {};
  const title = cleanText(data.title, 80).replace(/\s+/g, ' ');
  if (title.length < 3) fail('INVALID_TITLE');
  const category = CATEGORIES.includes(data.category) ? data.category : fail('INVALID_CATEGORY');
  const city = Object.hasOwn(CITY_BOUNDS, data.city) ? data.city : fail('INVALID_CITY');
  const lat = Number(data.lat), lng = Number(data.lng);
  const [[west, south], [east, north]] = CITY_BOUNDS[city];
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lng < west || lng > east || lat < south || lat > north) fail('INVALID_PLACE');
  const venueName = cleanText(data.venueName, 80).replace(/\s+/g, ' ');
  if (venueName.length < 2) fail('INVALID_PLACE');
  const start = Date.parse(data.startISO);
  if (!Number.isFinite(start) || start < now - HOUR || start > now + LIMITS.maxAhead) fail('INVALID_START');
  const endInput = data.endISO ? Date.parse(data.endISO) : start + 3 * HOUR;
  if (!Number.isFinite(endInput) || endInput <= start || endInput - start > LIMITS.maxDuration) fail('INVALID_END');
  const price = data.price === null || data.price === undefined || data.price === '' ? null : Number(data.price);
  if (price !== null && (!Number.isFinite(price) || price < 0 || price > 10000)) fail('INVALID_PRICE');
  const spots = data.spots === null || data.spots === undefined || data.spots === '' ? null : Math.round(Number(data.spots));
  if (spots !== null && (!Number.isFinite(spots) || spots < 2 || spots > 5000)) fail('INVALID_SPOTS');
  return {
    title, category, city, lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6, venueName,
    address: cleanText(data.address, 120), description: cleanText(data.description, 1000),
    url: safeUrl(data.url), start, end: endInput, price: price === null ? null : Math.round(price), spots,
  };
}

export class UniPulseEvents {
  constructor(sql) {
    this.sql = sql;
    sql.exec(`CREATE TABLE IF NOT EXISTS community_events(
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, owner_name TEXT NOT NULL, data TEXT NOT NULL,
      city TEXT NOT NULL, start_at INTEGER NOT NULL, end_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'visible')`);
    sql.exec('CREATE INDEX IF NOT EXISTS community_events_city ON community_events(city, status, end_at)');
    sql.exec('CREATE INDEX IF NOT EXISTS community_events_owner ON community_events(owner_id, created_at)');
    sql.exec(`CREATE TABLE IF NOT EXISTS event_reports(
      event_id TEXT NOT NULL, player_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(event_id, player_id))`);
  }

  rows(query, ...bindings) { return this.sql.exec(query, ...bindings).toArray(); }

  view(row, player) {
    const data = JSON.parse(row.data);
    return {
      id: row.id, ...data, community: true, ownerName: row.owner_name,
      startISO: new Date(row.start_at).toISOString(), endISO: new Date(row.end_at).toISOString(),
      createdAt: row.created_at, mine: !!player && row.owner_id === player.id,
    };
  }

  list(city, player, now = Date.now()) {
    if (!Object.hasOwn(CITY_BOUNDS, city)) fail('INVALID_CITY');
    return this.rows(`SELECT * FROM community_events WHERE city=? AND status='visible' AND end_at>? ORDER BY start_at LIMIT 200`, city, now)
      .map((row) => this.view(row, player));
  }

  get(id) {
    return this.rows('SELECT * FROM community_events WHERE id=?', String(id))[0] || null;
  }

  create(input, player, now = Date.now()) {
    const me = checkPlayer(player);
    const event = validateEvent(input, now);
    const active = Number(this.rows(`SELECT COUNT(*) AS n FROM community_events WHERE owner_id=? AND status='visible' AND end_at>?`, me.id, now)[0].n);
    if (active >= LIMITS.activePerPlayer) fail('TOO_MANY_EVENTS', 429);
    const today = Number(this.rows('SELECT COUNT(*) AS n FROM community_events WHERE owner_id=? AND created_at>?', me.id, now - DAY)[0].n);
    if (today >= LIMITS.createdPerDay) fail('TOO_MANY_EVENTS', 429);
    const id = randomId();
    const { start, end, city, ...data } = event;
    this.sql.exec(`INSERT INTO community_events(id, owner_id, owner_name, data, city, start_at, end_at, created_at)
      VALUES(?,?,?,?,?,?,?,?)`, id, me.id, me.name, JSON.stringify({ ...data, city }), city, start, end, now);
    return this.view(this.get(id), me);
  }

  remove(id, player) {
    const me = checkPlayer(player);
    const row = this.get(id);
    if (!row || row.status === 'deleted') fail('EVENT_NOT_FOUND', 404);
    if (row.owner_id !== me.id) fail('NOT_OWNER', 403);
    this.sql.exec(`UPDATE community_events SET status='deleted' WHERE id=?`, id);
    return { id, removed: true };
  }

  // Trei raportări de la conturi diferite ascund evenimentul pentru toți.
  report(id, player, now = Date.now()) {
    const me = checkPlayer(player);
    const row = this.get(id);
    if (!row || row.status !== 'visible') fail('EVENT_NOT_FOUND', 404);
    if (row.owner_id === me.id) fail('OWN_EVENT');
    this.sql.exec('INSERT OR IGNORE INTO event_reports(event_id, player_id, created_at) VALUES(?,?,?)', id, me.id, now);
    const reports = Number(this.rows('SELECT COUNT(*) AS n FROM event_reports WHERE event_id=?', id)[0].n);
    const hidden = reports >= LIMITS.reportsToHide;
    if (hidden) this.sql.exec(`UPDATE community_events SET status='hidden' WHERE id=?`, id);
    return { id, reported: true, hidden };
  }

  // Participările și chatul acceptă doar evenimente din selecție sau evenimente vizibile ale comunității.
  isOpen(id) {
    if (!String(id).startsWith('c-')) return true;
    return this.get(id)?.status === 'visible';
  }
}
