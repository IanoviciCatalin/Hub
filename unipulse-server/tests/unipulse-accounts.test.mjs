import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { Accounts, sha256, readToken, hashPassword, verifyPassword, LOCK } from '../server/unipulse-accounts.mjs';
import { UniPulseStore } from '../server/unipulse-store.mjs';
import { unipulse } from '../server/unipulse-routes.mjs';

// D1 în memorie, cu aceeași formă (prepare → bind → first/all/run) și schema reală.
const schema = await readFile(new URL('./local-schema.sql', import.meta.url), 'utf8');
function memoryD1() {
  const db = new DatabaseSync(':memory:');
  db.exec(schema);
  return {
    raw: db,
    prepare(sql) {
      const statement = db.prepare(sql);
      const bound = (args) => ({
        async first() { return statement.get(...args) ?? null; },
        async all() { return { results: statement.all(...args) }; },
        async run() { statement.run(...args); return { success: true }; },
      });
      return { bind: (...args) => bound(args), ...bound([]) };
    },
  };
}
function memorySql() {
  const db = new DatabaseSync(':memory:');
  return { exec(query, ...b) { const s = db.prepare(query); const rows = /^\s*(SELECT|WITH)/i.test(query) ? s.all(...b) : (s.run(...b), []); return { toArray: () => rows.map((r) => ({ ...r })) }; } };
}
const tokenOf = (cookie) => cookie.match(/__Host-duca_player=([a-f0-9]{64})/)[1];
const request = (token) => ({ headers: new Headers(token ? { cookie: `__Host-duca_player=${token}` } : {}) });

test('passwords are salted PBKDF2 hashes and never stored in clear', async () => {
  const stored = await hashPassword('parola-sigura-1');
  assert.match(stored, /^pbkdf2\$100000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  assert.notEqual(stored, await hashPassword('parola-sigura-1'), 'a new salt every time');
  assert.equal(await verifyPassword('parola-sigura-1', stored), true);
  assert.equal(await verifyPassword('parola-sigura-2', stored), false);
});

test('register, login on a second device, logout and password change', async () => {
  const db = memoryD1();
  const accounts = new Accounts(db);
  const created = await accounts.register({ name: 'Ana', email: '  Ana@Student.UPT.ro ', password: 'parola-sigura-1' }, null);
  assert.equal(created.account.email, 'ana@student.upt.ro');
  assert.equal(created.account.hasPassword, true);
  const phone = tokenOf(created.cookie);
  assert.match(created.cookie, /HttpOnly; Secure; SameSite=Lax; Path=\/; Max-Age=31536000/);
  const row = db.raw.prepare('SELECT password_hash FROM player_credentials').get();
  assert.doesNotMatch(row.password_hash, /parola-sigura-1/);

  await assert.rejects(accounts.register({ name: 'X', email: 'ana@student.upt.ro', password: 'alta-parola-1' }, null), /EMAIL_TAKEN/);
  await assert.rejects(accounts.register({ name: 'X', email: 'nu-e-email', password: 'alta-parola-1' }, null), /INVALID_EMAIL/);
  await assert.rejects(accounts.register({ name: 'X', email: 'x@y.ro', password: 'scurt' }, null), /WEAK_PASSWORD/);
  await assert.rejects(accounts.login({ email: 'ana@student.upt.ro', password: 'gresita-123' }), /BAD_LOGIN/);
  await assert.rejects(accounts.login({ email: 'nimeni@student.upt.ro', password: 'gresita-123' }), /BAD_LOGIN/, 'same message for unknown emails');

  const laptop = tokenOf((await accounts.login({ email: 'ANA@student.upt.ro', password: 'parola-sigura-1' })).cookie);
  const onPhone = await accounts.session(phone), onLaptop = await accounts.session(laptop);
  assert.equal(onPhone.player.id, onLaptop.player.id, 'both devices open the same account');
  assert.equal(onPhone.primary, true);
  assert.equal(onLaptop.primary, false);

  await accounts.changePassword(onPhone, { password: 'parola-sigura-1', newPassword: 'parola-noua-22' });
  assert.equal(await accounts.session(laptop), null, 'changing the password signs out the other devices');
  assert.ok(await accounts.session(phone), 'the device that changed it stays signed in');
  await assert.rejects(accounts.changePassword(onPhone, { password: 'gresita', newPassword: 'x'.repeat(10) }), /BAD_PASSWORD/);

  await accounts.logout(await accounts.session(phone));
  assert.equal(await accounts.session(phone), null);
  assert.ok((await accounts.login({ email: 'ana@student.upt.ro', password: 'parola-noua-22' })).cookie);
});

test('a game profile without email becomes the account and keeps its id', async () => {
  const db = memoryD1();
  const accounts = new Accounts(db);
  const token = 'a'.repeat(64);
  db.raw.prepare('INSERT INTO players(id, credential_hash, name, created_at) VALUES(?,?,?,?)').run('guest-1', await sha256(token), 'Student_1', 1);
  const guest = await accounts.session(token);
  assert.deepEqual(await accounts.account(guest.player), { name: 'Student_1', email: null, hasPassword: false, mustChange: false, admin: false, createdAt: 1 });
  await assert.rejects(accounts.logout(guest), /NO_PASSWORD/, 'a profile without email cannot sign out and lose itself');
  const result = await accounts.register({ name: 'Bogdan', email: 'bogdan@e-uvt.ro', password: 'parola-sigura-1' }, guest);
  assert.equal(result.cookie, null, 'the existing cookie stays');
  assert.equal((await accounts.session(token)).player.id, 'guest-1');
  assert.equal((await accounts.account((await accounts.session(token)).player)).email, 'bogdan@e-uvt.ro');
});

test('five wrong passwords lock the account for 15 minutes', async () => {
  let now = 1_800_000_000_000;
  const accounts = new Accounts(memoryD1(), { now: () => now });
  await accounts.register({ name: 'Ana', email: 'ana@x.ro', password: 'parola-sigura-1' }, null);
  for (let i = 1; i < LOCK.attempts; i++) await assert.rejects(accounts.login({ email: 'ana@x.ro', password: 'gresit-' + i }), /BAD_LOGIN/);
  await assert.rejects(accounts.login({ email: 'ana@x.ro', password: 'gresit' }), /ACCOUNT_LOCKED/);
  await assert.rejects(accounts.login({ email: 'ana@x.ro', password: 'parola-sigura-1' }), /ACCOUNT_LOCKED/, 'even the right password waits');
  now += LOCK.minutes * 60000 + 1;
  assert.ok((await accounts.login({ email: 'ana@x.ro', password: 'parola-sigura-1' })).account);
});

test('only configured admins manage accounts; reset and disable end every session', async () => {
  const db = memoryD1();
  const accounts = new Accounts(db, { admins: 'Admin@ianovici.dev' });
  const admin = await accounts.register({ name: 'Admin', email: 'admin@ianovici.dev', password: 'parola-admin-1' }, null);
  const user = await accounts.register({ name: 'Ana', email: 'ana@x.ro', password: 'parola-sigura-1' }, null);
  assert.equal(admin.account.admin, true);
  assert.equal(user.account.admin, false);
  const adminSession = await accounts.session(tokenOf(admin.cookie)), userSession = await accounts.session(tokenOf(user.cookie));
  await assert.rejects(accounts.requireAdmin(userSession), /ADMIN_ONLY/);
  await assert.rejects(accounts.requireAdmin(null), /ADMIN_ONLY/);
  const me = await accounts.requireAdmin(adminSession);

  const list = await accounts.listAccounts('');
  assert.deepEqual(list.map((a) => a.email).sort(), ['admin@ianovici.dev', 'ana@x.ro']);
  assert.equal((await accounts.listAccounts('ana')).length, 1);

  const reset = await accounts.resetPassword(userSession.player.id);
  assert.match(reset.temporaryPassword, /^[A-Za-z0-9]{12}$/);
  assert.equal(await accounts.session(tokenOf(user.cookie)), null, 'reset signs the user out everywhere');
  await assert.rejects(accounts.login({ email: 'ana@x.ro', password: 'parola-sigura-1' }), /BAD_LOGIN/);
  const back = await accounts.login({ email: 'ana@x.ro', password: reset.temporaryPassword });
  assert.equal(back.account.mustChange, true);

  await accounts.setDisabled(userSession.player.id, true, me);
  assert.equal(await accounts.session(tokenOf(back.cookie)), null);
  await assert.rejects(accounts.login({ email: 'ana@x.ro', password: reset.temporaryPassword }), /ACCOUNT_DISABLED/);
  await assert.rejects(accounts.setDisabled(adminSession.player.id, true, me), /CANNOT_DISABLE_SELF/);
  assert.equal((await accounts.stats()).disabled, 1);
});

test('synced data and team posts live on the server', () => {
  const store = new UniPulseStore(memorySql());
  const ana = { id: 'p-ana', name: 'Ana' }, bogdan = { id: 'p-bogdan', name: 'Bogdan' };
  assert.deepEqual(store.setSync(ana.id, 'saved', ['uvt-andreea-medar-2026']).ok.key, 'saved');
  store.setSync(ana.id, 'orar', [{ day: 1, start: '08:00', end: '10:00', subj: 'Analiză', room: 'A101', type: 'C', week: 'all' }]);
  const synced = store.getSync(ana.id).ok;
  assert.deepEqual(synced.saved.value, ['uvt-andreea-medar-2026']);
  assert.equal(synced.orar.value[0].subj, 'Analiză');
  assert.deepEqual(store.getSync(bogdan.id).ok, {}, 'each account sees only its own data');
  assert.equal(store.setSync(ana.id, 'parola', 'x').error, 'INVALID_SYNC_KEY');
  assert.equal(store.setSync(ana.id, 'orar', 'x'.repeat(40000)).error, 'SYNC_TOO_LARGE');

  const team = store.createTeam({ eventId: 'upt-eudres-hackathon-2026', city: 'timisoara', message: 'Căutăm un backend dev', have: 'React, design', need: ['Backend'], spots: 1 }, ana).ok;
  assert.equal(team.mine, true);
  const seen = store.listTeams('timisoara', bogdan).ok[0];
  assert.deepEqual([seen.author, seen.mine, seen.have, seen.memberNames], ['Ana', false, ['React', 'design'], []]);
  assert.equal(store.joinTeam(team.id, bogdan).ok.joinedByMe, true);
  assert.equal(store.joinTeam(team.id, { id: 'p3', name: 'C' }).error, 'TEAM_FULL');
  assert.deepEqual(store.listTeams('timisoara', ana).ok[0].memberNames, ['Bogdan'], 'the author sees who joined');
  assert.equal(store.removeTeam(team.id, bogdan).error, 'NOT_OWNER');
  assert.equal(store.createTeam({ eventId: 'x', city: 'timisoara', message: 'scurt', spots: 2 }, ana).error, 'INVALID_EVENT');
  store.adminSetStatus('team', team.id, 'hidden');
  assert.equal(store.listTeams('timisoara', ana).ok.length, 0);
  assert.equal(store.adminOverview().ok.teams[0].status, 'hidden');
});

test('routes: accounts work end to end, writes need an account, admin data needs an admin', async () => {
  const db = memoryD1();
  const store = new UniPulseStore(memorySql());
  const env = { DB: db, UNIPULSE_HUB: { getByName: () => store }, UNIPULSE_ADMINS: 'admin@x.ro' };
  const origin = 'https://ianovici.dev';
  async function call(path, { method = 'GET', body, cookie, from = origin } = {}) {
    const headers = new Headers({ 'Content-Type': 'application/json', Origin: from });
    if (cookie) headers.set('cookie', `__Host-duca_player=${cookie}`);
    const url = new URL(origin + path);
    const response = await unipulse(new Request(url, { method, headers, body: body ? JSON.stringify(body) : undefined }), env, url);
    return { status: response.status, data: await response.json(), cookie: response.headers.get('Set-Cookie') };
  }
  const user = await call('/api/unipulse/auth/register', { method: 'POST', body: { name: 'Ana', email: 'ana@x.ro', password: 'parola-sigura-1' } });
  assert.equal(user.status, 201);
  const ana = tokenOf(user.cookie);
  assert.equal((await call('/api/unipulse/auth/me', { cookie: ana })).data.account.email, 'ana@x.ro');
  assert.equal((await call('/api/unipulse/auth/login', { method: 'POST', body: { email: 'ana@x.ro', password: 'parola-sigura-1' }, from: 'https://evil.example' })).status, 403);

  // Un profil de joc fără email poate citi, dar nu poate scrie în UniPulse.
  const guestToken = 'b'.repeat(64);
  db.raw.prepare('INSERT INTO players(id, credential_hash, name, created_at) VALUES(?,?,?,?)').run('guest', await sha256(guestToken), 'Student_2', 1);
  const guestJoin = await call('/api/unipulse/event/uvt-andreea-medar-2026/join', { method: 'POST', body: {}, cookie: guestToken });
  assert.deepEqual([guestJoin.status, guestJoin.data.error], [403, 'ACCOUNT_REQUIRED']);
  assert.equal((await call('/api/unipulse/event/uvt-andreea-medar-2026/join', { method: 'POST', body: {}, cookie: ana })).status, 200);

  assert.equal((await call('/api/unipulse/sync', { method: 'POST', body: { key: 'saved', value: ['a-b-c'] }, cookie: ana })).status, 200);
  assert.deepEqual((await call('/api/unipulse/sync', { cookie: ana })).data.saved.value, ['a-b-c']);
  assert.equal((await call('/api/unipulse/sync', { cookie: guestToken })).status, 403);

  assert.deepEqual([(await call('/api/unipulse/admin/overview', { cookie: ana })).status, (await call('/api/unipulse/admin/overview')).status], [403, 403]);
  const admin = tokenOf((await call('/api/unipulse/auth/register', { method: 'POST', body: { name: 'Admin', email: 'admin@x.ro', password: 'parola-admin-1' } })).cookie);
  const overview = await call('/api/unipulse/admin/overview', { cookie: admin });
  assert.equal(overview.status, 200);
  assert.equal(overview.data.stats.accounts, 2);
  assert.equal(overview.data.stats.participations, 1);
  assert.ok(overview.data.accounts.every((a) => !('password_hash' in a) && !('passwordHash' in a)), 'no password data leaves the server');
  const anaId = overview.data.accounts.find((a) => a.email === 'ana@x.ro').id;
  assert.equal((await call(`/api/unipulse/admin/account/${anaId}/disable`, { method: 'POST', body: {}, cookie: ana })).status, 403);
  assert.equal((await call(`/api/unipulse/admin/account/${anaId}/disable`, { method: 'POST', body: {}, cookie: admin })).data.disabled, true);
  assert.equal((await call('/api/unipulse/auth/me', { cookie: ana })).data.account, null, 'a disabled account is signed out');

  const out = await call('/api/unipulse/auth/logout', { method: 'POST', body: {}, cookie: admin });
  assert.match(out.cookie, /Max-Age=0/);
  assert.equal((await call('/api/unipulse/auth/me', { cookie: admin })).data.account, null);
  assert.equal(readToken(request(admin)), admin);
});
