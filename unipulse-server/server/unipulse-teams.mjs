// Postări „Caut echipă”: vizibile tuturor, cu cerere de intrare, ștergere și raportare.
import { ChatError, cleanText, EVENT_ID } from './unipulse-chat.mjs';
import { CITY_BOUNDS } from './unipulse-events.mjs';

export const TEAM_LIMITS = { activePerPlayer: 5, reportsToHide: 3 };
const fail = (code, status = 400) => { throw new ChatError(code, status); };
function checkPlayer(player) {
  if (!player || typeof player.id !== 'string' || !player.id) fail('PLAYER_REQUIRED', 401);
  return { id: player.id, name: cleanText(player.name, 24) || 'Student' };
}
const list = (value) => (Array.isArray(value) ? value : String(value ?? '').split(','))
  .map((item) => cleanText(item, 30)).filter(Boolean).slice(0, 8);

export function validateTeam(input) {
  const data = input && typeof input === 'object' ? input : {};
  if (typeof data.eventId !== 'string' || !EVENT_ID.test(data.eventId)) fail('INVALID_EVENT');
  if (!Object.hasOwn(CITY_BOUNDS, data.city)) fail('INVALID_CITY');
  const message = cleanText(data.message, 500);
  if (message.length < 10) fail('INVALID_TEAM_MESSAGE');
  const spots = Math.round(Number(data.spots));
  if (!Number.isFinite(spots) || spots < 1 || spots > 10) fail('INVALID_SPOTS');
  return { eventId: data.eventId, city: data.city, message, spots, have: list(data.have), need: list(data.need), faculty: cleanText(data.faculty, 60) };
}

export class UniPulseTeams {
  constructor(sql) {
    this.sql = sql;
    sql.exec(`CREATE TABLE IF NOT EXISTS team_posts(
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, owner_name TEXT NOT NULL, event_id TEXT NOT NULL, city TEXT NOT NULL,
      data TEXT NOT NULL, created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'visible')`);
    sql.exec('CREATE INDEX IF NOT EXISTS team_posts_city ON team_posts(city, status)');
    sql.exec(`CREATE TABLE IF NOT EXISTS team_members(
      team_id TEXT NOT NULL, player_id TEXT NOT NULL, name TEXT NOT NULL, joined_at INTEGER NOT NULL, PRIMARY KEY(team_id, player_id))`);
    sql.exec(`CREATE TABLE IF NOT EXISTS team_reports(
      team_id TEXT NOT NULL, player_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(team_id, player_id))`);
  }
  rows(query, ...bindings) { return this.sql.exec(query, ...bindings).toArray(); }
  get(id) { return this.rows('SELECT * FROM team_posts WHERE id=?', String(id))[0] || null; }

  view(row, player) {
    const data = JSON.parse(row.data);
    const members = this.rows('SELECT player_id, name FROM team_members WHERE team_id=? ORDER BY joined_at', row.id);
    const mine = !!player && row.owner_id === player.id;
    const joined = !!player && members.some((m) => m.player_id === player.id);
    return {
      id: row.id, eventId: row.event_id, city: row.city, author: row.owner_name, faculty: data.faculty || '',
      message: data.message, have: data.have, need: data.need, spots: data.spots, joined: members.length,
      joinedByMe: joined, mine, createdAt: row.created_at,
      // Numele membrilor le văd doar autorul și membrii.
      memberNames: mine || joined ? members.map((m) => m.name) : [],
    };
  }

  list(city, player) {
    if (!Object.hasOwn(CITY_BOUNDS, city)) fail('INVALID_CITY');
    return this.rows(`SELECT * FROM team_posts WHERE city=? AND status='visible' ORDER BY created_at DESC LIMIT 200`, city)
      .map((row) => this.view(row, player));
  }

  create(input, player, now = Date.now()) {
    const me = checkPlayer(player);
    const team = validateTeam(input);
    const active = Number(this.rows(`SELECT COUNT(*) AS n FROM team_posts WHERE owner_id=? AND status='visible'`, me.id)[0].n);
    if (active >= TEAM_LIMITS.activePerPlayer) fail('TOO_MANY_TEAMS', 429);
    const id = 't-' + Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => (b % 36).toString(36)).join('');
    const { eventId, city, ...data } = team;
    this.sql.exec('INSERT INTO team_posts(id, owner_id, owner_name, event_id, city, data, created_at) VALUES(?,?,?,?,?,?,?)',
      id, me.id, me.name, eventId, city, JSON.stringify(data), now);
    return this.view(this.get(id), me);
  }

  join(id, player, now = Date.now()) {
    const me = checkPlayer(player);
    const row = this.get(id);
    if (!row || row.status !== 'visible') fail('TEAM_NOT_FOUND', 404);
    if (row.owner_id === me.id) fail('OWN_TEAM');
    const { spots } = JSON.parse(row.data);
    const taken = Number(this.rows('SELECT COUNT(*) AS n FROM team_members WHERE team_id=?', id)[0].n);
    const already = this.rows('SELECT 1 FROM team_members WHERE team_id=? AND player_id=?', id, me.id).length > 0;
    if (!already && taken >= spots) fail('TEAM_FULL', 409);
    this.sql.exec(`INSERT INTO team_members(team_id, player_id, name, joined_at) VALUES(?,?,?,?)
      ON CONFLICT(team_id, player_id) DO UPDATE SET name=excluded.name`, id, me.id, me.name, now);
    return this.view(this.get(id), me);
  }

  leave(id, player) {
    const me = checkPlayer(player);
    this.sql.exec('DELETE FROM team_members WHERE team_id=? AND player_id=?', id, me.id);
    const row = this.get(id);
    if (!row) fail('TEAM_NOT_FOUND', 404);
    return this.view(row, me);
  }

  remove(id, player) {
    const me = checkPlayer(player);
    const row = this.get(id);
    if (!row || row.status === 'deleted') fail('TEAM_NOT_FOUND', 404);
    if (row.owner_id !== me.id) fail('NOT_OWNER', 403);
    this.sql.exec(`UPDATE team_posts SET status='deleted' WHERE id=?`, id);
    return { id, removed: true };
  }

  report(id, player, now = Date.now()) {
    const me = checkPlayer(player);
    const row = this.get(id);
    if (!row || row.status !== 'visible') fail('TEAM_NOT_FOUND', 404);
    if (row.owner_id === me.id) fail('OWN_TEAM');
    this.sql.exec('INSERT OR IGNORE INTO team_reports(team_id, player_id, created_at) VALUES(?,?,?)', id, me.id, now);
    const reports = Number(this.rows('SELECT COUNT(*) AS n FROM team_reports WHERE team_id=?', id)[0].n);
    const hidden = reports >= TEAM_LIMITS.reportsToHide;
    if (hidden) this.sql.exec(`UPDATE team_posts SET status='hidden' WHERE id=?`, id);
    return { id, reported: true, hidden };
  }
}
