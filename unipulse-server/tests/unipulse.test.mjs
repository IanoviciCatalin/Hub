import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const files = ['index.html', 'js/data.js', 'js/events.js', 'js/events-timisoara.js', 'js/app.js'];
const [markup, ...scripts] = await Promise.all(files.map(file => readFile(new URL('../../public/unipulse/' + file, import.meta.url), 'utf8')));

function openCalendar(instant, profile, search = '') {
  const dom = new JSDOM(markup, { url: 'https://example.test/unipulse/' + search, runScripts: 'outside-only' });
  const { window } = dom;
  const fixed = Date.parse(instant);
  window.Date = class extends Date {
    constructor(...args) { super(...(args.length ? args : [fixed])); }
    static now() { return fixed; }
  };
  window.matchMedia = () => ({ matches: false });
  if (profile) window.localStorage.setItem('unipulse:profile', JSON.stringify(profile));
  window.eval(scripts.join('\n'));
  return dom;
}

test('topics follow the selected event types when loading, editing and saving a profile', () => {
  const dom = openCalendar('2026-11-21T09:00:00Z', {
    city: 'timisoara', cats: ['cultura'], topics: ['Fotbal', 'Muzică'], scope: 'mine'
  });
  try {
    const doc = dom.window.document;
    const saved = () => JSON.parse(dom.window.localStorage.getItem('unipulse:profile'));
    assert.deepEqual(saved().topics, ['Muzică']);
    doc.querySelector('#btn-prefs').click();
    const category = key => doc.querySelector('#pf-cats [data-v="' + key + '"]');
    const topic = key => doc.querySelector('#pf-topics [data-v="' + key + '"]');
    assert.equal(topic('Fotbal').disabled, true);
    category('sport').click();
    topic('Fotbal').click();
    assert.equal(topic('Fotbal').getAttribute('aria-pressed'), 'true');
    category('social').click();
    category('cultura').click();
    assert.equal(topic('Muzică').getAttribute('aria-pressed'), 'true');
    category('sport').click();
    assert.equal(topic('Fotbal').disabled, true);
    assert.equal(topic('Fotbal').getAttribute('aria-pressed'), 'false');
    category('social').click();
    assert.equal(doc.querySelectorAll('#pf-topics button:enabled').length, 0);
    doc.querySelector('#pf-save').click();
    assert.deepEqual(saved().topics, []);
    assert.equal(doc.querySelector('.topbar #btn-city + #show-all-events')?.id, 'show-all-events');
  } finally {
    dom.window.close();
  }
});

test('direct entry and visible all-events control bypass saved preferences and reset date and free filters', () => {
  const dom = openCalendar('2026-11-20T18:00:00Z', {
    city: 'timisoara', cats: ['hackathon'], topics: [], scope: 'mine'
  }, '?view=all');
  const doc = dom.window.document;
  const cards = () => [...doc.querySelectorAll('#event-list .ev-card')];
  try {
    assert.equal(cards().length, 120);
    const originalOrder = cards().map(card => card.dataset.id);
    const matches = () => cards().filter(card => card.querySelector('.interest-badge'));
    assert.deepEqual(matches().map(card => card.dataset.id), ['upt-eudres-hackathon-2026']);
    assert.ok(cards().some(card => card.textContent.includes('AI Prototyping Bootcamp')));
    assert.ok(cards().some(card => card.textContent.includes('E³UDRES²')));
    doc.querySelector('#show-personal-events').click();
    assert.equal(cards().length, 1);
    assert.equal(matches().length, 0);
    doc.querySelector('#free-only').click();
    assert.equal(cards().length, 0);
    doc.querySelector('#show-all-events').click();
    assert.equal(cards().length, 120);
    assert.deepEqual(cards().map(card => card.dataset.id), originalOrder);
    assert.equal(matches().length, 1);
    assert.equal(doc.querySelector('#free-only').checked, false);
    assert.match(doc.querySelector('#result-count').textContent, /120 evenimente/);
    doc.querySelector('[data-id="uvt-andreea-medar-2026"] .ev-open').click();
    assert.match(doc.querySelector('#detail-body a.btn.outline').href, /^https:\/\/uvt\.ro\//);
  } finally {
    dom.window.close();
  }
});

test('expired confirmed events disappear while a future event stays on its published calendar dates', () => {
  const dom = openCalendar('2026-11-28T12:00:00Z');
  try {
    const list = dom.window.document.querySelector('#event-list').textContent;
    assert.doesNotMatch(list, /Forumul Educației|Prototyping Bootcamp|Window Has Been/);
    assert.match(list, /E³UDRES²/);
    assert.match(list, /10[–-]11 dec\. 2026/);
  } finally {
    dom.window.close();
  }
});

test('imported listings retain provenance, event icons and ticket details', () => {
  const dom = openCalendar('2026-11-21T09:00:00Z');
  const doc = dom.window.document;
  const event = (id) => doc.querySelector('#event-list [data-id="' + id + '"]');
  const details = () => doc.querySelector('#detail-body').textContent;
  try {
    const rapido = event('tm-rapido-presto-20261130');
    assert.match(rapido.textContent, /de la 22,42 lei/);
    assert.equal(rapido.querySelector('.ev-icon').textContent, '🎭');
    rapido.querySelector('.ev-open').click();
    assert.match(details(), /32,42 lei; elevi, studenți și pensionari 22,42 lei/);
    assert.match(details(), /Din agenda orașului.*Pin orientativ.*iabilet\.ro/s);
    assert.doesNotMatch(details(), /Sursă oficială/);
    assert.match(doc.querySelector('#detail-body a.btn.outline').href, /^https:\/\/www\.tixhit\.com\//);
    event('tm-spargatorul-de-nuci-20261210').querySelector('.ev-open').click();
    assert.match(details(), /Bilete epuizate/);
    doc.querySelector('#free-only').click();
    assert.ok(event('tm-targ-craciun-2026'));
    assert.ok(event('tm-faberland-2026'));
    assert.equal(event('tm-patinoar-parcul-central-2026'), null);
    assert.equal(event('tm-spargatorul-de-nuci-20261210'), null);
    assert.equal(event('tm-rapido-presto-20261130'), null);
  } finally {
    dom.window.close();
  }
});

test('five category filters organize new and existing events and keep direct booking links', () => {
  const dom = openCalendar('2026-11-22T12:00:00+02:00', null, '?view=all');
  try {
    const doc = dom.window.document;
    const chips = [...doc.querySelectorAll('#category-chips .chip')];
    assert.equal(chips.length, 5);
    assert.equal(new Set(chips.map(chip => chip.style.getPropertyValue('--c'))).size, 5);
    const select = key => doc.querySelector('#category-chips [data-cat="' + key + '"]').click();
    const card = id => doc.querySelector('#event-list [data-id="' + id + '"]');
    select('cultura');
    assert.ok(card('tm-cinema-faust-20261126'));
    assert.ok(card('tm-poftim-opera-tur-ghidat-20261217'));
    assert.equal(card('tm-iabilet-trooper-20270605'), null);
    card('tm-cinema-faust-20261126').querySelector('.ev-open').click();
    assert.match(doc.querySelector('#detail-body a.btn.outline').href, /^https:\/\/cinema-timisoara\.ro\//);
    assert.match(doc.querySelector('#detail-body').textContent, /20 lei elevi și studenți/);
    select('cultura');
    select('social');
    assert.ok(card('tm-iabilet-trooper-20270605'));
    assert.ok(card('tm-luna-amara-20261205'));
    assert.equal(card('tm-cinema-faust-20261126'), null);
    select('social');
    select('sport');
    assert.ok(card('tm-catan-5-20261126'));
    assert.equal(card('tm-luna-amara-20261205'), null);
  } finally {
    dom.window.close();
  }
});
