// Catalogul de evenimente importate automat din surse externe (Durable Object SQLite).
// Tabelele sunt separate de datele utilizatorilor: importul nu atinge participants, messages sau team_posts.
import { ChatError } from './unipulse-chat.mjs';
import { CITY_BOUNDS } from './unipulse-events.mjs';
import { bestMatch, MATCH } from './ingest/dedup.mjs';
import { catalogId, publicView } from './ingest/pipeline.mjs';

const HOUR = 3600000, DAY = 24 * HOUR;
export const CATALOG_LIMITS = {
  archiveAfter: 6 * HOUR,      // un eveniment încheiat dispare din catalog după 6 ore
  purgeAfter: 30 * DAY,        // arhiva fără date ale utilizatorilor se șterge după 30 de zile
  missesToFlag: 3,             // lipsă din feed de 3 ori la rând → revizuire (niciodată ștergere automată)
  failuresToDegrade: 3,
  manualRunGap: 10 * 60000,
  runsKept: 500,
};
// Câmpurile importante păstrate în istoric.
const TRACKED = ['title', 'start_at', 'end_at', 'location_name', 'address', 'latitude', 'longitude', 'price_min', 'event_status', 'description_short', 'primary_url'];
const REVIEW_ACTIONS = {
  new: ['approve', 'reject'],
  invalid: ['dismiss'],
  possible_duplicate: ['link', 'separate', 'reject'],
  removed: ['hide', 'keep'],
};

const fail = (code, status = 400) => { throw new ChatError(code, status); };

export class UniPulseCatalog {
  constructor(sql, { transaction } = {}) {
    this.sql = sql;
    this.transaction = transaction || ((fn) => fn());
    sql.exec(`CREATE TABLE IF NOT EXISTS ingest_sources(
      id TEXT PRIMARY KEY, name TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1,
      publish_mode TEXT NOT NULL DEFAULT 'review', state TEXT NOT NULL DEFAULT 'ok',
      failures INTEGER NOT NULL DEFAULT 0, last_run_at INTEGER, last_success_at INTEGER, last_error TEXT)`);
    sql.exec(`CREATE TABLE IF NOT EXISTS catalog_events(
      event_id TEXT PRIMARY KEY, source_id TEXT NOT NULL, external_id TEXT NOT NULL, source_name TEXT NOT NULL,
      title TEXT NOT NULL, description_short TEXT, category TEXT NOT NULL, tags TEXT NOT NULL DEFAULT '[]',
      city TEXT NOT NULL, start_at INTEGER NOT NULL, end_at INTEGER NOT NULL, end_known INTEGER NOT NULL DEFAULT 0,
      date_only INTEGER NOT NULL DEFAULT 0, location_name TEXT, address TEXT, venue_key TEXT,
      latitude REAL, longitude REAL, geo_source TEXT, organizer TEXT, price_min REAL, price_info TEXT,
      image_url TEXT, attendance TEXT NOT NULL DEFAULT 'offline', event_status TEXT NOT NULL DEFAULT 'scheduled',
      publish_state TEXT NOT NULL DEFAULT 'pending_review', primary_url TEXT NOT NULL,
      created_at INTEGER NOT NULL, last_checked INTEGER NOT NULL, last_updated INTEGER NOT NULL, archived_at INTEGER)`);
    sql.exec('CREATE INDEX IF NOT EXISTS catalog_events_city ON catalog_events(city, publish_state, end_at)');
    sql.exec('CREATE INDEX IF NOT EXISTS catalog_events_start ON catalog_events(city, start_at)');
    // Fiecare apariție într-o sursă (o sursă poate confirma un eveniment găsit în alta).
    sql.exec(`CREATE TABLE IF NOT EXISTS source_records(
      source_id TEXT NOT NULL, external_id TEXT NOT NULL, event_id TEXT, source_url TEXT,
      raw_hash TEXT NOT NULL, data TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'active',
      match_score REAL, match_rule TEXT, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL,
      last_checked INTEGER NOT NULL, miss_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(source_id, external_id))`);
    sql.exec('CREATE INDEX IF NOT EXISTS source_records_event ON source_records(event_id)');
    sql.exec(`CREATE TABLE IF NOT EXISTS event_changes(
      id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT NOT NULL, field TEXT NOT NULL,
      old_value TEXT, new_value TEXT, source_id TEXT, run_id INTEGER, at INTEGER NOT NULL)`);
    sql.exec('CREATE INDEX IF NOT EXISTS event_changes_event ON event_changes(event_id, id)');
    sql.exec(`CREATE TABLE IF NOT EXISTS review_queue(
      id INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT NOT NULL, source_id TEXT NOT NULL, external_id TEXT NOT NULL,
      event_id TEXT, match_event_id TEXT, match_score REAL, candidate TEXT, reason TEXT,
      state TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL, decided_at INTEGER, decided_by TEXT, decision TEXT)`);
    sql.exec('CREATE INDEX IF NOT EXISTS review_queue_open ON review_queue(state, created_at)');
    sql.exec(`CREATE TABLE IF NOT EXISTS sync_runs(
      id INTEGER PRIMARY KEY AUTOINCREMENT, source_id TEXT NOT NULL, job TEXT NOT NULL, dry_run INTEGER NOT NULL DEFAULT 0,
      started_at INTEGER NOT NULL, finished_at INTEGER, status TEXT NOT NULL,
      fetched INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL DEFAULT 0,
      unchanged INTEGER NOT NULL DEFAULT 0, linked INTEGER NOT NULL DEFAULT 0, queued INTEGER NOT NULL DEFAULT 0,
      rejected INTEGER NOT NULL DEFAULT 0, skipped INTEGER NOT NULL DEFAULT 0, missing INTEGER NOT NULL DEFAULT 0, error TEXT)`);
  }

  rows(query, ...bindings) { return this.sql.exec(query, ...bindings).toArray(); }
  one(query, ...bindings) { return this.rows(query, ...bindings)[0] || null; }

  // ---------- Surse ----------
  ensureSources(defs) {
    for (const d of defs) this.sql.exec('INSERT OR IGNORE INTO ingest_sources(id, name) VALUES(?, ?)', d.id, d.name);
  }
  source(id) { return this.one('SELECT * FROM ingest_sources WHERE id=?', String(id)); }
  setSource(id, { enabled, publishMode } = {}) {
    if (!this.source(id)) fail('SOURCE_NOT_FOUND', 404);
    if (enabled !== undefined) {
      this.sql.exec(`UPDATE ingest_sources SET enabled=?, state=CASE WHEN ? THEN 'ok' ELSE state END, failures=CASE WHEN ? THEN 0 ELSE failures END WHERE id=?`,
        enabled ? 1 : 0, enabled ? 1 : 0, enabled ? 1 : 0, id);
    }
    if (publishMode !== undefined) {
      if (!['review', 'auto'].includes(publishMode)) fail('INVALID_MODE');
      this.sql.exec('UPDATE ingest_sources SET publish_mode=? WHERE id=?', publishMode, id);
    }
    return this.source(id);
  }
  // Rulări manuale: cel mult una la 10 minute per sursă.
  canRunManually(id, now = Date.now()) {
    const last = this.one(`SELECT started_at FROM sync_runs WHERE source_id=? AND job='manual' ORDER BY id DESC LIMIT 1`, id);
    return !last || now - Number(last.started_at) >= CATALOG_LIMITS.manualRunGap;
  }

  // ---------- Rulări ----------
  // O rulare eșuată nu schimbă catalogul. Erorile repetate marchează sursa „degraded”;
  // o blocare (401/403) dezactivează sursa până o reactivează adminul.
  recordFailure(sourceId, job, error, { dryRun = false, now = Date.now() } = {}) {
    const code = String(error?.code || 'ERROR').slice(0, 40), detail = String(error?.detail || '').slice(0, 200);
    const runId = this.insertRun(sourceId, job, dryRun, now, 'error', { error: `${code} ${detail}`.trim() });
    if (dryRun) return { runId, status: 'error', error: code };
    const source = this.source(sourceId);
    const failures = Number(source?.failures || 0) + 1;
    const state = code === 'BLOCKED' ? 'blocked' : failures >= CATALOG_LIMITS.failuresToDegrade ? 'degraded' : source?.state || 'ok';
    this.sql.exec('UPDATE ingest_sources SET failures=?, state=?, last_run_at=?, last_error=?, enabled=CASE WHEN ?=\'blocked\' THEN 0 ELSE enabled END WHERE id=?',
      failures, state, now, `${code} ${detail}`.trim(), state, sourceId);
    return { runId, status: 'error', error: code };
  }

  insertRun(sourceId, job, dryRun, now, status, counts = {}) {
    this.sql.exec(`INSERT INTO sync_runs(source_id, job, dry_run, started_at, finished_at, status, fetched, created, updated, unchanged, linked, queued, rejected, skipped, missing, error)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, sourceId, job, dryRun ? 1 : 0, counts.startedAt || now, now, status,
    counts.fetched || 0, counts.created || 0, counts.updated || 0, counts.unchanged || 0, counts.linked || 0,
    counts.queued || 0, counts.rejected || 0, counts.skipped || 0, counts.missing || 0, counts.error || null);
    const id = Number(this.one('SELECT last_insert_rowid() AS id').id);
    this.sql.exec('DELETE FROM sync_runs WHERE id <= ?', id - CATALOG_LIMITS.runsKept);
    return id;
  }

  // Scrie rezultatul unei rulări reușite într-o singură tranzacție: totul sau nimic.
  // items = [{ event, problems, past, hash }] din pipeline.prepare. dryRun = calculează fără să scrie.
  commit(sourceId, items, { job = 'discover', dryRun = false, fullFeed = false, now = Date.now(), startedAt = now } = {}) {
    const source = this.source(sourceId);
    if (!source) fail('SOURCE_NOT_FOUND', 404);
    const counts = { fetched: items.length, created: 0, updated: 0, unchanged: 0, linked: 0, queued: 0, rejected: 0, skipped: 0, missing: 0, startedAt };
    const plan = [];
    const write = () => {
      const seen = new Set();
      for (const item of items) {
        const { event } = item;
        if (!event.externalId) { counts.rejected += 1; continue; }
        seen.add(event.externalId);
        if (item.past) { counts.skipped += 1; continue; }
        const record = this.one('SELECT * FROM source_records WHERE source_id=? AND external_id=?', sourceId, event.externalId);
        if (item.problems.length) {
          counts.rejected += 1;
          plan.push({ action: 'invalid', externalId: event.externalId, problems: item.problems });
          if (!dryRun) {
            this.upsertRecord(sourceId, event, item.hash, record, { state: 'invalid', now });
            this.queue('invalid', sourceId, event, { reason: item.problems.join(', '), eventId: record?.event_id, now });
          }
          continue;
        }
        if (record?.event_id && this.one('SELECT 1 FROM catalog_events WHERE event_id=?', record.event_id)) {
          if (record.raw_hash === item.hash && record.state === 'active') {
            counts.unchanged += 1;
            if (!dryRun) this.sql.exec('UPDATE source_records SET last_seen=?, last_checked=?, miss_count=0 WHERE source_id=? AND external_id=?', now, now, sourceId, event.externalId);
            if (!dryRun) this.sql.exec('UPDATE catalog_events SET last_checked=? WHERE event_id=? AND source_id=?', now, record.event_id, sourceId);
            continue;
          }
          const changed = dryRun ? [] : this.applyUpdate(record.event_id, sourceId, event, now);
          if (!dryRun) this.upsertRecord(sourceId, event, item.hash, record, { state: 'active', now });
          counts.updated += 1;
          plan.push({ action: 'update', eventId: record.event_id, changed });
          continue;
        }
        if (record && record.state === 'pending' && !dryRun) {
          // Încă în coada de revizuire: actualizăm doar propunerea.
          this.upsertRecord(sourceId, event, item.hash, record, { state: 'pending', now });
          this.sql.exec(`UPDATE review_queue SET candidate=? WHERE source_id=? AND external_id=? AND state='open'`, JSON.stringify(event), sourceId, event.externalId);
          counts.unchanged += 1;
          continue;
        }
        if (record && record.state === 'rejected') { counts.skipped += 1; continue; }
        // Eveniment nou pentru această sursă: căutăm același eveniment publicat de alte surse.
        const match = bestMatch(event, this.candidates(event, sourceId));
        if (match && match.score >= MATCH.sure) {
          counts.linked += 1;
          plan.push({ action: 'link', eventId: match.event.eventId, score: match.score, rule: match.rule });
          if (!dryRun) {
            this.upsertRecord(sourceId, event, item.hash, record, { state: 'active', eventId: match.event.eventId, score: match.score, rule: match.rule, now });
            this.fillMissing(match.event.eventId, event, now);
          }
        } else if (match && match.score >= MATCH.maybe) {
          counts.queued += 1;
          plan.push({ action: 'possible_duplicate', externalId: event.externalId, eventId: match.event.eventId, score: match.score });
          if (!dryRun) {
            this.upsertRecord(sourceId, event, item.hash, record, { state: 'pending', score: match.score, rule: match.rule, now });
            this.queue('possible_duplicate', sourceId, event, { matchEventId: match.event.eventId, score: match.score, reason: 'Asemănare ' + Math.round(match.score * 100) + '%', now });
          }
        } else {
          const eventId = catalogId(sourceId, event.externalId);
          const publish = source.publish_mode === 'auto' ? 'published' : 'pending_review';
          counts.created += 1;
          if (publish === 'pending_review') counts.queued += 1;
          plan.push({ action: 'create', eventId, publish });
          if (!dryRun) {
            this.insertEvent(eventId, event, publish, now);
            this.upsertRecord(sourceId, event, item.hash, record, { state: 'active', eventId, score: 1, rule: 'origin', now });
            if (publish === 'pending_review') this.queue('new', sourceId, event, { eventId, now });
          }
        }
      }
      // Ce lipsește din feed. Un feed gol nu e luat drept „toate au dispărut”.
      if (fullFeed && items.length) {
        const absent = this.rows(`SELECT r.external_id, r.event_id, r.miss_count FROM source_records r JOIN catalog_events e ON e.event_id=r.event_id
          WHERE r.source_id=? AND r.state='active' AND e.source_id=r.source_id AND e.start_at>? AND e.publish_state IN ('published','pending_review')`, sourceId, now)
          .filter((r) => !seen.has(r.external_id));
        for (const r of absent) {
          const misses = Number(r.miss_count) + 1;
          counts.missing += 1;
          if (dryRun) continue;
          this.sql.exec('UPDATE source_records SET miss_count=?, last_checked=? WHERE source_id=? AND external_id=?', misses, now, sourceId, r.external_id);
          if (misses === CATALOG_LIMITS.missesToFlag) {
            const row = this.one('SELECT * FROM catalog_events WHERE event_id=?', r.event_id);
            this.queue('removed', sourceId, { externalId: r.external_id, title: row?.title, url: row?.primary_url }, { eventId: r.event_id, reason: `Lipsește din feed de ${misses} ori la rând`, now });
            plan.push({ action: 'flag_removed', eventId: r.event_id });
          }
        }
      }
      if (!dryRun) {
        this.sql.exec('UPDATE ingest_sources SET failures=0, state=\'ok\', last_run_at=?, last_success_at=?, last_error=NULL WHERE id=?', now, now, sourceId);
      }
      return this.insertRun(sourceId, job, dryRun, now, 'ok', counts);
    };
    const runId = dryRun ? write() : this.transaction(write);
    return { runId, counts: Object.fromEntries(Object.entries(counts).filter(([k]) => k !== 'startedAt')), plan: plan.slice(0, 100) };
  }

  // Candidați pentru duplicate: alte surse, același oraș, aceeași perioadă, nerespinși.
  candidates(event, sourceId) {
    return this.rows(`SELECT * FROM catalog_events WHERE city=? AND source_id<>? AND start_at BETWEEN ? AND ? AND publish_state<>'rejected'`,
      event.city, sourceId, event.startAt - MATCH.window, event.startAt + MATCH.window)
      .map((r) => ({ eventId: r.event_id, city: r.city, title: r.title, url: r.primary_url, startAt: Number(r.start_at), dateOnly: !!r.date_only,
        lat: r.latitude, lng: r.longitude, venueKey: r.venue_key, locationName: r.location_name, organizer: r.organizer }));
  }

  upsertRecord(sourceId, event, hash, record, { state, eventId = record?.event_id ?? null, score = record?.match_score ?? null, rule = record?.match_rule ?? null, now }) {
    this.sql.exec(`INSERT INTO source_records(source_id, external_id, event_id, source_url, raw_hash, data, state, match_score, match_rule, first_seen, last_seen, last_checked, miss_count)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,0)
      ON CONFLICT(source_id, external_id) DO UPDATE SET event_id=excluded.event_id, source_url=excluded.source_url, raw_hash=excluded.raw_hash,
        data=excluded.data, state=excluded.state, match_score=excluded.match_score, match_rule=excluded.match_rule,
        last_seen=excluded.last_seen, last_checked=excluded.last_checked, miss_count=0`,
    sourceId, event.externalId, eventId, event.url || null, hash, JSON.stringify(event), state, score, rule, now, now, now);
  }

  insertEvent(eventId, e, publishState, now) {
    this.sql.exec(`INSERT INTO catalog_events(event_id, source_id, external_id, source_name, title, description_short, category, tags, city,
      start_at, end_at, end_known, date_only, location_name, address, venue_key, latitude, longitude, geo_source, organizer, price_min, price_info,
      image_url, attendance, event_status, publish_state, primary_url, created_at, last_checked, last_updated)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    eventId, e.sourceId, e.externalId, e.sourceName, e.title, e.description, e.category, JSON.stringify(e.tags || []), e.city,
    e.startAt, e.endAt, e.endKnown ? 1 : 0, e.dateOnly ? 1 : 0, e.locationName, e.address, e.venueKey, e.lat, e.lng, e.geoSource,
    e.organizer, e.price, e.priceInfo ?? null, null, e.attendance, e.status, publishState, e.url, now, now, now);
  }

  // Valorile externe din sursa principală înlocuiesc versiunea veche; schimbările importante intră în istoric.
  applyUpdate(eventId, sourceId, e, now) {
    const row = this.one('SELECT * FROM catalog_events WHERE event_id=?', eventId);
    if (!row) return [];
    if (row.source_id !== sourceId) { this.fillMissing(eventId, e, now); return []; }
    const next = {
      title: e.title, description_short: e.description, category: e.category, tags: JSON.stringify(e.tags || []),
      start_at: e.startAt, end_at: e.endAt, end_known: e.endKnown ? 1 : 0, date_only: e.dateOnly ? 1 : 0,
      location_name: e.locationName, address: e.address, venue_key: e.venueKey, latitude: e.lat, longitude: e.lng, geo_source: e.geoSource,
      organizer: e.organizer, price_min: e.price, price_info: e.priceInfo ?? null, attendance: e.attendance,
      event_status: e.status, primary_url: e.url,
    };
    const changed = Object.keys(next).filter((k) => String(row[k] ?? '') !== String(next[k] ?? ''));
    if (!changed.length) { this.sql.exec('UPDATE catalog_events SET last_checked=? WHERE event_id=?', now, eventId); return []; }
    for (const field of changed.filter((f) => TRACKED.includes(f))) {
      this.sql.exec('INSERT INTO event_changes(event_id, field, old_value, new_value, source_id, at) VALUES(?,?,?,?,?,?)',
        eventId, field, row[field] === null ? null : String(row[field]), next[field] === null ? null : String(next[field]), sourceId, now);
    }
    // Un eveniment reprogramat după arhivare redevine vizibil (cu starea de publicare de dinainte).
    const revive = row.publish_state === 'archived' && e.endAt > now;
    this.sql.exec(`UPDATE catalog_events SET ${changed.map((k) => `${k}=?`).join(', ')}, last_checked=?, last_updated=?${revive ? ', publish_state=\'published\', archived_at=NULL' : ''} WHERE event_id=?`,
      ...changed.map((k) => next[k]), now, now, eventId);
    return changed;
  }

  // O sursă secundară doar completează câmpurile goale.
  fillMissing(eventId, e, now) {
    const row = this.one('SELECT * FROM catalog_events WHERE event_id=?', eventId);
    if (!row) return;
    const extra = { description_short: e.description, organizer: e.organizer, price_min: e.price, price_info: e.priceInfo, address: e.address };
    const fields = Object.keys(extra).filter((k) => (row[k] === null || row[k] === '') && extra[k] !== null && extra[k] !== undefined && extra[k] !== '');
    if (fields.length) this.sql.exec(`UPDATE catalog_events SET ${fields.map((k) => `${k}=?`).join(', ')}, last_updated=? WHERE event_id=?`, ...fields.map((k) => extra[k]), now, eventId);
    this.sql.exec('UPDATE catalog_events SET last_checked=? WHERE event_id=?', now, eventId);
  }

  queue(kind, sourceId, event, { eventId = null, matchEventId = null, score = null, reason = null, now }) {
    const open = this.one(`SELECT id FROM review_queue WHERE kind=? AND source_id=? AND external_id=? AND state='open'`, kind, sourceId, event.externalId);
    if (open) {
      this.sql.exec('UPDATE review_queue SET candidate=?, reason=?, match_event_id=?, match_score=?, event_id=COALESCE(?, event_id) WHERE id=?',
        JSON.stringify(event), reason, matchEventId, score, eventId, open.id);
      return Number(open.id);
    }
    this.sql.exec(`INSERT INTO review_queue(kind, source_id, external_id, event_id, match_event_id, match_score, candidate, reason, created_at)
      VALUES(?,?,?,?,?,?,?,?,?)`, kind, sourceId, event.externalId, eventId, matchEventId, score, JSON.stringify(event), reason, now);
    return Number(this.one('SELECT last_insert_rowid() AS id').id);
  }

  // ---------- Revizuire ----------
  decide(queueId, action, admin = {}, now = Date.now()) {
    const item = this.one('SELECT * FROM review_queue WHERE id=?', Number(queueId));
    if (!item) fail('REVIEW_NOT_FOUND', 404);
    if (item.state !== 'open') fail('REVIEW_CLOSED', 409);
    if (!REVIEW_ACTIONS[item.kind]?.includes(action)) fail('INVALID_ACTION');
    const candidate = JSON.parse(item.candidate || '{}');
    let eventId = item.event_id;
    this.transaction(() => {
      if (item.kind === 'new') {
        this.sql.exec('UPDATE catalog_events SET publish_state=?, last_updated=? WHERE event_id=?', action === 'approve' ? 'published' : 'rejected', now, item.event_id);
      } else if (item.kind === 'possible_duplicate') {
        if (action === 'link') {
          eventId = item.match_event_id;
          this.sql.exec(`UPDATE source_records SET state='active', event_id=?, match_rule='admin' WHERE source_id=? AND external_id=?`, eventId, item.source_id, item.external_id);
          this.fillMissing(eventId, candidate, now);
        } else if (action === 'separate') {
          eventId = catalogId(item.source_id, item.external_id);
          if (!this.one('SELECT 1 FROM catalog_events WHERE event_id=?', eventId)) this.insertEvent(eventId, candidate, 'published', now);
          this.sql.exec(`UPDATE source_records SET state='active', event_id=?, match_rule='admin' WHERE source_id=? AND external_id=?`, eventId, item.source_id, item.external_id);
        } else {
          this.sql.exec(`UPDATE source_records SET state='rejected' WHERE source_id=? AND external_id=?`, item.source_id, item.external_id);
        }
      } else if (item.kind === 'removed') {
        if (action === 'hide') {
          this.sql.exec(`UPDATE catalog_events SET publish_state='hidden', event_status='removed_at_source', last_updated=? WHERE event_id=?`, now, item.event_id);
          this.sql.exec(`UPDATE source_records SET state='removed' WHERE source_id=? AND external_id=?`, item.source_id, item.external_id);
          this.sql.exec('INSERT INTO event_changes(event_id, field, old_value, new_value, source_id, at) VALUES(?,?,?,?,?,?)', item.event_id, 'event_status', null, 'removed_at_source', item.source_id, now);
        } else {
          this.sql.exec('UPDATE source_records SET miss_count=0 WHERE source_id=? AND external_id=?', item.source_id, item.external_id);
        }
      }
      // „invalid” + dismiss: sursa va fi reverificată la rularea următoare.
      this.sql.exec('UPDATE review_queue SET state=\'closed\', decided_at=?, decided_by=?, decision=? WHERE id=?', now, String(admin.email || admin.name || 'admin'), action, item.id);
    });
    return { id: Number(item.id), action, eventId };
  }

  // ---------- Afișare ----------
  // Evenimentele publice ale unui oraș: publicate, neîncheiate. Cele anulate rămân vizibile, marcate.
  list(city, now = Date.now()) {
    if (!Object.hasOwn(CITY_BOUNDS, city)) fail('INVALID_CITY');
    return this.rows(`SELECT * FROM catalog_events WHERE city=? AND publish_state='published' AND end_at>? AND latitude IS NOT NULL
      ORDER BY start_at LIMIT 300`, city, now).map(publicView);
  }

  get(id) { return this.one('SELECT * FROM catalog_events WHERE event_id=?', String(id)); }
  // Participarea: doar la evenimente publicate, neanulate și neîncheiate.
  joinable(id, now = Date.now()) {
    const row = this.get(id);
    return !!row && row.publish_state === 'published' && row.event_status !== 'cancelled' && Number(row.end_at) > now;
  }
  // Discuția rămâne deschisă pentru evenimentele cunoscute (inclusiv anulate sau arhivate), nu pentru cele respinse.
  known(id) {
    const row = this.get(id);
    return !!row && !['rejected', 'pending_review'].includes(row.publish_state);
  }

  // ---------- Întreținere: ștergerea automată după final ----------
  // 1) arhivare: evenimentele încheiate de peste 6 h ies din catalog (nu mai apar nicăieri);
  // 2) curățare: după 30 de zile, arhiva se șterge definitiv DOAR dacă nimeni nu a participat, scris sau făcut echipă.
  //    Altfel rândul rămâne arhivat, ca participările, discuția și echipele să nu se piardă.
  maintenance(now = Date.now()) {
    return this.transaction(() => {
      const cutoff = now - CATALOG_LIMITS.archiveAfter;
      const archived = this.rows(`SELECT event_id FROM catalog_events WHERE end_at<? AND publish_state IN ('published','pending_review','hidden')`, cutoff);
      this.sql.exec(`UPDATE catalog_events SET publish_state='archived', archived_at=? WHERE end_at<? AND publish_state IN ('published','pending_review','hidden')`, now, cutoff);
      this.sql.exec(`UPDATE review_queue SET state='closed', decided_at=?, decided_by='system', decision='expired'
        WHERE state='open' AND event_id IN (SELECT event_id FROM catalog_events WHERE publish_state='archived')`, now);
      const old = this.rows(`SELECT event_id FROM catalog_events WHERE publish_state IN ('archived','rejected') AND end_at<?`, now - CATALOG_LIMITS.purgeAfter)
        .map((r) => r.event_id);
      let purged = 0, kept = 0;
      for (const id of old) {
        if (this.hasUserData(id)) { kept += 1; continue; }
        this.sql.exec('DELETE FROM catalog_events WHERE event_id=?', id);
        this.sql.exec('DELETE FROM event_changes WHERE event_id=?', id);
        this.sql.exec(`UPDATE source_records SET event_id=NULL, state='expired' WHERE event_id=?`, id);
        purged += 1;
      }
      this.sql.exec(`DELETE FROM source_records WHERE state IN ('expired','invalid','rejected') AND last_seen<?`, now - CATALOG_LIMITS.purgeAfter);
      this.sql.exec(`DELETE FROM review_queue WHERE state='closed' AND decided_at<?`, now - CATALOG_LIMITS.purgeAfter);
      return { archived: archived.length, purged, keptWithUserData: kept };
    });
  }

  hasUserData(eventId) {
    const tables = this.rows(`SELECT name FROM sqlite_master WHERE type='table' AND name IN ('participants','messages','team_posts')`).map((r) => r.name);
    return tables.some((t) => this.rows(`SELECT 1 FROM ${t} WHERE event_id=? LIMIT 1`, eventId).length > 0);
  }

  // ---------- Panoul admin ----------
  overview(defs = [], now = Date.now()) {
    this.ensureSources(defs);
    const sources = this.rows('SELECT * FROM ingest_sources ORDER BY id').map((s) => {
      const def = defs.find((d) => d.id === s.id) || {};
      const count = (state) => Number(this.one(`SELECT COUNT(*) AS n FROM catalog_events WHERE source_id=? AND publish_state=?`, s.id, state).n);
      return {
        id: s.id, name: s.name, url: def.url || null, terms: def.terms || null, enabled: !!s.enabled, publishMode: s.publish_mode,
        state: s.state, failures: Number(s.failures), lastRunAt: s.last_run_at, lastSuccessAt: s.last_success_at, lastError: s.last_error,
        published: count('published'), pending: count('pending_review'), rejected: count('rejected'), archived: count('archived'),
        linked: Number(this.one(`SELECT COUNT(*) AS n FROM source_records WHERE source_id=? AND match_rule IN ('url','score','admin')`, s.id).n),
        manualRunAllowed: this.canRunManually(s.id, now),
      };
    });
    const review = this.rows(`SELECT * FROM review_queue WHERE state='open' ORDER BY created_at LIMIT 200`).map((q) => {
      const candidate = JSON.parse(q.candidate || '{}');
      const match = q.match_event_id ? this.get(q.match_event_id) : null;
      return {
        id: Number(q.id), kind: q.kind, sourceId: q.source_id, eventId: q.event_id, reason: q.reason, createdAt: Number(q.created_at),
        actions: REVIEW_ACTIONS[q.kind] || [], score: q.match_score,
        candidate: {
          title: candidate.title, startAt: candidate.startAt, url: candidate.url, locationName: candidate.locationName,
          category: candidate.category, lat: candidate.lat, lng: candidate.lng, status: candidate.status,
        },
        match: match ? { eventId: match.event_id, title: match.title, startAt: Number(match.start_at), url: match.primary_url, source: match.source_name } : null,
      };
    });
    const runs = this.rows('SELECT * FROM sync_runs ORDER BY id DESC LIMIT 30').map((r) => ({
      id: Number(r.id), sourceId: r.source_id, job: r.job, dryRun: !!r.dry_run, startedAt: Number(r.started_at), finishedAt: Number(r.finished_at),
      status: r.status, fetched: r.fetched, created: r.created, updated: r.updated, unchanged: r.unchanged, linked: r.linked,
      queued: r.queued, rejected: r.rejected, skipped: r.skipped, missing: r.missing, error: r.error,
    }));
    const changes = this.rows(`SELECT c.*, e.title FROM event_changes c LEFT JOIN catalog_events e ON e.event_id=c.event_id ORDER BY c.id DESC LIMIT 50`).map((c) => ({
      eventId: c.event_id, title: c.title, field: c.field, oldValue: c.old_value, newValue: c.new_value, at: Number(c.at),
    }));
    const upcoming = this.rows(`SELECT * FROM catalog_events WHERE publish_state IN ('published','hidden') AND end_at>? ORDER BY start_at LIMIT 200`, now).map((r) => ({
      eventId: r.event_id, title: r.title, startAt: Number(r.start_at), source: r.source_name, state: r.publish_state, status: r.event_status,
      url: r.primary_url, lastChecked: Number(r.last_checked),
    }));
    return { sources, review, runs, changes, upcoming };
  }

  // Ascunde / republică un eveniment importat din panoul admin.
  setPublish(eventId, state, now = Date.now()) {
    if (!['published', 'hidden'].includes(state)) fail('INVALID_STATUS');
    const row = this.get(eventId);
    if (!row) fail('NOT_FOUND', 404);
    this.sql.exec('UPDATE catalog_events SET publish_state=?, last_updated=? WHERE event_id=?', state, now, eventId);
    return { eventId, state };
  }
}
