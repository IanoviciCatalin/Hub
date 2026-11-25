// Datele personale UniPulse ale unui cont, păstrate în Cloudflare și sincronizate pe dispozitive.
import { ChatError } from './unipulse-chat.mjs';

// Cheie → dimensiune maximă în octeți (JSON).
export const SYNC_KEYS = { profile: 4096, saved: 8192, orar: 32768, parity: 256 };

export class UniPulseSync {
  constructor(sql) {
    this.sql = sql;
    sql.exec(`CREATE TABLE IF NOT EXISTS user_data(
      player_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, updated_at INTEGER NOT NULL,
      PRIMARY KEY(player_id, key))`);
  }

  get(playerId) {
    if (!playerId) throw new ChatError('PLAYER_REQUIRED', 401);
    const out = {};
    for (const row of this.sql.exec('SELECT key, value, updated_at FROM user_data WHERE player_id=?', playerId).toArray()) {
      try { out[row.key] = { value: JSON.parse(row.value), updatedAt: Number(row.updated_at) }; } catch { /* rând corupt ignorat */ }
    }
    return out;
  }

  set(playerId, key, value, now = Date.now()) {
    if (!playerId) throw new ChatError('PLAYER_REQUIRED', 401);
    if (!Object.hasOwn(SYNC_KEYS, key)) throw new ChatError('INVALID_SYNC_KEY');
    const text = JSON.stringify(value ?? null);
    if (new TextEncoder().encode(text).length > SYNC_KEYS[key]) throw new ChatError('SYNC_TOO_LARGE');
    if (key === 'saved' && (!Array.isArray(value) || value.some((id) => typeof id !== 'string' || id.length > 80))) throw new ChatError('INVALID_SYNC_VALUE');
    if (key === 'orar' && !Array.isArray(value)) throw new ChatError('INVALID_SYNC_VALUE');
    this.sql.exec(`INSERT INTO user_data(player_id, key, value, updated_at) VALUES(?,?,?,?)
      ON CONFLICT(player_id, key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`, playerId, key, text, now);
    return { key, updatedAt: now };
  }
}
