import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { JSDOM } from 'jsdom';
import { UniPulseChat, MAX_MESSAGE, ChatError } from '../server/unipulse-chat.mjs';
import { UniPulseEvents, validateEvent, LIMITS } from '../server/unipulse-events.mjs';

// Adaptor cu aceeași formă ca ctx.storage.sql din Durable Objects.
function memorySql() {
  const db = new DatabaseSync(':memory:');
  return {
    exec(query, ...bindings) {
      const statement = db.prepare(query);
      const rows = /^\s*(SELECT|WITH)/i.test(query) ? statement.all(...bindings) : (statement.run(...bindings), []);
      return { toArray: () => rows.map((row) => ({ ...row })) };
    },
  };
}

const ana = { id: 'p-ana', name: 'Ana' };
const bogdan = { id: 'p-bogdan', name: 'Bogdan' };

test('chat stays locked until a player participates and unlocks after joining', () => {
  const chat = new UniPulseChat(memorySql());
  const id = 'uvt-andreea-medar-2026';
  assert.throws(() => chat.messages(id, ana), /NOT_PARTICIPANT/);
  assert.throws(() => chat.send(id, ana, 'Salut'), /NOT_PARTICIPANT/);
  assert.deepEqual(chat.event(id, null), { eventId: id, count: 0, joined: false, participants: [] });

  chat.join(id, ana);
  chat.join(id, bogdan);
  chat.join(id, ana);
  const view = chat.event(id, ana);
  assert.equal(view.count, 2);
  assert.equal(view.joined, true);
  assert.deepEqual(view.participants.map((p) => [p.name, p.me]), [['Ana', true], ['Bogdan', false]]);
  assert.deepEqual(chat.event(id, null).participants, [], 'anonymous visitors only see the count');

  const sent = chat.send(id, ana, '  Vin la 18:00\u0000  ');
  assert.equal(sent.body, 'Vin la 18:00');
  chat.send(id, bogdan, 'Și eu!');
  const forBogdan = chat.messages(id, bogdan).messages;
  assert.deepEqual(forBogdan.map((m) => [m.name, m.body, m.mine]), [['Ana', 'Vin la 18:00', false], ['Bogdan', 'Și eu!', true]]);
  assert.deepEqual(chat.messages(id, ana, sent.id).messages.map((m) => m.body), ['Și eu!']);
  assert.equal(chat.counts([id, 'alt-eveniment', '../bad'])[id], 2);

  chat.leave(id, bogdan);
  assert.throws(() => chat.messages(id, bogdan), /NOT_PARTICIPANT/);
  assert.equal(chat.event(id, null).count, 1);
});

test('chat input is validated and rooms list the latest message', () => {
  const chat = new UniPulseChat(memorySql());
  assert.throws(() => chat.join('../etc', ana), /INVALID_EVENT/);
  assert.throws(() => chat.join('ok-event', null), /PLAYER_REQUIRED/);
  chat.join('ok-event', ana);
  assert.throws(() => chat.send('ok-event', ana, '   '), /EMPTY_MESSAGE/);
  assert.equal(chat.send('ok-event', ana, 'x'.repeat(MAX_MESSAGE + 50)).body.length, MAX_MESSAGE);
  chat.join('second-event', ana);
  chat.send('second-event', ana, 'Ultimul mesaj');
  const rooms = chat.rooms(ana);
  assert.equal(rooms[0].eventId, 'second-event');
  assert.equal(rooms[0].last.body, 'Ultimul mesaj');
  assert.equal(rooms.length, 2);
  assert.deepEqual(chat.rooms(bogdan), []);
});

const NOW = Date.parse('2026-11-21T09:00:00Z');
const bowling = (extra = {}) => ({
  title: 'Bowling vineri seara', category: 'social', city: 'timisoara', lat: 45.7537, lng: 21.2252,
  venueName: 'Bowling Center', startISO: '2026-11-27T17:00:00Z', ...extra,
});

test('community events are visible to every user and validated on the server', () => {
  const events = new UniPulseEvents(memorySql());
  const created = events.create(bowling({ description: 'Ne vedem la intrare.', price: 0, spots: 8 }), ana, NOW);
  assert.match(created.id, /^c-[a-z0-9]{9}$/);
  assert.equal(created.mine, true);
  assert.equal(created.ownerName, 'Ana');
  const seenByBogdan = events.list('timisoara', bogdan, NOW);
  assert.deepEqual(seenByBogdan.map((e) => [e.title, e.mine, e.community]), [['Bowling vineri seara', false, true]]);
  assert.equal(events.list('timisoara', null, NOW).length, 1, 'visible without an account too');
  assert.equal(events.list('cluj', bogdan, NOW).length, 0);
  assert.equal(Date.parse(created.endISO) - Date.parse(created.startISO), 3 * 3600000, 'default length is 3 hours');

  const invalid = [
    [{ title: 'ab' }, /INVALID_TITLE/], [{ category: 'party' }, /INVALID_CATEGORY/], [{ city: 'paris' }, /INVALID_CITY/],
    [{ lat: 46.77, lng: 23.59 }, /INVALID_PLACE/], [{ venueName: '' }, /INVALID_PLACE/],
    [{ startISO: '2026-11-01T10:00:00Z' }, /INVALID_START/], [{ endISO: '2026-11-27T16:00:00Z' }, /INVALID_END/],
    [{ url: 'javascript:alert(1)' }, /INVALID_URL/], [{ spots: 1 }, /INVALID_SPOTS/], [{ price: -5 }, /INVALID_PRICE/],
  ];
  for (const [change, error] of invalid) assert.throws(() => validateEvent(bowling(change), NOW), error, JSON.stringify(change));
  assert.throws(() => events.create(bowling(), null, NOW), /PLAYER_REQUIRED/);
  assert.equal(validateEvent(bowling({ title: '  <b>Bowling</b>\u0000  ' }), NOW).title, '<b>Bowling</b>', 'stored as plain text; the client escapes it');
});

test('owners delete, reports hide and limits stop spam', () => {
  const events = new UniPulseEvents(memorySql());
  const event = events.create(bowling(), ana, NOW);
  assert.throws(() => events.remove(event.id, bogdan), /NOT_OWNER/);
  assert.throws(() => events.report(event.id, ana, NOW), /OWN_EVENT/);
  for (const [i, reporter] of [bogdan, bogdan, { id: 'p3', name: 'C' }].entries()) {
    assert.equal(events.report(event.id, reporter, NOW).hidden, false, 'duplicate reports count once ' + i);
  }
  assert.equal(events.report(event.id, { id: 'p4', name: 'D' }, NOW).hidden, true);
  assert.equal(events.list('timisoara', null, NOW).length, 0);
  assert.equal(events.isOpen(event.id), false, 'hidden events take no new participants or messages');
  assert.equal(events.isOpen('uvt-andreea-medar-2026'), true);

  const second = events.create(bowling(), ana, NOW);
  assert.deepEqual(events.remove(second.id, ana), { id: second.id, removed: true });
  assert.equal(events.list('timisoara', ana, NOW).length, 0);

  for (let i = 0; i < LIMITS.activePerPlayer; i++) events.create(bowling({ title: 'Ieșire ' + i }), bogdan, NOW);
  assert.throws(() => events.create(bowling(), bogdan, NOW), /TOO_MANY_EVENTS/);
});

test('participants report messages and authors delete their own', () => {
  const chat = new UniPulseChat(memorySql());
  const id = 'c-abcdefghi';
  const people = [ana, bogdan, { id: 'p3', name: 'C' }, { id: 'p4', name: 'D' }];
  people.forEach((p) => chat.join(id, p));
  const rude = chat.send(id, bogdan, 'spam');
  assert.throws(() => chat.reportMessage(id, bogdan, rude.id), /OWN_MESSAGE/);
  assert.throws(() => chat.reportMessage(id, { id: 'outsider', name: 'X' }, rude.id), /NOT_PARTICIPANT/);
  assert.equal(chat.reportMessage(id, ana, rude.id).removed, false);
  assert.equal(chat.reportMessage(id, people[2], rude.id).removed, false);
  assert.equal(chat.reportMessage(id, people[3], rude.id).removed, true);
  assert.deepEqual(chat.messages(id, ana).messages, []);
  const mine = chat.send(id, ana, 'greșeală');
  assert.throws(() => chat.deleteMessage(id, bogdan, mine.id), /NOT_OWNER/);
  assert.equal(chat.deleteMessage(id, ana, mine.id).removed, true);
  assert.throws(() => chat.deleteMessage(id, ana, mine.id), /MESSAGE_NOT_FOUND/);
});

// ---------- Client: aplicația UniPulse cu un server fals în memorie ----------
const files = ['index.html', 'js/data.js', 'js/events.js', 'js/events-timisoara.js', 'js/social.js', 'js/app.js'];
const [markup, ...scripts] = await Promise.all(files.map((file) => readFile(new URL('../../public/unipulse/' + file, import.meta.url), 'utf8')));

function fakeServer() {
  const sql = memorySql();
  const chat = new UniPulseChat(sql);
  const events = new UniPulseEvents(sql);
  const players = new Map();
  const server = { chat, events, players, current: null, synced: {} };
  server.fetch = async (path, options = {}) => {
    const url = new URL(path, 'https://example.test');
    const method = options.method || 'GET';
    const body = options.body ? JSON.parse(options.body) : {};
    const reply = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
    const me = server.current ? players.get(server.current) : null;
    try {
      const account = (p) => (p ? { name: p.name, email: p.email, hasPassword: true, mustChange: false, admin: false } : null);
      if (url.pathname === '/api/unipulse/auth/me') return reply({ account: account(me) });
      if (url.pathname === '/api/unipulse/auth/register') {
        if ([...players.values()].some((p) => p.email === body.email)) return reply({ error: 'EMAIL_TAKEN' }, 409);
        const player = { id: 'p' + (players.size + 1), name: body.name, email: body.email, password: body.password };
        players.set(player.id, player);
        server.current = player.id;
        return reply({ account: account(player) }, 201);
      }
      if (url.pathname === '/api/unipulse/auth/login') {
        const player = [...players.values()].find((p) => p.email === body.email && p.password === body.password);
        if (!player) return reply({ error: 'BAD_LOGIN' }, 401);
        server.current = player.id;
        return reply({ account: account(player) });
      }
      if (url.pathname === '/api/unipulse/sync') {
        if (!me) return reply({ error: 'PLAYER_REQUIRED' }, 401);
        if (method === 'GET') return reply(server.synced[me.id] || {});
        (server.synced[me.id] ||= {})[body.key] = { value: body.value, updatedAt: 1 };
        return reply({ key: body.key });
      }
      if (url.pathname === '/api/unipulse/teams') return reply([]);
      if (url.pathname === '/api/unipulse/counts') return reply(chat.counts(url.searchParams.get('ids').split(',')));
      if (url.pathname === '/api/unipulse/me') return reply({ player: me, rooms: me ? chat.rooms(me) : [] });
      if (url.pathname === '/api/unipulse/events') {
        if (method === 'GET') return reply(events.list(url.searchParams.get('city'), me, NOW));
        if (!me) return reply({ error: 'PLAYER_REQUIRED' }, 401);
        return reply(events.create(body, me, NOW), 201);
      }
      const match = url.pathname.match(/^\/api\/unipulse\/event\/([^/]+)(\/join|\/leave|\/messages|\/delete|\/report|\/messages\/(\d+)\/(?:delete|report))?$/);
      const [, id, action, messageId] = match;
      if (!action) return reply(chat.event(id, me));
      if (!me) return reply({ error: 'PLAYER_REQUIRED' }, 401);
      if (messageId) return reply(action.endsWith('/delete') ? chat.deleteMessage(id, me, messageId) : chat.reportMessage(id, me, messageId));
      if (action === '/delete') return reply(events.remove(id, me));
      if (action === '/report') return reply(events.report(id, me, NOW));
      if (action === '/join') { if (!events.isOpen(id)) throw new ChatError('EVENT_NOT_FOUND', 404); return reply(chat.join(id, me)); }
      if (action === '/leave') return reply(chat.leave(id, me));
      if (method === 'GET') return reply(chat.messages(id, me, url.searchParams.get('after')));
      return reply(chat.send(id, me, body.body), 201);
    } catch (error) {
      return reply({ error: error.message }, error.status || 400);
    }
  };
  return server;
}

function openApp(server, hash = '') {
  const dom = new JSDOM(markup, { url: 'https://example.test/unipulse/' + hash, runScripts: 'outside-only' });
  const { window } = dom;
  window.Date = class extends Date {
    constructor(...args) { super(...(args.length ? args : [NOW])); }
    static now() { return NOW; }
  };
  window.matchMedia = () => ({ matches: false });
  window.fetch = server.fetch;
  window.eval(scripts.join('\n'));
  return dom;
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

test('event icons follow what the event contains', () => {
  const dom = openApp(fakeServer());
  try {
    const icon = (e) => dom.window.eval(`eventIcon(${JSON.stringify(e)})`);
    assert.equal(icon({ title: 'Bowling vineri seara', category: 'social' }), '🎳');
    assert.equal(icon({ title: 'Turneu de fotbal', category: 'sport' }), '⚽');
    assert.equal(icon({ title: 'Meci de baschet 3x3', category: 'sport' }), '🏀');
    assert.equal(icon({ title: 'Tasting tour prin centru', category: 'social' }), '🍽️');
    assert.equal(icon({ title: 'AI Prototyping Bootcamp', tags: ['AI'], category: 'workshop' }), '💻');
    assert.equal(icon({ title: 'Hackathon Code Quest 2026', tags: ['Electronică'], category: 'hackathon' }), '💻');
    assert.equal(icon({ title: 'La Cenerentola (Cenușăreasa) – premieră', tags: ['Operă'], category: 'cultura' }), '🎻');
    assert.equal(icon({ title: 'Ceva nou', category: 'voluntariat' }), '🌱');
    assert.equal(icon({ title: 'Seară de marketing', category: 'cariera' }), '💼');
    assert.notEqual(icon({ title: 'Plimbare prin cartier', category: 'social' }), '📖');
    assert.notEqual(icon({ title: 'Seară de marketing', category: 'cariera' }), '🛍️');
    assert.equal(icon({ title: 'Turneu de tenis de masă', category: 'sport' }), '🏓');
    // Fiecare eveniment real are o pictogramă potrivită conținutului.
    const expected = {
      'upt-ai-prototyping-2026': '💻', 'upt-forumul-educatiei-2026': '🎓', 'uvt-andreea-medar-2026': '🖼️',
      'upt-eudres-hackathon-2026': '💻', 'upt-gala-excelentei-2026': '🏆', 'cj-planeta-craciun-2026': '🎄',
      'cj-lights-on-2026': '🎄', 'cj-targ-iarna-2026': '⛸️', 'buc-magia-craciunului-2026': '🎄',
      'buc-targ-craciun-2026': '🎄', 'buc-code-quest-2026': '💻', 'iasi-inceputurile-tiparului-2026': '📖',
      'iasi-la-cenerentola-2026-11-21': '🎻', 'iasi-mineralia-2026': '💎',
    };
    const actual = dom.window.eval(`(() => { ${scripts[1]}\n return Object.fromEntries(EVENTS.map(e => [e.id, eventIcon(e)])); })()`);
    for (const [id, emoji] of Object.entries(expected)) assert.equal(actual[id], emoji, id);
  } finally {
    dom.window.close();
  }
});

test('participating unlocks the participants chat and messages reach the other participant', async () => {
  const server = fakeServer();
  const id = 'uvt-andreea-medar-2026';
  server.chat.join(id, { id: 'other', name: 'Andreiroman77' });
  server.chat.send(id, { id: 'other', name: 'Andreiroman77' }, 'Ne vedem la galerie?');

  const dom = openApp(server, '#ev-' + id);
  const doc = dom.window.document;
  const $ = (s) => doc.querySelector(s);
  try {
    await settle();
    assert.match($('#detail-body .d-hero').textContent, /Sursă oficială/);
    assert.equal($('#detail-body .d-icon').textContent, '🖼️');
    assert.deepEqual([...doc.querySelectorAll('.d-icons > *')].map((el) => el.textContent.replace(/[^\p{L}]+/gu, ' ').trim()),
      ['Salvează', 'Traseu', 'Calendar', 'Trimite']);
    assert.match($('#d-join [data-rsvp]').textContent, /Particip/);
    assert.match($('#d-people').textContent, /1 participant/);
    assert.ok($('#d-people [data-chat-locked]'), 'chat is locked before participating');
    assert.equal($('#d-people [data-event-chat]'), null);

    $('#d-join [data-rsvp]').click();
    await settle();
    assert.ok(!$('#modal').classList.contains('hidden'), 'login is required first');
    $('[data-auth="register"]').click();
    $('#lg-name').value = 'Maria';
    $('#lg-email').value = 'maria@student.upt.ro';
    $('#lg-pass').value = 'parola-sigura-1';
    $('#login-form').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    await settle();
    await settle();
    assert.match($('#d-join [data-rsvp]').textContent, /Participi/);
    assert.match($('#d-people').textContent, /2 participanți/);
    assert.match($('#d-people .att-names').textContent, /Andreiroman77, Tu/);

    $('#d-people [data-event-chat]').click();
    await settle();
    assert.ok($('#detail').classList.contains('chat-mode'));
    assert.match($('#chat-msgs').textContent, /Ne vedem la galerie\?/);
    $('#chat-input').value = 'Da, vin și eu!';
    $('#chat-form').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    await settle();
    assert.equal($('#chat-msgs .msg.mine .bubble').firstChild.textContent, 'Da, vin și eu!');
    const theirs = server.chat.messages(id, { id: 'other', name: 'Andreiroman77' }).messages;
    assert.deepEqual(theirs.map((m) => m.body), ['Ne vedem la galerie?', 'Da, vin și eu!']);

    $('#chat-back').click();
    $('#d-join [data-rsvp]').click();
    await settle();
    assert.match($('#d-join [data-rsvp]').textContent, /Particip/);
    assert.ok($('#d-people [data-chat-locked]'), 'leaving locks the chat again');
  } finally {
    dom.window.close();
  }
});

test('an event created in one browser appears for another user, who can report it', async () => {
  const server = fakeServer();
  const first = openApp(server);
  const doc = first.window.document;
  const $ = (s) => doc.querySelector(s);
  try {
    await settle();
    $('#btn-create-inline').click();
    assert.match($('#modal-body h3').textContent, /Creează un eveniment/);
    $('#mu-title').value = 'Fotbal pe terenul din Complex';
    $('#mu-cat').value = 'sport';
    $('#mu-venue').value = 'sala';
    $('#mu-price').value = '0';
    $('#mu-form').requestSubmit();
    await settle();
    assert.match($('#modal-body h3').textContent, /Intră în cont/, 'publishing asks for an account first');
    $('[data-auth="register"]').click();
    $('#lg-name').value = 'Ana';
    $('#lg-email').value = 'ana@student.upt.ro';
    $('#lg-pass').value = 'parola-sigura-1';
    $('#login-form').requestSubmit();
    await settle(); await settle();
    assert.ok($('#modal').classList.contains('hidden'), 'the form is resubmitted after login');
    assert.match($('#detail-body .d-hero').textContent, /Organizat de tine/);
    assert.equal($('#detail-body .d-icon').textContent, '⚽');
    assert.ok($('[data-delete-event]'), 'the author can delete');
    assert.equal(server.events.list('timisoara', null, NOW).length, 1);
  } finally {
    first.window.close();
  }

  server.current = null;
  const second = openApp(server);
  const other = second.window.document;
  try {
    await settle(); await settle();
    const card = [...other.querySelectorAll('#event-list .ev-card')].find((el) => /Fotbal pe terenul/.test(el.textContent));
    assert.ok(card, 'another visitor sees the community event in the list');
    assert.match(card.textContent, /De la un student/);
    assert.match(card.textContent, /Gratuit/);
    const eventId = card.dataset.id;
    const origin = value => other.querySelector('#origin-row [data-origin="' + value + '"]');
    const cards = () => [...other.querySelectorAll('#event-list .ev-card')];
    origin('official').click();
    assert.ok(cards().length > 0);
    assert.ok(cards().every(event => event.dataset.id !== eventId));
    origin('community').click();
    assert.deepEqual(cards().map(event => event.dataset.id), [eventId]);
    assert.equal(origin('community').getAttribute('aria-pressed'), 'true');
    assert.equal(other.querySelector('#filter-count').textContent, '(1)');
    other.querySelector('#show-all-events').click();
    assert.equal(origin('all').getAttribute('aria-pressed'), 'true');
    assert.ok(cards().length > 1);
    other.querySelector('#event-list [data-id="' + eventId + '"] .ev-open').click();
    assert.match(other.querySelector('#detail-body .d-hero').textContent, /Organizat de Ana/);
    assert.ok(other.querySelector('[data-report-event]'), 'other users can report it');
    assert.equal(other.querySelector('[data-delete-event]'), null);
  } finally {
    second.window.close();
  }
});

test('saved events follow the account to another device', async () => {
  const server = fakeServer();
  const phone = openApp(server);
  const $ = (s) => phone.window.document.querySelector(s);
  try {
    await settle();
    $('#btn-login').click();
    $('[data-auth="register"]').click();
    $('#lg-name').value = 'Ana';
    $('#lg-email').value = 'ana@student.upt.ro';
    $('#lg-pass').value = 'parola-sigura-1';
    $('#login-form').requestSubmit();
    await settle(); await settle();
    $('#event-list [data-heart="uvt-andreea-medar-2026"]').click();
    await new Promise((resolve) => setTimeout(resolve, 900));
    const anaId = [...server.players.values()][0].id;
    assert.deepEqual(server.synced[anaId].saved.value, ['uvt-andreea-medar-2026'], 'the heart is stored in the account');
  } finally {
    phone.window.close();
  }
  const laptop = openApp(server);
  try {
    await settle(); await settle();
    const heart = laptop.window.document.querySelector('#event-list [data-heart="uvt-andreea-medar-2026"]');
    assert.ok(heart.classList.contains('on'), 'another device with the same account shows it saved');
    const doc = laptop.window.document;
    assert.equal(doc.querySelector('#saved-count').textContent, '1');
    assert.equal(doc.querySelector('.topbar .calendar-badge, #calendar-verified'), null);
    doc.querySelector('#btn-account').click();
    const verified = doc.querySelector('#modal-body time#calendar-verified');
    assert.equal(verified.dateTime, '2026-11-20');
    assert.equal(verified.textContent, '20 noiembrie 2026');
  } finally {
    laptop.window.close();
  }
});

test('imported events beyond the first counts page support participation', async () => {
  const server = fakeServer();
  const id = 'tm-revelion-2027';
  server.chat.join(id, { id: 'other', name: 'Andrei' });
  server.players.set('p1', { id: 'p1', name: 'Maria', email: 'maria@student.upt.ro' });
  server.current = 'p1';
  const dom = openApp(server);
  const doc = dom.window.document;
  try {
    await settle();
    const card = doc.querySelector('#event-list [data-id="' + id + '"]');
    assert.match(card.querySelector('.badge.people').textContent, /1/);
    card.querySelector('.ev-open').click();
    await settle();
    doc.querySelector('#d-join [data-rsvp]').click();
    await settle();
    assert.match(doc.querySelector('#d-people').textContent, /2 participanți/);
    assert.ok(doc.querySelector('#d-people [data-event-chat]'));
  } finally {
    dom.window.close();
  }
});
