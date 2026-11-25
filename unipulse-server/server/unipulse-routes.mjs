// Rutele /api/unipulse/*: conturi (D1), participări, chat, evenimente, echipe, sincronizare și admin (Durable Object).
import { ChatError } from './unipulse-chat.mjs';
import { Accounts, readToken } from './unipulse-accounts.mjs';

const json = (data, status = 200, headers = {}) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
});

async function readBody(request, limit = 4096) {
  if (!request.body) return {};
  const reader = request.body.getReader();
  let total = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) { await reader.cancel(); throw new ChatError('INVALID_REQUEST'); }
      chunks.push(value);
    }
    const buffer = new Uint8Array(total);
    let at = 0;
    for (const chunk of chunks) { buffer.set(chunk, at); at += chunk.length; }
    return total ? JSON.parse(new TextDecoder().decode(buffer)) : {};
  } catch { throw new ChatError('INVALID_REQUEST'); }
  finally { reader.releaseLock(); }
}

const EVENT = /^\/api\/unipulse\/event\/([a-z0-9][a-z0-9-]{2,79})(\/join|\/leave|\/messages|\/delete|\/report|\/messages\/(\d{1,12})\/(?:delete|report))?$/;
const TEAM = /^\/api\/unipulse\/team\/(t-[a-z0-9]{9})\/(join|leave|delete|report)$/;
const ADMIN_ACCOUNT = /^\/api\/unipulse\/admin\/account\/([0-9a-f-]{36})\/(disable|enable|reset)$/;
const ADMIN_STATUS = /^\/api\/unipulse\/admin\/(event|team)\/([a-z0-9-]{3,80})\/status$/;
const ADMIN_MESSAGE = /^\/api\/unipulse\/admin\/message\/(\d{1,12})\/(delete|dismiss)$/;

// Serverul ruleaza in spatele site-ului (Vercel face proxy pentru /api/unipulse/*), deci originea
// paginii difera de adresa worker-ului. Acceptam: aceeasi origine, originea site-ului care face
// proxy (X-Forwarded-Host) sau o origine din UNIPULSE_ORIGINS (lista separata prin virgula).
function allowedOrigin(request, env, url) {
  const origin = request.headers.get('Origin');
  if (!origin) return false;
  if (origin === url.origin) return true;
  let host;
  try { host = new URL(origin).host; } catch { return false; }
  const forwarded = (request.headers.get('X-Forwarded-Host') || '').split(',')[0].trim();
  if (forwarded && host === forwarded && origin.startsWith('https://')) return true;
  const extra = String(env.UNIPULSE_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
  return extra.includes(origin);
}

export async function unipulse(request, env, url) {
  try {
    const { method } = request;
    if (!['GET', 'POST'].includes(method)) return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
    if (method === 'POST' && !allowedOrigin(request, env, url)) return json({ error: 'ORIGIN_REJECTED' }, 403);
    if (request.headers.get('Sec-Fetch-Site') === 'cross-site') return json({ error: 'ORIGIN_REJECTED' }, 403);
    if (!env.UNIPULSE_HUB || !env.DB) return json({ error: 'CHAT_UNAVAILABLE' }, 503);
    const path = url.pathname;
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const bucket = path.startsWith('/api/unipulse/auth/') && method === 'POST' ? 'auth' : method === 'GET' ? 'read' : 'write';
    if (env.LB_RATE && !(await env.LB_RATE.limit({ key: `${ip}:unipulse:${bucket}` })).success) return json({ error: 'RATE_LIMITED' }, 429);

    const hub = env.UNIPULSE_HUB.getByName('main');
    const answer = (result, status = 200) => (result.error ? json({ error: result.error }, result.status || 400) : json(result.ok, status));
    if (path === '/api/unipulse/counts' && method === 'GET') {
      return answer(await hub.counts(String(url.searchParams.get('ids') || '').split(',').slice(0, 60)));
    }

    const accounts = new Accounts(env.DB, { admins: env.UNIPULSE_ADMINS });
    const session = await accounts.session(readToken(request));
    const account = session ? await accounts.account(session.player) : null;
    // Un cont dezactivat se comportă ca un vizitator fără cont.
    const current = account ? session : null;
    const viewer = current ? { id: current.player.id, name: current.player.name } : null;
    // Scrierile în UniPulse cer un cont cu email și parolă.
    const me = account?.hasPassword ? viewer : null;
    const requireAccount = () => {
      if (!me) throw new ChatError(viewer ? 'ACCOUNT_REQUIRED' : 'PLAYER_REQUIRED', viewer ? 403 : 401);
      return me;
    };

    // ---------- Conturi ----------
    if (path === '/api/unipulse/auth/me' && method === 'GET') return json({ account });
    if (path === '/api/unipulse/auth/register' && method === 'POST') {
      const result = await accounts.register(await readBody(request), current);
      return json({ account: result.account }, 201, result.cookie ? { 'Set-Cookie': result.cookie } : {});
    }
    if (path === '/api/unipulse/auth/login' && method === 'POST') {
      const result = await accounts.login(await readBody(request));
      return json({ account: result.account }, 200, { 'Set-Cookie': result.cookie });
    }
    if (path === '/api/unipulse/auth/logout' && method === 'POST') {
      const result = await accounts.logout(current);
      return json({ account: null }, 200, { 'Set-Cookie': result.cookie });
    }
    if (path === '/api/unipulse/auth/password' && method === 'POST') return json(await accounts.changePassword(current, await readBody(request)));
    if (path === '/api/unipulse/auth/name' && method === 'POST') return json({ account: await accounts.rename(current, (await readBody(request)).name) });

    // ---------- Date sincronizate ----------
    if (path === '/api/unipulse/sync') {
      requireAccount();
      if (method === 'GET') return answer(await hub.getSync(me.id));
      const data = await readBody(request, 40000);
      return answer(await hub.setSync(me.id, String(data.key || ''), data.value));
    }

    // ---------- Admin ----------
    if (path.startsWith('/api/unipulse/admin/')) {
      const admin = await accounts.requireAdmin(current);
      if (path === '/api/unipulse/admin/overview' && method === 'GET') {
        const overview = await hub.adminOverview();
        if (overview.error) return answer(overview);
        return json({ admin: { name: admin.name, email: admin.email }, ...overview.ok,
          stats: { ...overview.ok.stats, ...(await accounts.stats()) },
          accounts: await accounts.listAccounts(url.searchParams.get('q') || '') });
      }
      if (method !== 'POST') return json({ error: 'NOT_FOUND' }, 404);
      let match = path.match(ADMIN_ACCOUNT);
      if (match) {
        const [, id, action] = match;
        return json(action === 'reset' ? await accounts.resetPassword(id) : await accounts.setDisabled(id, action === 'disable', admin));
      }
      match = path.match(ADMIN_STATUS);
      if (match) return answer(await hub.adminSetStatus(match[1], match[2], String((await readBody(request)).status || '')));
      match = path.match(ADMIN_MESSAGE);
      if (match) return answer(match[2] === 'delete' ? await hub.adminDeleteMessage(match[1]) : await hub.adminDismissMessage(match[1]));
      return json({ error: 'NOT_FOUND' }, 404);
    }

    // ---------- Mesaje, evenimente, echipe ----------
    if (path === '/api/unipulse/me' && method === 'GET') {
      if (!viewer) return json({ player: null, rooms: [] });
      const rooms = await hub.rooms(viewer);
      return rooms.error ? answer(rooms) : json({ player: { name: viewer.name }, rooms: rooms.ok });
    }
    if (path === '/api/unipulse/events') {
      if (method === 'GET') return answer(await hub.listEvents(String(url.searchParams.get('city') || ''), viewer));
      return answer(await hub.createEvent(await readBody(request, 8192), requireAccount()), 201);
    }
    if (path === '/api/unipulse/teams') {
      if (method === 'GET') return answer(await hub.listTeams(String(url.searchParams.get('city') || ''), viewer));
      return answer(await hub.createTeam(await readBody(request, 8192), requireAccount()), 201);
    }
    let match = path.match(TEAM);
    if (match && method === 'POST') {
      const [, id, action] = match;
      const who = requireAccount();
      const calls = { join: 'joinTeam', leave: 'leaveTeam', delete: 'removeTeam', report: 'reportTeam' };
      return answer(await hub[calls[action]](id, who));
    }
    match = path.match(EVENT);
    if (!match) return json({ error: 'NOT_FOUND' }, 404);
    const [, id, action, messageId] = match;
    if (!action && method === 'GET') return answer(await hub.event(id, me));
    if (action === '/messages' && method === 'GET') {
      if (!viewer) return json({ error: 'PLAYER_REQUIRED' }, 401);
      return answer(await hub.messages(id, viewer, url.searchParams.get('after')));
    }
    if (action === '/leave' && method === 'POST' && viewer) return answer(await hub.leave(id, viewer));
    const who = requireAccount();
    if (method !== 'POST') return json({ error: 'NOT_FOUND' }, 404);
    if (messageId) return answer(action.endsWith('/delete') ? await hub.deleteMessage(id, who, messageId) : await hub.reportMessage(id, who, messageId));
    if (action === '/delete') return answer(await hub.removeEvent(id, who));
    if (action === '/report') return answer(await hub.reportEvent(id, who));
    if (action === '/join') return answer(await hub.join(id, who));
    if (action === '/messages') return answer(await hub.send(id, who, (await readBody(request)).body), 201);
    return json({ error: 'NOT_FOUND' }, 404);
  } catch (error) {
    if (error instanceof ChatError) return json({ error: error.message }, error.status);
    console.error(JSON.stringify({ event: 'unipulse_route_error', name: error?.name, message: String(error?.message || '').slice(0, 120) }));
    return json({ error: 'CHAT_UNAVAILABLE' }, 503);
  }
}
