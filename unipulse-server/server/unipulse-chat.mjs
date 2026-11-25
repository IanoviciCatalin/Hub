// Participări și discuții UniPulse. Logica primește un adaptor SQL cu metoda
// exec(query, ...bindings) care întoarce { toArray() }, la fel ca ctx.storage.sql.
export const EVENT_ID = /^[a-z0-9][a-z0-9-]{2,79}$/;
export const MAX_MESSAGE = 500;
const KEEP_MESSAGES = 1000;
const PAGE = 100;

export class ChatError extends Error {
  constructor(code, status = 400) { super(code); this.status = status; }
}

export function cleanText(value, max) {
  return String(value ?? '').normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}]/gu, (c) => (c === '\n' ? '\n' : ''))
    .replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
}

function checkEvent(id) {
  if (typeof id !== 'string' || !EVENT_ID.test(id)) throw new ChatError('INVALID_EVENT');
}
function checkPlayer(player) {
  if (!player || typeof player.id !== 'string' || !player.id) throw new ChatError('PLAYER_REQUIRED', 401);
  return { id: player.id, name: cleanText(player.name, 24) || 'Student' };
}

export class UniPulseChat {
  constructor(sql) {
    this.sql = sql;
    sql.exec(`CREATE TABLE IF NOT EXISTS participants(
      event_id TEXT NOT NULL, player_id TEXT NOT NULL, name TEXT NOT NULL, joined_at INTEGER NOT NULL,
      PRIMARY KEY(event_id, player_id))`);
    sql.exec(`CREATE TABLE IF NOT EXISTS messages(
      id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT NOT NULL, player_id TEXT NOT NULL,
      name TEXT NOT NULL, body TEXT NOT NULL, created_at INTEGER NOT NULL)`);
    sql.exec('CREATE INDEX IF NOT EXISTS messages_event ON messages(event_id, id)');
    sql.exec('CREATE INDEX IF NOT EXISTS participants_player ON participants(player_id)');
    sql.exec(`CREATE TABLE IF NOT EXISTS message_reports(
      message_id INTEGER NOT NULL, player_id TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(message_id, player_id))`);
  }

  message(eventId, messageId) {
    return this.rows('SELECT id, player_id FROM messages WHERE event_id=? AND id=?', eventId, Number(messageId))[0] || null;
  }

  // Autorul își poate șterge mesajul.
  deleteMessage(eventId, player, messageId) {
    checkEvent(eventId);
    const me = checkPlayer(player);
    const row = this.message(eventId, messageId);
    if (!row) throw new ChatError('MESSAGE_NOT_FOUND', 404);
    if (row.player_id !== me.id) throw new ChatError('NOT_OWNER', 403);
    this.sql.exec('DELETE FROM messages WHERE id=?', row.id);
    this.sql.exec('DELETE FROM message_reports WHERE message_id=?', row.id);
    return { id: Number(row.id), removed: true };
  }

  // Trei raportări de la participanți diferiți șterg mesajul.
  reportMessage(eventId, player, messageId, hideAt = 3) {
    checkEvent(eventId);
    const me = checkPlayer(player);
    if (!this.isParticipant(eventId, me.id)) throw new ChatError('NOT_PARTICIPANT', 403);
    const row = this.message(eventId, messageId);
    if (!row) throw new ChatError('MESSAGE_NOT_FOUND', 404);
    if (row.player_id === me.id) throw new ChatError('OWN_MESSAGE');
    this.sql.exec('INSERT OR IGNORE INTO message_reports(message_id, player_id, created_at) VALUES(?,?,?)', row.id, me.id, Date.now());
    const reports = Number(this.rows('SELECT COUNT(*) AS n FROM message_reports WHERE message_id=?', row.id)[0].n);
    const removed = reports >= hideAt;
    if (removed) {
      this.sql.exec('DELETE FROM messages WHERE id=?', row.id);
      this.sql.exec('DELETE FROM message_reports WHERE message_id=?', row.id);
    }
    return { id: Number(row.id), reported: true, removed };
  }

  rows(query, ...bindings) { return this.sql.exec(query, ...bindings).toArray(); }

  isParticipant(eventId, playerId) {
    return this.rows('SELECT 1 FROM participants WHERE event_id=? AND player_id=?', eventId, playerId).length > 0;
  }

  // Oricine vede numărul. Numele participanților se văd doar cu un cont.
  event(eventId, player) {
    checkEvent(eventId);
    const count = Number(this.rows('SELECT COUNT(*) AS n FROM participants WHERE event_id=?', eventId)[0]?.n || 0);
    const joined = !!player && this.isParticipant(eventId, player.id);
    const people = player
      ? this.rows('SELECT player_id, name FROM participants WHERE event_id=? ORDER BY joined_at LIMIT 40', eventId)
        .map((row) => ({ name: row.name, me: row.player_id === player.id }))
      : [];
    return { eventId, count, joined, participants: people };
  }

  counts(ids) {
    const valid = [...new Set(ids)].filter((id) => EVENT_ID.test(id)).slice(0, 60);
    if (!valid.length) return {};
    const marks = valid.map(() => '?').join(',');
    const out = {};
    for (const row of this.rows(`SELECT event_id, COUNT(*) AS n FROM participants WHERE event_id IN (${marks}) GROUP BY event_id`, ...valid)) {
      out[row.event_id] = Number(row.n);
    }
    return out;
  }

  join(eventId, player) {
    checkEvent(eventId);
    const me = checkPlayer(player);
    this.sql.exec(`INSERT INTO participants(event_id, player_id, name, joined_at) VALUES(?,?,?,?)
      ON CONFLICT(event_id, player_id) DO UPDATE SET name=excluded.name`, eventId, me.id, me.name, Date.now());
    return this.event(eventId, me);
  }

  leave(eventId, player) {
    checkEvent(eventId);
    const me = checkPlayer(player);
    this.sql.exec('DELETE FROM participants WHERE event_id=? AND player_id=?', eventId, me.id);
    return this.event(eventId, me);
  }

  messages(eventId, player, after = 0) {
    checkEvent(eventId);
    const me = checkPlayer(player);
    if (!this.isParticipant(eventId, me.id)) throw new ChatError('NOT_PARTICIPANT', 403);
    const since = Number.isSafeInteger(Number(after)) && Number(after) > 0 ? Number(after) : 0;
    const list = since
      ? this.rows('SELECT id, player_id, name, body, created_at FROM messages WHERE event_id=? AND id>? ORDER BY id LIMIT ?', eventId, since, PAGE)
      : this.rows('SELECT * FROM (SELECT id, player_id, name, body, created_at FROM messages WHERE event_id=? ORDER BY id DESC LIMIT ?) ORDER BY id', eventId, PAGE);
    return {
      eventId,
      messages: list.map((row) => ({ id: Number(row.id), name: row.name, body: row.body, time: Number(row.created_at), mine: row.player_id === me.id })),
    };
  }

  send(eventId, player, text) {
    checkEvent(eventId);
    const me = checkPlayer(player);
    if (!this.isParticipant(eventId, me.id)) throw new ChatError('NOT_PARTICIPANT', 403);
    const body = cleanText(text, MAX_MESSAGE);
    if (!body) throw new ChatError('EMPTY_MESSAGE');
    const now = Date.now();
    this.sql.exec('UPDATE participants SET name=? WHERE player_id=?', me.name, me.id);
    this.sql.exec('INSERT INTO messages(event_id, player_id, name, body, created_at) VALUES(?,?,?,?,?)', eventId, me.id, me.name, body, now);
    const id = Number(this.rows('SELECT MAX(id) AS id FROM messages WHERE event_id=?', eventId)[0].id);
    this.sql.exec('DELETE FROM messages WHERE event_id=? AND id<=?', eventId, id - KEEP_MESSAGES);
    return { id, name: me.name, body, time: now, mine: true };
  }

  rooms(player) {
    const me = checkPlayer(player);
    return this.rows(`SELECT p.event_id, p.joined_at,
        (SELECT COUNT(*) FROM participants c WHERE c.event_id=p.event_id) AS count,
        m.name AS last_name, m.body AS last_body, m.created_at AS last_time, m.player_id AS last_player
      FROM participants p
      LEFT JOIN messages m ON m.id=(SELECT MAX(id) FROM messages WHERE event_id=p.event_id)
      WHERE p.player_id=? ORDER BY COALESCE(m.created_at, p.joined_at) DESC, m.id DESC LIMIT 50`, me.id)
      .map((row) => ({
        eventId: row.event_id, count: Number(row.count),
        last: row.last_body ? { name: row.last_name, body: row.last_body, time: Number(row.last_time), mine: row.last_player === me.id } : null,
      }));
  }
}
