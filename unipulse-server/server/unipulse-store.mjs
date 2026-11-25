// Toate datele UniPulse din Durable Object (SQLite): participări, mesaje, evenimentele comunității,
// echipe, date sincronizate și moderare. Conturile și parolele sunt în D1 (unipulse-accounts.mjs).
// Fiecare metodă întoarce { ok } sau { error, status }, pentru că RPC nu păstrează clasa erorii.
import { UniPulseChat, ChatError } from './unipulse-chat.mjs';
import { UniPulseEvents } from './unipulse-events.mjs';
import { UniPulseTeams } from './unipulse-teams.mjs';
import { UniPulseSync } from './unipulse-sync.mjs';
import { UniPulseAdmin } from './unipulse-admin.mjs';
import { UniPulseCatalog } from './unipulse-catalog.mjs';

export class UniPulseStore {
  // transaction(fn): în Durable Object este ctx.storage.transactionSync, ca importurile să fie „totul sau nimic”.
  constructor(sql, { transaction } = {}) {
    this.chat = new UniPulseChat(sql);
    this.events = new UniPulseEvents(sql);
    this.teams = new UniPulseTeams(sql);
    this.sync = new UniPulseSync(sql);
    this.admin = new UniPulseAdmin(sql);
    this.catalog = new UniPulseCatalog(sql, { transaction });
  }
  run(fn) {
    try { return { ok: fn() }; }
    catch (error) {
      if (error instanceof ChatError) return { error: error.message, status: error.status };
      throw error;
    }
  }
  // Un eveniment al comunității șters sau ascuns nu mai primește participanți ori mesaje.
  // Evenimentele importate (x-…) primesc participanți doar cât sunt publicate, neanulate și neîncheiate;
  // discuția rămâne deschisă și după anulare sau arhivare, ca participanții să poată vorbi.
  open(id, forJoin = false) {
    const key = String(id);
    if (key.startsWith('x-')) {
      if (!(forJoin ? this.catalog.joinable(key) : this.catalog.known(key))) throw new ChatError('EVENT_NOT_FOUND', 404);
      return;
    }
    if (!this.events.isOpen(id)) throw new ChatError('EVENT_NOT_FOUND', 404);
  }

  event(id, player) { return this.run(() => this.chat.event(id, player)); }
  counts(ids) { return this.run(() => this.chat.counts(ids)); }
  join(id, player) { return this.run(() => { this.open(id, true); return this.chat.join(id, player); }); }
  leave(id, player) { return this.run(() => this.chat.leave(id, player)); }
  messages(id, player, after) { return this.run(() => this.chat.messages(id, player, after)); }
  send(id, player, text) { return this.run(() => { this.open(id); return this.chat.send(id, player, text); }); }
  rooms(player) { return this.run(() => this.chat.rooms(player)); }
  deleteMessage(id, player, messageId) { return this.run(() => this.chat.deleteMessage(id, player, messageId)); }
  reportMessage(id, player, messageId) { return this.run(() => this.chat.reportMessage(id, player, messageId)); }

  listEvents(city, player) { return this.run(() => this.events.list(city, player)); }
  createEvent(data, player) { return this.run(() => this.events.create(data, player)); }
  removeEvent(id, player) { return this.run(() => this.events.remove(id, player)); }
  reportEvent(id, player) { return this.run(() => this.events.report(id, player)); }

  listTeams(city, player) { return this.run(() => this.teams.list(city, player)); }
  createTeam(data, player) { return this.run(() => this.teams.create(data, player)); }
  joinTeam(id, player) { return this.run(() => this.teams.join(id, player)); }
  leaveTeam(id, player) { return this.run(() => this.teams.leave(id, player)); }
  removeTeam(id, player) { return this.run(() => this.teams.remove(id, player)); }
  reportTeam(id, player) { return this.run(() => this.teams.report(id, player)); }

  getSync(playerId) { return this.run(() => this.sync.get(playerId)); }
  setSync(playerId, key, value) { return this.run(() => this.sync.set(playerId, key, value)); }

  // Catalogul importat automat (vezi unipulse-catalog.mjs și ingest/).
  catalogList(city) { return this.run(() => this.catalog.list(city)); }
  importSource(id, defs) { return this.run(() => { this.catalog.ensureSources(defs); return { ...this.catalog.source(id), manualRunAllowed: this.catalog.canRunManually(id) }; }); }
  importCommit(sourceId, items, opts) { return this.run(() => this.catalog.commit(sourceId, items, opts)); }
  importFailure(sourceId, job, error, opts) { return this.run(() => this.catalog.recordFailure(sourceId, job, error, opts)); }
  importMaintenance() { return this.run(() => this.catalog.maintenance()); }
  importOverview(defs) { return this.run(() => this.catalog.overview(defs)); }
  importSetSource(id, opts) { return this.run(() => this.catalog.setSource(id, opts)); }
  importDecide(queueId, action, admin) { return this.run(() => this.catalog.decide(queueId, action, admin)); }
  importSetPublish(eventId, state) { return this.run(() => this.catalog.setPublish(eventId, state)); }

  adminOverview() { return this.run(() => ({ stats: this.admin.stats(), events: this.admin.events(), teams: this.admin.teams(), messages: this.admin.reportedMessages() })); }
  adminSetStatus(kind, id, status) { return this.run(() => this.admin.setStatus(kind, id, status)); }
  adminDeleteMessage(id) { return this.run(() => this.admin.deleteMessage(id)); }
  adminDismissMessage(id) { return this.run(() => this.admin.dismissReports(id)); }
}

// Metodele expuse prin RPC de Durable Object.
export const STORE_METHODS = Object.getOwnPropertyNames(UniPulseStore.prototype)
  .filter((name) => !['constructor', 'run', 'open'].includes(name));
