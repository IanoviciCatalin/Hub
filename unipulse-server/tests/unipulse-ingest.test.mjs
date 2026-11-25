// Importul automat de evenimente: conector TNTm, normalizare, duplicate, actualizări, anulări,
// arhivare după final și protecția datelor utilizatorilor. Doar date demonstrative, fără rețea.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { UniPulseStore } from '../server/unipulse-store.mjs';
import { unipulse } from '../server/unipulse-routes.mjs';
import { tntm, showTitle } from '../server/ingest/connectors/tntm.mjs';
import { parseIcal } from '../server/ingest/ical.mjs';
import { fetchSource, prepare, catalogId, SourceError } from '../server/ingest/pipeline.mjs';
import { runSource } from '../server/ingest/runner.mjs';
import { plainText, normalizeUrl, textSimilarity, tidyTitle } from '../server/ingest/text.mjs';
import { localToUtc, toLocalISO, parseIsoDate, durationMinutes } from '../server/ingest/time.mjs';
import { matchScore } from '../server/ingest/dedup.mjs';
import { CATALOG_LIMITS } from '../server/unipulse-catalog.mjs';

const ICS = await readFile(new URL('./fixtures/tntm.ics', import.meta.url), 'utf8');
const NOW = Date.parse('2026-11-25T08:00:00Z');
const HOUR = 3600000, DAY = 24 * HOUR;

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
// Ca ctx.storage.transactionSync: totul sau nimic.
function newStore() {
  const sql = memorySql();
  const transaction = (fn) => {
    sql.exec('BEGIN');
    try { const result = fn(); sql.exec('COMMIT'); return result; }
    catch (error) { sql.exec('ROLLBACK'); throw error; }
  };
  return { store: new UniPulseStore(sql, { transaction }), sql };
}
const ok = (result) => { assert.equal(result.error, undefined, result.error); return result.ok; };

async function items(text = ICS, now = NOW) {
  return Promise.all(tntm.parse(text).map((raw) => prepare(raw, tntm, { now })));
}
function commit(store, list, opts = {}) {
  ok(store.importSource('tntm', [{ id: 'tntm', name: tntm.name }]));
  return ok(store.importCommit('tntm', list, { fullFeed: true, now: NOW, ...opts }));
}
const fakeFetch = (responses) => {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    const next = responses.shift();
    if (next instanceof Error) throw next;
    const { status = 200, body = '', headers = {}, finalUrl = url } = next;
    const response = new Response(body, { status, headers });
    Object.defineProperty(response, 'url', { value: finalUrl });
    return response;
  };
  fn.calls = calls;
  return fn;
};
const ana = { id: 'p-ana', name: 'Ana' };

test('the TNTm iCal feed becomes clean events in Bucharest time, with the official link and no copied text', async () => {
  const raws = tntm.parse(ICS);
  assert.equal(raws.length, 4);
  const [absurdinia, amintiri, anna, pinocchio] = await items();
  assert.equal(absurdinia.event.title, 'Absurdinia');
  assert.equal(toLocalISO(absurdinia.event.startAt), '2026-11-25T19:00:00+02:00');
  assert.equal(absurdinia.event.endKnown, false, 'DTEND equals DTSTART in the feed, so the end is unknown');
  assert.equal(absurdinia.event.url, 'https://www.tntm.ro/programul-lunii/absurdinia-12/');
  assert.equal(absurdinia.event.locationName, 'Teatrul Național – Studio „UTU Strugari”');
  assert.equal(absurdinia.event.address, 'Mărășești 2, et.V');
  assert.deepEqual([absurdinia.event.lat, absurdinia.event.lng, absurdinia.event.geoSource], [45.755069, 21.225713, 'source']);
  assert.equal(absurdinia.event.category, 'cultura');
  assert.equal(absurdinia.event.imageUrl, null, 'images are never reused without permission');
  assert.doesNotMatch(absurdinia.event.description, /DKB|eventim|nbsp/);
  assert.deepEqual(absurdinia.problems, []);
  assert.equal(amintiri.event.title, 'Amintiri din Epoca de Școală', 'folded SUMMARY lines are joined');
  assert.equal(toLocalISO(amintiri.event.endAt), '2026-12-01T20:05:00+02:00', 'duration "1h 5" from the description');
  assert.equal(amintiri.event.endKnown, true);
  assert.equal(anna.event.address, 'Mărășești 2', 'cedilla letters become comma letters and the city is dropped');
  assert.equal(anna.event.venueKey, 'tntm-sala-mare');
  assert.deepEqual(pinocchio.event.tags, ['Teatru', 'Copii']);
  assert.match(pinocchio.event.description, /\(Copii\)/);
});

test('text, time and URL helpers handle the formats seen in real sources', () => {
  assert.equal(plainText('𝗔𝘁𝘁𝗲𝗻𝘇𝗶𝗼𝗻𝗲 <b>bellezze</b> &amp; [DKB url="x"] ok'), 'Attenzione bellezze & ok');
  assert.equal(tidyTitle('SUNT O BABĂ COMUNISTĂ'), 'Sunt o Babă Comunistă');
  assert.equal(tidyTitle('Hackathon E³UDRES²'), 'Hackathon E3UDRES2');
  assert.equal(showTitle('EDMOND - Sala Mare - 9 dec. 26 19:00', 'Sala Mare, Mărăşeşti 2'), 'Edmond');
  assert.equal(normalizeUrl('http://WWW.iabilet.ro/bilete-x-1/?utm_source=a&b=2#top'), 'https://iabilet.ro/bilete-x-1?b=2');
  assert.equal(normalizeUrl('javascript:alert(1)'), '');
  assert.ok(textSimilarity('Bilete Anna Karenina 2026', 'ANNA KARENINA') > 0.95);
  assert.ok(textSimilarity('Anna Karenina', 'Zorba Grecul') < 0.2);
  assert.equal(toLocalISO(localToUtc(2026, 7, 10, 20, 0)), '2026-07-10T20:00:00+03:00', 'summer time is +03:00');
  assert.equal(toLocalISO(localToUtc(2026, 3, 29, 4, 0)), '2026-03-29T04:00:00+03:00', 'after the spring change');
  assert.deepEqual(parseIsoDate('2027-07-07'), { ms: localToUtc(2027, 7, 7), dateOnly: true });
  assert.equal(parseIsoDate('2026-11-28T23:00:00').ms, Date.parse('2026-11-28T21:00:00Z'), 'local JSON-LD time is Bucharest time');
  assert.equal(parseIsoDate('2026-11-28T23:00:00+0100').ms, Date.parse('2026-11-28T22:00:00Z'));
  assert.equal(durationMinutes('durata spectacolului: 2h 20'), 140);
  assert.equal(durationMinutes('fără durată'), null);
  assert.equal(parseIcal('BEGIN:VEVENT\r\nSUMMARY:a\\, b\\nc\r\nEND:VEVENT').at(0).SUMMARY.value, 'a, b\nc');
});

test('fetching retries temporary errors with backoff and stops on blocks, foreign hosts and huge answers', async () => {
  const waits = [];
  const wait = async (ms) => { waits.push(ms); };
  let fetchImpl = fakeFetch([{ status: 503 }, new TypeError('network down'), { status: 200, body: ICS }]);
  assert.equal(await fetchSource(tntm, { fetchImpl, wait }), ICS);
  assert.deepEqual(waits, [2000, 8000]);

  waits.length = 0;
  fetchImpl = fakeFetch([{ status: 429, headers: { 'Retry-After': '5' } }, { status: 200, body: 'BEGIN:VCALENDAR' }]);
  await fetchSource(tntm, { fetchImpl, wait });
  assert.deepEqual(waits, [5000], 'Retry-After is respected');

  fetchImpl = fakeFetch([{ status: 403 }]);
  await assert.rejects(fetchSource(tntm, { fetchImpl, wait }), (e) => e instanceof SourceError && e.message === 'BLOCKED' && !e.temporary);
  assert.equal(fetchImpl.calls.length, 1, 'a block is never retried');

  fetchImpl = fakeFetch([{ status: 200, body: 'x', finalUrl: 'https://evil.example/' }]);
  await assert.rejects(fetchSource(tntm, { fetchImpl, wait }), /REDIRECT_NOT_ALLOWED/);
  await assert.rejects(fetchSource({ ...tntm, url: 'https://evil.example/feed' }, { fetchImpl, wait }), /HOST_NOT_ALLOWED/);

  fetchImpl = fakeFetch([{ status: 200, body: 'x'.repeat(2 * 1024 * 1024 + 10) }]);
  await assert.rejects(fetchSource(tntm, { fetchImpl, wait }), /TOO_LARGE/);

  fetchImpl = fakeFetch([{ status: 500 }, { status: 500 }, { status: 500 }, { status: 500 }]);
  await assert.rejects(fetchSource(tntm, { fetchImpl, wait }), /HTTP_500/);
  assert.equal(fetchImpl.calls.length, 4, 'three retries, then the run fails');
});

test('new events wait for admin approval, then appear in the public catalog; re-runs are idempotent', async () => {
  const { store } = newStore();
  const first = commit(store, await items());
  assert.deepEqual([first.counts.created, first.counts.queued], [4, 4]);
  assert.deepEqual(ok(store.catalogList('timisoara')), [], 'nothing is public before review');

  const overview = ok(store.importOverview([{ id: 'tntm', name: tntm.name }]));
  assert.equal(overview.review.length, 4);
  const review = overview.review.find((r) => r.candidate.title === 'Absurdinia');
  assert.deepEqual(review.actions, ['approve', 'reject']);
  ok(store.importDecide(review.id, 'approve', { email: 'admin@example.test' }));
  assert.equal(store.importDecide(review.id, 'approve', {}).error, 'REVIEW_CLOSED');

  const [shown] = ok(store.catalogList('timisoara'));
  assert.equal(shown.id, 'x-tntm-1447-tntm-ro');
  assert.equal(shown.id, catalogId('tntm', '1447@tntm.ro'));
  assert.match(shown.id, /^[a-z0-9][a-z0-9-]{2,79}$/, 'the id works with participation and chat');
  assert.equal(shown.startISO, '2026-11-25T19:00:00+02:00');
  assert.equal(shown.startOnly, true);
  assert.equal(shown.url, 'https://www.tntm.ro/programul-lunii/absurdinia-12/');
  assert.equal(shown.sourceName, 'Teatrul Național Timișoara');
  assert.equal(shown.imported, true);

  const again = commit(store, await items());
  assert.deepEqual([again.counts.created, again.counts.unchanged, again.counts.updated], [0, 4, 0]);
  assert.equal(ok(store.importOverview([])).review.length, 3, 'unchanged events are not queued twice');

  const dry = ok(store.importCommit('tntm', (await items()).map((i) => ({ ...i, hash: 'changed' })), { dryRun: true, now: NOW }));
  assert.equal(dry.counts.updated, 4);
  assert.equal(ok(store.importOverview([])).changes.length, 0, 'a dry run writes no event data');
});

test('changes, postponements and cancellations update the event and keep its history, participants and chat', async () => {
  const { store } = newStore();
  ok(store.importSource('tntm', [{ id: 'tntm', name: tntm.name }]));
  ok(store.importSetSource('tntm', { publishMode: 'auto' }));
  commit(store, await items());
  const id = 'x-tntm-1458-tntm-ro';
  assert.equal(ok(store.catalogList('timisoara')).length, 4, 'auto mode publishes directly');
  ok(store.join(id, ana));
  ok(store.send(id, ana, 'Ne vedem acolo'));

  const moved = ICS.replace('DTSTART:20261206T160000Z', 'DTSTART:20261207T170000Z');
  const result = commit(store, await items(moved));
  assert.equal(result.counts.updated, 1);
  const anna = ok(store.catalogList('timisoara')).find((e) => e.id === id);
  assert.equal(anna.startISO, '2026-12-07T19:00:00+02:00');
  const history = ok(store.importOverview([])).changes.filter((c) => c.eventId === id).map((c) => c.field);
  assert.ok(history.includes('start_at'));

  const cancelled = moved.replace('SUMMARY:ANNA KARENINA - Sala Mare', 'STATUS:CANCELLED\r\nSUMMARY:ANNA KARENINA - Sala Mare');
  commit(store, await items(cancelled));
  const after = ok(store.catalogList('timisoara')).find((e) => e.id === id);
  assert.equal(after.eventStatus, 'cancelled', 'a cancelled event stays visible, marked');
  assert.equal(ok(store.event(id, ana)).count, 1, 'participants survive the update');
  assert.equal(ok(store.messages(id, ana)).messages.length, 1, 'chat survives the update');
  assert.equal(store.join(id, { id: 'p-bogdan', name: 'Bogdan' }).error, 'EVENT_NOT_FOUND', 'no new participants after cancellation');
  ok(store.send(id, ana, 'Păcat că s-a anulat'));
});

test('an event missing from the feed is flagged for review after 3 runs, never deleted; an empty feed changes nothing', async () => {
  const { store } = newStore();
  ok(store.importSource('tntm', [{ id: 'tntm', name: tntm.name }]));
  ok(store.importSetSource('tntm', { publishMode: 'auto' }));
  commit(store, await items());
  const without = (await items()).filter((i) => i.event.externalId !== '1460@tntm.ro');
  commit(store, without);
  commit(store, []);
  commit(store, without);
  assert.equal(ok(store.importOverview([])).review.length, 0, 'two misses: still waiting');
  commit(store, without);
  const [flag] = ok(store.importOverview([])).review;
  assert.equal(flag.kind, 'removed');
  assert.equal(flag.eventId, 'x-tntm-1460-tntm-ro');
  assert.ok(ok(store.catalogList('timisoara')).some((e) => e.id === flag.eventId), 'still public until the admin decides');
  ok(store.importDecide(flag.id, 'hide', { email: 'admin@example.test' }));
  assert.ok(!ok(store.catalogList('timisoara')).some((e) => e.id === flag.eventId));
});

test('an import that fails halfway leaves the catalog exactly as it was', async () => {
  const { store } = newStore();
  const list = await items();
  list[2] = { ...list[2], event: { ...list[2].event, title: null } }; // impossible row: NOT NULL title
  assert.throws(() => commit(store, list), /NOT NULL/);
  const overview = ok(store.importOverview([]));
  assert.equal(overview.review.length, 0);
  assert.equal(overview.runs.length, 0);
  assert.deepEqual(ok(store.catalogList('timisoara')), []);
});

test('invalid events go to review with the reason instead of being imported', async () => {
  const { store } = newStore();
  const outside = ICS.replaceAll('GEO:45.756068;21.225809', 'GEO:44.43;26.10').replace(/LOCATION:Sala Mare[^\r]*\r\n/g, 'LOCATION:Undeva\r\n');
  const result = commit(store, await items(outside));
  assert.equal(result.counts.rejected, 2);
  const invalid = ok(store.importOverview([])).review.filter((r) => r.kind === 'invalid');
  assert.equal(invalid.length, 2);
  assert.match(invalid[0].reason, /NO_PLACE/);
});

test('the same event from another source is linked, a doubtful one is queued, an unrelated one is new', async () => {
  const { store } = newStore();
  ok(store.importSource('tntm', [{ id: 'tntm', name: tntm.name }]));
  ok(store.importSetSource('tntm', { publishMode: 'auto' }));
  commit(store, await items());
  const base = (await items())[2].event; // Anna Karenina, Sala Mare, 6 dec 18:00
  const other = (externalId, changes) => ({
    event: { ...base, externalId, sourceId: 'demo', sourceName: 'Demo bilete', url: `https://bilete.example/${externalId}`, organizer: null, description: null, price: 45, priceInfo: '45 lei', ...changes },
    problems: [], past: false, hash: externalId,
  });
  ok(store.importSource('demo', [{ id: 'demo', name: 'Demo bilete' }]));
  const result = ok(store.importCommit('demo', [
    other('d-1', { title: 'Bilete ANNA KARENINA 2026', startAt: base.startAt + 15 * 60000 }),
    other('d-2', { title: 'Anna Karenina – lectură', startAt: base.startAt + HOUR }),
    other('d-3', { title: 'Concert de Crăciun', startAt: base.startAt + 3 * HOUR }),
  ], { now: NOW }));
  assert.deepEqual([result.counts.linked, result.counts.queued, result.counts.created], [1, 2, 1]);
  assert.equal(matchScore({ ...base, title: 'Anna Karenina' }, base).score, 1, 'same url: same event');

  const list = ok(store.catalogList('timisoara'));
  const anna = list.find((e) => e.id === 'x-tntm-1458-tntm-ro');
  assert.equal(anna.price, 45, 'a second source fills empty fields');
  assert.equal(anna.url, 'https://www.tntm.ro/programul-lunii/anna-karenina-12/', 'the original source keeps its link');
  const review = ok(store.importOverview([])).review;
  const doubt = review.find((r) => r.kind === 'possible_duplicate');
  assert.equal(doubt.match.eventId, 'x-tntm-1458-tntm-ro');
  ok(store.importDecide(doubt.id, 'separate', { email: 'admin@example.test' }));
  assert.ok(ok(store.catalogList('timisoara')).some((e) => e.id === 'x-demo-d-2'));
});

test('finished events disappear automatically; rows are deleted only when no student data hangs on them', async () => {
  const { store } = newStore();
  ok(store.importSource('tntm', [{ id: 'tntm', name: tntm.name }]));
  ok(store.importSetSource('tntm', { publishMode: 'auto' }));
  commit(store, await items());
  const absurdinia = 'x-tntm-1447-tntm-ro', anna = 'x-tntm-1458-tntm-ro';
  ok(store.join(absurdinia, ana));
  ok(store.send(absurdinia, ana, 'Vin și eu'));

  const evening = Date.parse('2026-11-25T23:00:00Z');
  assert.ok(!store.catalog.list('timisoara', evening).some((e) => e.id === absurdinia), 'hidden as soon as it ends');
  const archived = store.catalog.maintenance(Date.parse('2026-11-26T08:00:00Z'));
  assert.equal(archived.archived, 1);
  assert.equal(store.catalog.get(absurdinia).publish_state, 'archived');
  assert.equal(store.join(absurdinia, { id: 'p-x', name: 'X' }).error, 'EVENT_NOT_FOUND');
  assert.equal(ok(store.messages(absurdinia, ana)).messages.length, 1, 'the chat stays readable for participants');

  const purge = store.catalog.maintenance(Date.parse('2026-12-23T08:00:00Z'));
  assert.deepEqual([purge.archived, purge.purged], [3, 0], 'archived, but kept for 30 days');
  const purge2 = store.catalog.maintenance(Date.parse('2027-02-01T08:00:00Z'));
  assert.deepEqual([purge2.purged, purge2.keptWithUserData], [3, 1]);
  assert.equal(store.catalog.get(anna), null, 'deleted: nobody participated');
  assert.ok(store.catalog.get(absurdinia), 'kept archived: it has a participant and a message');
  assert.equal(ok(store.event(absurdinia, ana)).count, 1);
  assert.ok(CATALOG_LIMITS.archiveAfter <= 6 * HOUR);
});

test('a run records failures, degrades after three, stops on a block and skips disabled sources', async () => {
  const { store } = newStore();
  const wait = async () => {};
  const down = () => fakeFetch([{ status: 502 }, { status: 502 }, { status: 502 }, { status: 502 }]);
  for (let i = 0; i < 3; i += 1) {
    const result = await runSource(store, 'tntm', { fetchImpl: down(), wait, now: NOW });
    assert.deepEqual([result.status, result.error], ['error', 'HTTP_502']);
  }
  let [source] = ok(store.importOverview([{ id: 'tntm', name: tntm.name }])).sources;
  assert.equal(source.state, 'degraded');
  assert.deepEqual(ok(store.catalogList('timisoara')), [], 'failures never touch the catalog');

  const good = await runSource(store, 'tntm', { fetchImpl: fakeFetch([{ body: ICS }]), wait, now: NOW });
  assert.equal(good.status, 'ok');
  assert.equal(good.counts.created, 4);
  [source] = ok(store.importOverview([])).sources;
  assert.deepEqual([source.state, source.failures, source.pending], ['ok', 0, 4]);

  await runSource(store, 'tntm', { fetchImpl: fakeFetch([{ status: 403 }]), wait, now: NOW });
  [source] = ok(store.importOverview([])).sources;
  assert.deepEqual([source.state, source.enabled], ['blocked', false]);
  const skipped = await runSource(store, 'tntm', { fetchImpl: fakeFetch([]), wait, now: NOW });
  assert.equal(skipped.status, 'disabled');
  const dry = await runSource(store, 'tntm', { dryRun: true, fetchImpl: fakeFetch([{ body: ICS }]), wait, now: NOW });
  assert.equal(dry.status, 'ok', 'a disabled source can still be simulated');
});

test('GET /api/unipulse/catalog serves published imported events and rejects unknown cities', async () => {
  const { store } = newStore();
  ok(store.importSource('tntm', [{ id: 'tntm', name: tntm.name }]));
  ok(store.importSetSource('tntm', { publishMode: 'auto' }));
  commit(store, await items(ICS, Date.now() - DAY), { now: Date.now() - DAY });
  const env = { UNIPULSE_HUB: { getByName: () => store }, DB: {} };
  const call = (path) => unipulse(new Request('https://x.test' + path), env, new URL('https://x.test' + path));
  const response = await call('/api/unipulse/catalog?city=timisoara');
  assert.equal(response.status, 200);
  const list = await response.json();
  assert.ok(list.every((e) => e.imported && e.url.startsWith('https://www.tntm.ro/')));
  assert.equal((await call('/api/unipulse/catalog?city=atlantis')).status, 400);
});
