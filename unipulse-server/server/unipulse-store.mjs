// Toate datele UniPulse din Durable Object (SQLite): participări, mesaje, evenimentele comunității,
// echipe, date sincronizate și moderare. Conturile și parolele sunt în D1 (unipulse-accounts.mjs).
// Fiecare metodă întoarce { ok } sau { error, status }, pentru că RPC nu păstrează clasa erorii.
import { UniPulseChat, ChatError } from './unipulse-chat.mjs';
import { UniPulseEvents } from './unipulse-events.mjs';
import { UniPulseTeams } from './unipulse-teams.mjs';
import { UniPulseSync } from './unipulse-sync.mjs';
import { UniPulseAdmin } from './unipulse-admin.mjs';

export class UniPulseStore {
  constructor(sql) {
    this.chat = new UniPulseChat(sql);
    this.events = new UniPulseEvents(sql);
    this.teams = new UniPulseTeams(sql);
    this.sync = new UniPulseSync(sql);
    this.admin = new UniPulseAdmin(sql);
  }
  run(fn) {
    try { return { ok: fn() }; }
    catch (error) {
      if (error instanceof ChatError) return { error: error.message, status: error.status };
      throw error;
    }
  }
  // Un eveniment al comunității șters sau ascuns nu mai primește participanți ori mesaje.
  open(id) { if (!this.events.isOpen(id)) throw new ChatError('EVENT_NOT_FOUND', 404); }

  event(id, player) { return this.run(() => this.chat.event(id, player)); }
  counts(ids) { return this.run(() => this.chat.counts(ids)); }
  join(id, player) { return this.run(() => { this.open(id); return this.chat.join(id, player); }); }
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

  adminOverview() { return this.run(() => ({ stats: this.admin.stats(), events: this.admin.events(), teams: this.admin.teams(), messages: this.admin.reportedMessages() })); }
  adminSetStatus(kind, id, status) { return this.run(() => this.admin.setStatus(kind, id, status)); }
  adminDeleteMessage(id) { return this.run(() => this.admin.deleteMessage(id)); }
  adminDismissMessage(id) { return this.run(() => this.admin.dismissReports(id)); }
}

// Metodele expuse prin RPC de Durable Object.
export const STORE_METHODS = Object.getOwnPropertyNames(UniPulseStore.prototype)
  .filter((name) => !['constructor', 'run', 'open'].includes(name));
