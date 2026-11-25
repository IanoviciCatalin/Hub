import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';

const files = ['index.html', 'js/campus-data.js', 'js/campus-nav.js'];
const [markup, ...scripts] = await Promise.all(files.map(file => readFile(new URL('../../public/unipulse/' + file, import.meta.url), 'utf8')));
const openRoom = (query) => {
  const dom = new JSDOM(markup, { url: 'https://example.test/unipulse/#sala=' + encodeURIComponent(query), runScripts: 'outside-only' });
  dom.window.UniPulse = { switchTab() {} };
  dom.window.eval(scripts.join('\n'));
  return dom;
};

test('campus pilot reaches the correct entry and allows guided steps forwards and backwards', () => {
  const dom = openRoom('B419');
  try {
    const doc = dom.window.document;
    const click = selector => doc.querySelector(selector).click();
    assert.match(doc.getElementById('cn-result').textContent, /etajul 4/i);
    click('[data-cn-guide-open]');
    assert.match(doc.getElementById('cn-guide-title').textContent, /Electro/);
    click('[data-cn-guide-step="0"]');
    assert.match(doc.getElementById('cn-guide-title').textContent, /Corp B/);
    click('[data-cn-guide-step="1"]');
    click('[data-cn-guide-step="2"]');
    assert.match(doc.getElementById('cn-guide').textContent, /în dreapta/);
    click('[data-cn-guide-camera]');
    assert.equal(dom.window.document.getElementById('cn-360-frame').src, 'https://visit360.upt.ro/#media=394&yaw=-6.86&pitch=0.01&fov=75');
    click('#cn-360-close');
    assert.equal(doc.activeElement, doc.querySelector('[data-cn-guide-camera]'));
    click('[data-cn-guide-step="1"]');
    assert.match(doc.getElementById('cn-guide-title').textContent, /etajul 4/);
  } finally { dom.window.close(); }
});

test('named pilot labs and the generic room guide coexist', () => {
  for (const [room, expected] of [['Aurel Bărglăzan', /Corp M\.H\..*Parter/s], ['Analiza Mișcării', /Etajul 2/], ['N 210', /De la intrare până la sală/]]) {
    const dom = openRoom(room);
    try {
      const doc = dom.window.document;
      assert.match(doc.getElementById('cn-result').textContent, expected);
      assert.equal(!!doc.querySelector('[data-cn-guide-open]'), room !== 'N 210');
      if (room === 'Aurel Bărglăzan') {
        doc.querySelector('[data-cn-guide-open]').click();
        assert.equal(doc.querySelectorAll('[data-cn-guide-approach]').length, 4);
      }
    } finally { dom.window.close(); }
  }
});
