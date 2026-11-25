// Evenimentele importate în interfața UniPulse: hartă/listă, filtre, detalii, link oficial, anulări,
// fără dubluri cu selecția statică. Serverul este simulat (fetch fals), fără rețea.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const files = ['index.html', 'js/data.js', 'js/events.js', 'js/events-timisoara.js', 'js/social.js', 'js/app.js'];
const [markup, ...scripts] = await Promise.all(files.map((file) => readFile(new URL('../../public/unipulse/' + file, import.meta.url), 'utf8')));

const imported = (id, changes = {}) => ({
  id, title: 'Absurdinia', category: 'cultura', city: 'timisoara', venueName: 'Teatrul Național – Studio „UTU Strugari”',
  address: 'Mărășești 2, et.V', lat: 45.755069, lng: 21.225713, organizer: 'Teatrul Național „Mihai Eminescu” Timișoara',
  startISO: '2026-11-21T19:00:00+02:00', startOnly: true, description: 'Spectacol al Teatrului Național Timișoara (+12 ani).',
  tags: ['Teatru'], url: 'https://www.tntm.ro/programul-lunii/absurdinia-12/', imported: true,
  sourceName: 'Teatrul Național Timișoara', eventStatus: 'scheduled', lastChecked: Date.parse('2026-11-21T06:00:00Z'), ...changes,
});

async function openApp(catalog) {
  const dom = new JSDOM(markup, { url: 'https://example.test/unipulse/', runScripts: 'outside-only' });
  const { window } = dom;
  const fixed = Date.parse('2026-11-21T07:00:00Z');
  window.Date = class extends Date {
    constructor(...args) { super(...(args.length ? args : [fixed])); }
    static now() { return fixed; }
  };
  window.matchMedia = () => ({ matches: false });
  const answers = {
    '/api/unipulse/auth/me': { account: null }, '/api/unipulse/catalog': catalog,
    '/api/unipulse/events': [], '/api/unipulse/teams': [], '/api/unipulse/counts': {}, '/api/unipulse/me': { player: null, rooms: [] },
  };
  window.fetch = async (path) => {
    const key = String(path).split('?')[0];
    return { ok: true, status: 200, json: async () => answers[key] ?? {} };
  };
  window.eval(scripts.join('\n'));
  for (let i = 0; i < 20; i += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  return dom;
}

test('imported events show on the list with their source and open on the official page', async () => {
  const dom = await openApp([
    imported('x-tntm-1447-tntm-ro'),
    imported('x-tntm-1999-tntm-ro', { title: 'Polyxena', eventStatus: 'cancelled', url: 'https://www.tntm.ro/programul-lunii/polyxena/' }),
  ]);
  const doc = dom.window.document;
  try {
    const card = doc.querySelector('#event-list [data-id="x-tntm-1447-tntm-ro"]');
    assert.ok(card, 'the imported event is listed');
    const cancelled = doc.querySelector('#event-list [data-id="x-tntm-1999-tntm-ro"]');
    assert.match(cancelled.textContent, /Anulat/);
    card.querySelector('.ev-open').click();
    const detail = doc.querySelector('#detail-body');
    assert.match(detail.querySelector('.d-org').textContent, /Preluat de pe Teatrul Național Timișoara/);
    const official = detail.querySelector('a.btn.outline');
    assert.equal(official.href, 'https://www.tntm.ro/programul-lunii/absurdinia-12/');
    assert.match(official.textContent, /Pagina oficială a evenimentului/);
    assert.match(detail.textContent, /Preluat automat de pe Teatrul Național Timișoara/);
    doc.querySelector('[data-id="x-tntm-1999-tntm-ro"] .ev-open').click();
    assert.match(doc.querySelector('#detail-body').textContent, /Anulat de organizator/);
  } finally {
    dom.window.close();
  }
});

test('an imported event with the same official link as a static one replaces it and keeps the static id', async () => {
  const twin = imported('x-upt-forum', {
    title: 'Forumul Educației 2026 (actualizat)', category: 'conferinta', venueName: 'Biblioteca UPT', lat: 45.7476, lng: 21.2263,
    url: 'http://upt.ro/evenimente/forumul-educatiei-2026-la-universitatea-politehnica-timisoara-/?utm_source=x',
    startISO: '2026-11-21T10:00:00+02:00', endISO: '2026-11-21T18:00:00+02:00', startOnly: undefined,
  });
  const dom = await openApp([twin]);
  const doc = dom.window.document;
  try {
    const cards = [...doc.querySelectorAll('#event-list .ev-card')].filter((c) => /Forumul Educației/.test(c.textContent));
    assert.equal(cards.length, 1, 'no duplicate on the list');
    assert.equal(cards[0].dataset.id, 'upt-forumul-educatiei-2026', 'participants stay attached to the static id');
    assert.match(cards[0].textContent, /actualizat/);
  } finally {
    dom.window.close();
  }
});

test('the app keeps working with the static selection when the catalog is unavailable', async () => {
  const dom = await openApp({ error: 'CHAT_UNAVAILABLE' });
  try {
    assert.ok(dom.window.document.querySelectorAll('#event-list .ev-card').length > 50);
  } finally {
    dom.window.close();
  }
});
