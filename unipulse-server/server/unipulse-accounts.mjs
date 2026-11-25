// Conturi cu email și parolă peste profilul DucaNeseriosul (tabela players din D1).
// - Parola: PBKDF2-SHA256, 100.000 de iterații (maximul acceptat de Workers), sare de 16 octeți.
// - Sesiunea: cookie-ul existent __Host-duca_player. Primul dispozitiv folosește credential_hash
//   din players; celelalte primesc rânduri în player_sessions, recunoscute și de jocuri.
// - Blocare: 5 parole greșite la rând blochează contul 15 minute.
import { ChatError } from './unipulse-chat.mjs';

export const COOKIE = '__Host-duca_player';
const YEAR = 365 * 86400000;
const ITERATIONS = 100000;
export const LOCK = { attempts: 5, minutes: 15 };
const fail = (code, status = 400) => { throw new ChatError(code, status); };
const encoder = new TextEncoder();
const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export async function sha256(text) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(text)))); }

export function cleanEmail(value) {
  const email = String(value ?? '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>()",;]+@[^\s@<>()",;]+\.[a-z]{2,}$/.test(email)) fail('INVALID_EMAIL');
  return email;
}
export function cleanName(value) {
  const name = String(value ?? '').normalize('NFC').replace(/[\p{Cc}\p{Cf}<>]/gu, '').trim().slice(0, 24);
  if (!name) fail('INVALID_NAME');
  return name;
}
export function checkPassword(value) {
  const password = String(value ?? '');
  if (password.length < 8 || password.length > 128) fail('WEAK_PASSWORD');
  if (/^(.)\1+$/.test(password) || /^(12345678|parola123|password|qwertyui)/i.test(password)) fail('WEAK_PASSWORD');
  return password;
}

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return hex(new Uint8Array(bits));
}
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${hex(salt)}$${await pbkdf2(password, salt, ITERATIONS)}`;
}
export async function verifyPassword(password, stored) {
  const [kind, iterations, saltHex, expected] = String(stored).split('$');
  if (kind !== 'pbkdf2' || !saltHex || !expected) return false;
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const actual = await pbkdf2(password, salt, Number(iterations));
  let diff = actual.length ^ expected.length;
  for (let i = 0; i < Math.max(actual.length, expected.length); i++) diff |= (actual.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  return diff === 0;
}

export const sessionCookie = (token) => `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`;
export const clearCookie = () => `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
export function readToken(request) {
  return (request.headers.get('cookie') || '').match(/(?:^|;\s*)__Host-duca_player=([a-f0-9]{64})(?:;|$)/)?.[1] || null;
}

export function parseAdmins(value) {
  return new Set(String(value || '').split(/[,\s]+/).map((e) => e.trim().toLowerCase()).filter(Boolean));
}

export class Accounts {
  constructor(db, { admins = '', now = () => Date.now() } = {}) {
    this.db = db;
    this.admins = parseAdmins(admins);
    this.now = now;
  }
  q(sql, ...args) { return this.db.prepare(sql).bind(...args); }

  // Jucătorul din cookie: credențialul principal sau o sesiune neexpirată.
  async session(token) {
    if (!token) return null;
    const hash = await sha256(token);
    const primary = await this.q('SELECT id, name, created_at FROM players WHERE credential_hash=?', hash).first();
    if (primary) return { player: primary, hash, primary: true };
    const row = await this.q(`SELECT p.id, p.name, p.created_at FROM player_sessions s JOIN players p ON p.id=s.player_id
      WHERE s.token_hash=? AND s.expires_at>?`, hash, this.now()).first();
    return row ? { player: row, hash, primary: false } : null;
  }

  async credentials(playerId) {
    return this.q('SELECT email, created_at, last_login, must_change, disabled FROM player_credentials WHERE player_id=?', playerId).first();
  }

  async account(player) {
    if (!player) return null;
    const cred = await this.credentials(player.id);
    if (cred?.disabled) return null;
    return {
      name: player.name, email: cred?.email || null, hasPassword: !!cred, mustChange: !!cred?.must_change,
      admin: !!cred && this.admins.has(cred.email), createdAt: player.created_at,
    };
  }

  async openSession(playerId) {
    const token = randomToken(), now = this.now();
    await this.q('INSERT INTO player_sessions(token_hash, player_id, created_at, expires_at, last_seen) VALUES(?,?,?,?,?)',
      await sha256(token), playerId, now, now + YEAR, now).run();
    return token;
  }

  // Cont nou. Dacă dispozitivul are deja un profil fără email (de la jocuri), îl păstrăm și îi adăugăm emailul.
  async register({ name, email, password }, current) {
    const cleanMail = cleanEmail(email), cleanPass = checkPassword(password), display = cleanName(name);
    if (await this.q('SELECT 1 FROM player_credentials WHERE email=?', cleanMail).first()) fail('EMAIL_TAKEN', 409);
    const now = this.now();
    let playerId, cookie = null;
    if (current?.player && !(await this.credentials(current.player.id))) {
      playerId = current.player.id;
      await this.q('UPDATE players SET name=? WHERE id=?', display, playerId).run();
    } else {
      const token = randomToken();
      playerId = crypto.randomUUID();
      await this.q('INSERT INTO players(id, credential_hash, name, created_at) VALUES(?,?,?,?)', playerId, await sha256(token), display, now).run();
      cookie = sessionCookie(token);
    }
    await this.q(`INSERT INTO player_credentials(player_id, email, password_hash, created_at, updated_at, last_login)
      VALUES(?,?,?,?,?,?)`, playerId, cleanMail, await hashPassword(cleanPass), now, now, now).run();
    const player = await this.q('SELECT id, name, created_at FROM players WHERE id=?', playerId).first();
    return { account: await this.account(player), cookie };
  }

  async login({ email, password }) {
    const cleanMail = String(email ?? '').trim().toLowerCase();
    const cred = cleanMail && await this.q('SELECT * FROM player_credentials WHERE email=?', cleanMail).first();
    const now = this.now();
    // Același mesaj pentru email inexistent și parolă greșită.
    // Pentru un email inexistent calculăm totuși un hash, ca timpul de răspuns să nu-l dezvăluie.
    if (!cred) { await verifyPassword(String(password ?? ''), `pbkdf2$${ITERATIONS}$${'00'.repeat(16)}$00`); fail('BAD_LOGIN', 401); }
    if (cred.disabled) fail('ACCOUNT_DISABLED', 403);
    if (cred.locked_until > now) fail('ACCOUNT_LOCKED', 429);
    if (!(await verifyPassword(String(password ?? ''), cred.password_hash))) {
      const attempts = cred.failed_attempts + 1;
      const locked = attempts >= LOCK.attempts ? now + LOCK.minutes * 60000 : 0;
      await this.q('UPDATE player_credentials SET failed_attempts=?, locked_until=? WHERE player_id=?', locked ? 0 : attempts, locked, cred.player_id).run();
      fail(locked ? 'ACCOUNT_LOCKED' : 'BAD_LOGIN', locked ? 429 : 401);
    }
    await this.q('UPDATE player_credentials SET failed_attempts=0, locked_until=0, last_login=? WHERE player_id=?', now, cred.player_id).run();
    const token = await this.openSession(cred.player_id);
    const player = await this.q('SELECT id, name, created_at FROM players WHERE id=?', cred.player_id).first();
    return { account: await this.account(player), cookie: sessionCookie(token) };
  }

  // Ieșirea închide doar acest dispozitiv. Profilurile fără email nu pot ieși (s-ar pierde).
  async logout(current) {
    if (!current) return { cookie: clearCookie() };
    if (!(await this.credentials(current.player.id))) fail('NO_PASSWORD');
    if (current.primary) await this.q('UPDATE players SET credential_hash=? WHERE id=?', await sha256(randomToken()), current.player.id).run();
    else await this.q('DELETE FROM player_sessions WHERE token_hash=?', current.hash).run();
    return { cookie: clearCookie() };
  }

  // Schimbarea parolei închide celelalte dispozitive.
  async changePassword(current, { password, newPassword }) {
    if (!current) fail('PLAYER_REQUIRED', 401);
    const cred = await this.q('SELECT * FROM player_credentials WHERE player_id=?', current.player.id).first();
    if (!cred) fail('NO_PASSWORD');
    if (!(await verifyPassword(String(password ?? ''), cred.password_hash))) fail('BAD_PASSWORD', 403);
    const next = checkPassword(newPassword);
    await this.q('UPDATE player_credentials SET password_hash=?, updated_at=?, must_change=0 WHERE player_id=?', await hashPassword(next), this.now(), current.player.id).run();
    await this.q('DELETE FROM player_sessions WHERE player_id=? AND token_hash<>?', current.player.id, current.hash).run();
    if (!current.primary) await this.q('UPDATE players SET credential_hash=? WHERE id=?', await sha256(randomToken()), current.player.id).run();
    return { changed: true };
  }

  async rename(current, name) {
    if (!current) fail('PLAYER_REQUIRED', 401);
    const display = cleanName(name);
    await this.q('UPDATE players SET name=? WHERE id=?', display, current.player.id).run();
    return this.account({ ...current.player, name: display });
  }

  // ---------- Administrare ----------
  async requireAdmin(current) {
    const account = current && await this.account(current.player);
    if (!account?.admin) fail('ADMIN_ONLY', 403);
    return account;
  }

  async listAccounts(query = '') {
    const like = '%' + String(query).trim().toLowerCase().replace(/[%_]/g, '') + '%';
    const { results } = await this.q(`SELECT p.id, p.name, p.created_at, c.email, c.last_login, c.disabled, c.locked_until, c.must_change,
        (SELECT COUNT(*) FROM player_sessions s WHERE s.player_id=p.id AND s.expires_at>?) AS sessions
      FROM player_credentials c JOIN players p ON p.id=c.player_id
      WHERE lower(c.email) LIKE ? OR lower(p.name) LIKE ? ORDER BY c.created_at DESC LIMIT 200`, this.now(), like, like).all();
    return results.map((r) => ({
      id: r.id, name: r.name, email: r.email, createdAt: r.created_at, lastLogin: r.last_login, sessions: Number(r.sessions),
      disabled: !!r.disabled, locked: r.locked_until > this.now(), mustChange: !!r.must_change, admin: this.admins.has(r.email),
    }));
  }

  async stats() {
    const row = await this.q(`SELECT (SELECT COUNT(*) FROM player_credentials) AS accounts,
      (SELECT COUNT(*) FROM player_credentials WHERE disabled=1) AS disabled,
      (SELECT COUNT(*) FROM player_credentials WHERE last_login>?) AS active7`, this.now() - 7 * 86400000).first();
    return { accounts: Number(row.accounts), disabled: Number(row.disabled), active7: Number(row.active7) };
  }

  // Deconectează toate dispozitivele unui cont.
  async endSessions(playerId) {
    await this.q('DELETE FROM player_sessions WHERE player_id=?', playerId).run();
    await this.q('UPDATE players SET credential_hash=? WHERE id=?', await sha256(randomToken()), playerId).run();
  }

  async setDisabled(playerId, disabled, admin) {
    const cred = await this.q('SELECT email FROM player_credentials WHERE player_id=?', String(playerId)).first();
    if (!cred) fail('ACCOUNT_NOT_FOUND', 404);
    if (disabled && cred.email === admin.email) fail('CANNOT_DISABLE_SELF');
    await this.q('UPDATE player_credentials SET disabled=?, updated_at=? WHERE player_id=?', disabled ? 1 : 0, this.now(), playerId).run();
    if (disabled) await this.endSessions(playerId);
    return { id: playerId, disabled };
  }

  // Parolă temporară, afișată o singură dată adminului. Utilizatorul trebuie să o schimbe la intrare.
  async resetPassword(playerId) {
    const cred = await this.q('SELECT email FROM player_credentials WHERE player_id=?', String(playerId)).first();
    if (!cred) fail('ACCOUNT_NOT_FOUND', 404);
    const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const temporary = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => alphabet[b % alphabet.length]).join('');
    await this.q(`UPDATE player_credentials SET password_hash=?, must_change=1, failed_attempts=0, locked_until=0, updated_at=?
      WHERE player_id=?`, await hashPassword(temporary), this.now(), playerId).run();
    await this.endSessions(playerId);
    return { id: playerId, email: cred.email, temporaryPassword: temporary };
  }
}
