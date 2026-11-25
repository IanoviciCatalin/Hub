// Vederi și acțiuni de moderare pentru panoul admin. Worker-ul verifică rolul de admin înainte de apel.
import { ChatError } from './unipulse-chat.mjs';

const STATUSES = ['visible', 'hidden', 'deleted'];

export class UniPulseAdmin {
  constructor(sql) { this.sql = sql; }
  rows(query, ...bindings) { return this.sql.exec(query, ...bindings).toArray(); }
  count(query, ...bindings) { return Number(this.rows(query, ...bindings)[0]?.n || 0); }

  stats(now = Date.now()) {
    return {
      events: this.count(`SELECT COUNT(*) AS n FROM community_events WHERE status='visible' AND end_at>?`, now),
      hiddenEvents: this.count(`SELECT COUNT(*) AS n FROM community_events WHERE status='hidden'`),
      teams: this.count(`SELECT COUNT(*) AS n FROM team_posts WHERE status='visible'`),
      participations: this.count('SELECT COUNT(*) AS n FROM participants'),
      messages: this.count('SELECT COUNT(*) AS n FROM messages'),
      reportedMessages: this.count('SELECT COUNT(DISTINCT message_id) AS n FROM message_reports'),
    };
  }

  events() {
    return this.rows(`SELECT e.*, (SELECT COUNT(*) FROM event_reports r WHERE r.event_id=e.id) AS reports
      FROM community_events e ORDER BY e.created_at DESC LIMIT 300`).map((row) => ({
      id: row.id, title: JSON.parse(row.data).title, city: row.city, owner: row.owner_name, ownerId: row.owner_id,
      startAt: Number(row.start_at), createdAt: Number(row.created_at), status: row.status, reports: Number(row.reports),
    }));
  }

  teams() {
    return this.rows(`SELECT t.*, (SELECT COUNT(*) FROM team_reports r WHERE r.team_id=t.id) AS reports,
        (SELECT COUNT(*) FROM team_members m WHERE m.team_id=t.id) AS members
      FROM team_posts t ORDER BY t.created_at DESC LIMIT 300`).map((row) => ({
      id: row.id, eventId: row.event_id, city: row.city, owner: row.owner_name, ownerId: row.owner_id,
      message: JSON.parse(row.data).message, members: Number(row.members), createdAt: Number(row.created_at),
      status: row.status, reports: Number(row.reports),
    }));
  }

  reportedMessages() {
    return this.rows(`SELECT m.id, m.event_id, m.name, m.body, m.created_at, COUNT(r.player_id) AS reports
      FROM message_reports r JOIN messages m ON m.id=r.message_id GROUP BY m.id ORDER BY reports DESC, m.id DESC LIMIT 200`)
      .map((row) => ({ id: Number(row.id), eventId: row.event_id, author: row.name, body: row.body, time: Number(row.created_at), reports: Number(row.reports) }));
  }

  setStatus(kind, id, status) {
    if (!STATUSES.includes(status)) throw new ChatError('INVALID_STATUS');
    const table = kind === 'event' ? 'community_events' : kind === 'team' ? 'team_posts' : null;
    if (!table) throw new ChatError('INVALID_KIND');
    if (!this.rows(`SELECT 1 FROM ${table} WHERE id=?`, String(id)).length) throw new ChatError('NOT_FOUND', 404);
    this.sql.exec(`UPDATE ${table} SET status=? WHERE id=?`, status, String(id));
    // Restabilirea pornește de la zero raportările vechi.
    if (status === 'visible') this.sql.exec(`DELETE FROM ${kind === 'event' ? 'event_reports WHERE event_id' : 'team_reports WHERE team_id'}=?`, String(id));
    return { id, status };
  }

  deleteMessage(id) {
    this.sql.exec('DELETE FROM messages WHERE id=?', Number(id));
    this.sql.exec('DELETE FROM message_reports WHERE message_id=?', Number(id));
    return { id: Number(id), removed: true };
  }

  dismissReports(id) {
    this.sql.exec('DELETE FROM message_reports WHERE message_id=?', Number(id));
    return { id: Number(id), dismissed: true };
  }
}
