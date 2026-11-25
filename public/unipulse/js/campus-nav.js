/* =========================================================
   UniPulse – Ghid campus UPT (anul I, Mecanică și AC)
   Scrii sala din orar, aplicația îți arată clădirea și etajul,
   te duce pe jos până la intrare și îți arată drumul în turul 360°.
   Depinde de: campus-data.js și API-ul window.UniPulse din app.js.
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const api = () => window.UniPulse;
  const B = CAMPUS_BUILDINGS;

  const store = {
    get(k, d) { try { const v = localStorage.getItem('unipulse:campus:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) {
      try { localStorage.setItem('unipulse:campus:' + k, JSON.stringify(v)); } catch { /* stocare indisponibilă */ }
      // app.js salvează orarul în cont (sincronizare între dispozitive).
      document.dispatchEvent(new CustomEvent('unipulse:stored', { detail: k }));
    },
  };
  const toast = (m) => api()?.toast(m);
  const getMap = () => api()?.map || null;
  const isMobile = () => window.innerWidth <= 820;

  /* ---------- Geometrie ---------- */
  const R = 6371000;
  const rad = (d) => d * Math.PI / 180;
  function dist(a, b) {
    const dLat = rad(b[1] - a[1]), dLng = rad(b[0] - a[0]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function bearing(a, b) {
    const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1]));
    const x = Math.cos(rad(a[1])) * Math.sin(rad(b[1])) - Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }
  // Proiecția unui punct pe traseu: distanța față de linie și cât s-a parcurs de la start.
  function project(p, coords, cum) {
    const kx = Math.cos(rad(p[1])) * 111320, ky = 110540;
    let best = { off: Infinity, along: 0, i: 0 };
    for (let i = 0; i < coords.length - 1; i++) {
      const a = coords[i], b = coords[i + 1];
      const ax = (a[0] - p[0]) * kx, ay = (a[1] - p[1]) * ky, bx = (b[0] - p[0]) * kx, by = (b[1] - p[1]) * ky;
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
      const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
      const qx = ax + t * dx, qy = ay + t * dy;
      const off = Math.hypot(qx, qy);
      if (off < best.off) best = { off, along: cum[i] + t * (cum[i + 1] - cum[i]), i };
    }
    return best;
  }
  function pointAt(coords, cum, s) {
    for (let i = 0; i < coords.length - 1; i++) {
      if (s <= cum[i + 1]) {
        const t = (s - cum[i]) / ((cum[i + 1] - cum[i]) || 1);
        return [coords[i][0] + t * (coords[i + 1][0] - coords[i][0]), coords[i][1] + t * (coords[i + 1][1] - coords[i][1])];
      }
    }
    return coords[coords.length - 1];
  }
  const inArea = (c) => c[0] > CAMPUS_AREA[0][0] && c[0] < CAMPUS_AREA[1][0] && c[1] > CAMPUS_AREA[0][1] && c[1] < CAMPUS_AREA[1][1];

  /* ---------- Formatare ---------- */
  const fmtDist = (m) => m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : (m >= 100 ? Math.round(m / 10) * 10 : Math.max(5, Math.round(m / 5) * 5)) + ' m';
  const fmtMin = (s) => { const m = Math.max(1, Math.round(s / 60)); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
  const fmtClock = (d) => d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  const floorLabel = (f) => f === 0 ? 'parter' : `etajul ${f}`;
  const WALK = 1.25; // m/s, ritm de mers obișnuit

  /* =========================================================
     1. Codul sălii -> clădire, corp, etaj
     ========================================================= */
  const LETTER_BUILDING = { A: 'electroA', B: 'electroB', C: 'electroC', D: 'electroD', M: 'mecM', N: 'mecN' };

  function findPlace(q) {
    const n = norm(q).replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (n.length < 3) return null;
    let best = null;
    for (const p of CAMPUS_PLACES) {
      for (const a of [p.name, ...(p.aliases || [])]) {
        const an = norm(a).replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim();
        const hit = n === an || (an.length >= 4 && n.includes(an)) || (n.length >= 5 && an.includes(n));
        if (hit && (!best || an.length > best.len)) best = { place: p, len: an.length };
      }
    }
    return best?.place || null;
  }

  function roomResult(building, num, extra = '', label) {
    const floor = num != null ? Number(String(num)[0]) : null;
    const code = label || `${building === 'spm' ? 'SPM ' : building === 'aspc' ? 'ASPC ' : ''}${num ?? ''}${extra}`.trim();
    return finalize({ code, building, floor });
  }

  function finalize(r) {
    const b = B[r.building];
    r.warnings = r.warnings || [];
    if (r.floor != null && b.levels && r.floor > b.levels - 1) {
      r.warnings.push(`${b.short} are ${b.levels} niveluri (parter + ${b.levels - 1}). Verifică dacă ai copiat bine codul sălii.`);
    }
    if (b.verify) r.warnings.push('Intrarea acestei clădiri nu e confirmată pe teren. Dacă e altfel, spune-ne și o corectăm.');
    r.ok = true;
    return r;
  }

  // Interpretează ce a scris studentul. Întoarce { ok, code, building, floor, place, warnings } sau { ok:false, message, options }.
  function parseRoom(input) {
    const raw = String(input || '').trim();
    if (!raw) return { ok: false, message: 'Scrie codul sălii din orar, de exemplu N 210 sau B419.' };
    const up = norm(raw).toUpperCase();
    const hasChimie = /CHIM/.test(up);

    // Corp X scris separat: „303 A corpul C”, „sala 104 corp D”
    const corp = up.match(/(\d)(\d{2})\s*([A-Z])?\b[^A-Z0-9]*(?:,|\s)*CORP(?:UL)?\s*([ABCD])\b/) || up.match(/CORP(?:UL)?\s*([ABCD])\b[^0-9]*?(\d)(\d{2})\s*([A-Z])?\b/);
    if (corp && !hasChimie) {
      const [letter, d1, d2, suf] = corp[4] && /[ABCD]/.test(corp[4]) && corp[0].trim().match(/^\d/) ? [corp[4], corp[1], corp[2], corp[3] || ''] : [corp[1], corp[2], corp[3], corp[4] || ''];
      return roomResult(LETTER_BUILDING[letter], d1 + d2, suf, `${letter}${d1}${d2}${suf}`);
    }

    const place = findPlace(raw);
    const c = up.replace(/\b(SALA|SALI|ROOM|AMFITEATRUL|AMF|LABORATORUL|LABORATOR|LAB|ET|ETAJ|ETAJUL)\b\.?/g, ' ').replace(/[\s.\-–_()]+/g, '');

    let m;
    if ((m = c.match(/^ASPC\/?(\d{3})([A-Z])?$/))) return roomResult('aspc', m[1], m[2] || '');
    if ((m = c.match(/^SPM\/?(\d{3})([A-E])?$/) || c.match(/^(2\d{2})([A-E])(?:SPM)?$/))) return roomResult('spm', m[1], m[2] || '', `SPM ${m[1]}${m[2] || ''}`);
    if ((m = c.match(/^(?:SPM)?P0?8\/?0?([1-9])$/))) return finalize({ code: `P08-0${m[1]}`, building: 'spm', floor: 0 });
    if ((m = c.match(/^(?:SPM)?MZ([1-9])$/))) return finalize({ code: `MZ${m[1]}`, building: 'spm', floor: null, floorText: 'mezanin' });
    if ((m = c.match(/^LN(\d)(\d)$/))) return finalize({ code: `LN ${m[1]}${m[2]}`, building: 'orologerie', floor: Number(m[1]) });
    if ((m = c.match(/^T(\d)(\d)$/))) {
      return {
        ok: false,
        message: `T${m[1]}${m[2]} e în Clădirea T (Cavitație) a Facultății de Mecanică, la ${floorLabel(Number(m[1]))}. Încă nu avem poziția exactă a clădirii pe hartă.`,
        options: [{ label: 'Du-mă la Facultatea de Mecanică', building: 'mecN' }],
      };
    }
    if ((m = c.match(/^([MN])(\d)(\d{2})([A-Z])?$/))) return roomResult(LETTER_BUILDING[m[1]], m[2] + m[3], m[4] || '', `${m[1]} ${m[2]}${m[3]}${m[4] || ''}`);
    if ((m = c.match(/^([ABCD])(\d)(\d{2})([A-Z])?(?:CHIMIE)?$/))) {
      if (hasChimie) return finalize({ code: `${m[1]}${m[2]}${m[3]}${m[4] || ''} (Chimie)`, building: 'chimie', floor: Number(m[2]) });
      const r = roomResult(LETTER_BUILDING[m[1]], m[2] + m[3], m[4] || '', `${m[1]}${m[2]}${m[3]}${m[4] || ''}`);
      if (m[1] === 'C') r.warnings.unshift('Dacă în orar scrie „Chimie” lângă sală, caută „C303 Chimie”: Facultatea de Chimie are și ea săli cu C.');
      const exact = CAMPUS_PLACES.find((p) => p.room === r.code);
      if (exact) r.place = exact;
      return r;
    }
    if ((m = c.match(/^D([1-9])$/))) return finalize({ code: `Amfiteatrul D${m[1]}`, building: 'electroD', floor: null, floorText: 'Corpul D' });

    if (place) {
      const b = B[place.building];
      return finalize({ code: place.room || place.name, building: place.building, floor: place.floor ?? null, floorText: place.floorText, place, nameOnly: !place.room, warnings: place.verify ? ['Poziția acestui loc nu e confirmată.'] : [] });
    }

    // Doar un număr: nu știm clădirea, întrebăm.
    if ((m = c.match(/^(\d)(\d{2})([A-Z])?$/))) {
      const n = m[1] + m[2] + (m[3] || '');
      return {
        ok: false,
        message: `Ce literă are sala ${n} în orar? Litera spune clădirea.`,
        options: [
          { label: `M ${n} – Mecanică, aripa veche`, query: `M${n}` },
          { label: `N ${n} – Mecanică, aripa nouă`, query: `N${n}` },
          { label: `B${n} – AC (Corp B)`, query: `B${n}` },
          { label: `A${n} – Electro, Corp A`, query: `A${n}` },
          { label: `${n} SPM`, query: `SPM ${n}` },
        ],
      };
    }
    return { ok: false, message: 'Nu am recunoscut sala. Scrie codul exact ca în orar: N 210, M 104, B419, A101, 225D SPM, ASPC 323 sau numele unui amfiteatru.' };
  }

  // Pașii din interiorul clădirii, de la ușă până la sală.
  function indoorSteps(r) {
    const b = B[r.building];
    const steps = [];
    steps.push(`Intră pe ${b.entranceName}.`);
    if (r.building === 'electroB') steps.push('Din hol, treci din Corpul A în Corpul B, turnul de 9 niveluri din capătul de vest.');
    else if (r.building === 'electroC') steps.push('Din hol, mergi spre capătul de est al clădirii, în Corpul C.');
    else if (b.wing && !r.place) steps.push(b.wing);
    if (r.floor === 0) steps.push('Sala este la parter.');
    else if (r.floor > 0) steps.push(`Urcă la ${floorLabel(r.floor)}${r.floor >= 3 ? ' (cu liftul, dacă e disponibil)' : ' pe scări'}.`);
    else if (r.floorText === 'mezanin') steps.push('Sala este la mezanin, între parter și etajul 1.');
    if (r.place && r.nameOnly) steps.push(`Caută ${r.place.name}. Urmează turul 360° ca să vezi exact pe unde mergi.`);
    else if (/^\D*\d/.test(r.code)) steps.push(`Caută ușa cu numărul ${r.code.replace(/^(SPM|ASPC) /, '')}. La UPT, prima cifră din număr arată etajul.`);
    steps.push('Dacă nu găsești sala, întreabă la portar sau la secretariatul facultății.');
    return steps;
  }

  /* =========================================================
     2. Interfața din panou
     ========================================================= */
  let current = null; // ultimul rezultat
  let guideIndex = -1;
  const guideFor = r => CAMPUS_GUIDES[r?.place?.id];
  const EXAMPLES = ['B419', 'Aurel Bărglăzan', 'Analiza Mișcării', 'N 210', 'M 104', 'A101', '225D SPM', 'Amf. Ioan Anton'];

  function setupPanel() {
    $('#cn-examples').innerHTML = EXAMPLES.map((e) => `<button type="button" class="pill" data-cn-ex="${esc(e)}">${esc(e)}</button>`).join('');
    $('#cn-form').addEventListener('submit', (ev) => { ev.preventDefault(); search($('#cn-q').value); $('#cn-q').blur(); });
    $('#cn-q').addEventListener('focus', () => { if (isMobile()) api()?.sheetTo('full'); });
    $('#tab-campus').addEventListener('click', (ev) => {
      const t = ev.target;
      const ex = t.closest('[data-cn-ex]'); if (ex) { $('#cn-q').value = ex.dataset.cnEx; search(ex.dataset.cnEx); return; }
      const opt = t.closest('[data-cn-opt]'); if (opt) { $('#cn-q').value = opt.dataset.cnOpt; search(opt.dataset.cnOpt); return; }
      const ob = t.closest('[data-cn-building]'); if (ob) { showResult(finalize({ code: B[ob.dataset.cnBuilding].short, building: ob.dataset.cnBuilding, floor: null, nameOnly: true })); return; }
      if (t.closest('[data-cn-go]')) { startNavigation(current); return; }
      if (t.closest('[data-cn-choose]')) { startNavigation(current, true); return; }
      if (t.closest('[data-cn-guide-open]')) { showGuide(-1); return; }
      if (t.closest('[data-cn-guide-close]')) {
        $('#cn-guide').classList.add('hidden');
        $('[data-cn-guide-open]').focus();
        return;
      }
      const next = t.closest('[data-cn-guide-step]');
      if (next) { showGuide(Number(next.dataset.cnGuideStep)); return; }
      const camera = t.closest('[data-cn-guide-camera]');
      if (camera) {
        const guide = guideFor(current);
        const step = guideIndex < 0 ? guide.entry : guide.steps[guideIndex];
        openTour([step], step.title, camera);
        return;
      }
      const approach = t.closest('[data-cn-guide-approach]');
      if (approach) {
        const option = guideFor(current).approaches[Number(approach.dataset.cnGuideApproach)];
        openTour(option.path, option.name, approach);
        return;
      }
      if (t.closest('[data-cn-360]')) { open360(current); return; }
      if (t.closest('[data-cn-show]')) { showOnMap(current, true); return; }
      if (t.closest('[data-cn-share]')) { share(current); return; }
      const goRoom = t.closest('[data-cn-goroom]');
      if (goRoom) { const r = parseRoom(goRoom.dataset.cnGoroom); if (r.ok) { showResult(r); startNavigation(r); } else search(goRoom.dataset.cnGoroom); return; }
      const del = t.closest('[data-cn-del]'); if (del) { deleteClass(del.dataset.cnDel); return; }
      if (t.closest('#cn-add')) { classModal(); return; }
      if (t.closest('#cn-paste')) { pasteModal(); return; }
      if (t.closest('#cn-parity')) { parityModal(); return; }
    });
    $('#modal-body').addEventListener('click', onModalClick);
    renderTimetable();
    setInterval(renderNext, 60000);
  }

  function search(q) {
    const r = parseRoom(q);
    if (r.ok) { showResult(r); return; }
    current = null;
    hideDestination();
    $('#cn-result').innerHTML = `
      <div class="cn-card cn-ask" role="status">
        <p>${esc(r.message)}</p>
        ${r.options ? `<div class="cn-options">${r.options.map((o) => o.query
          ? `<button type="button" class="pill" data-cn-opt="${esc(o.query)}">${esc(o.label)}</button>`
          : `<button type="button" class="pill" data-cn-building="${esc(o.building)}">${esc(o.label)}</button>`).join('')}</div>` : ''}
      </div>`;
  }

  function whereText(r) {
    const b = B[r.building];
    const floor = r.floor != null ? floorLabel(r.floor) : r.floorText || '';
    return [floor && floor[0].toUpperCase() + floor.slice(1), b.address].filter(Boolean).join(' · ');
  }

  function showResult(r) {
    current = r;
    guideIndex = -1;
    const b = B[r.building];
    const guide = guideFor(r);
    const has360 = !!(r.place?.path || b.panoPath || b.pano);
    const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${b.entrance[1]},${b.entrance[0]}&travelmode=walking`;
    $('#cn-result').innerHTML = `
      <div class="cn-card">
        <div class="cn-head">
          <div class="cn-code">${esc(guide && r.nameOnly ? b.short : r.code)}</div>
          <div class="cn-where"><b>${esc(guide || (r.place && !r.nameOnly) ? r.place.name : b.name)}</b><span>${esc(whereText(r))}</span></div>
        </div>
        ${r.place && (!r.nameOnly || guide) ? `<div class="muted small">${esc(b.name)}</div>` : ''}
        ${guide ? `<p class="cn-entry-note"><b>Intrare</b> · ${esc(guide.entry.text)}</p>` : ''}
        ${r.warnings.map((w) => `<div class="cn-warn">⚠️ ${esc(w)}</div>`).join('')}
        <div class="cn-actions">
          <button type="button" class="btn primary" data-cn-go>🧭 Du-mă acolo</button>
          ${guide ? '<button type="button" class="btn ghost" data-cn-guide-open>Pașii până la ușă</button><button type="button" class="btn ghost" data-cn-choose>Alege plecarea</button>' :
            has360 ? '<button type="button" class="btn ghost" data-cn-360>🔭 Drumul în 360°</button>' : ''}
          <button type="button" class="btn ghost" data-cn-show>📍 Pe hartă</button>
          <a class="btn ghost" href="${gmaps}" target="_blank" rel="noopener">Google Maps ↗</a>
          <button type="button" class="btn ghost" data-cn-share>🔗 Trimite</button>
        </div>
        ${guide ? '<section id="cn-guide" class="cn-guide hidden" aria-labelledby="cn-guide-title"></section>' : `<details class="cn-indoor" open>
          <summary>De la intrare până la sală</summary>
          <ol>${indoorSteps(r).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        </details>`}
      </div>`;
    showOnMap(r, false);
    if (location.hash !== '#sala=' + encodeURIComponent(r.code)) history.replaceState(null, '', '#sala=' + encodeURIComponent(r.code));
  }

  function showGuide(index) {
    const guide = guideFor(current);
    const panel = $('#cn-guide');
    if (!guide || !panel) return;
    const entry = index < 0;
    const step = entry ? guide.entry : guide.steps[index];
    const last = index === guide.steps.length - 1;
    guideIndex = index;
    panel.classList.remove('hidden');
    panel.innerHTML = `
      <div class="cn-guide-top">
        <span>${entry ? 'La intrare' : `Pasul ${index + 1} din ${guide.steps.length}`}</span>
        <button type="button" class="btn ghost small" data-cn-guide-close aria-label="Închide pașii">✕</button>
      </div>
      <h3 id="cn-guide-title" tabindex="-1">${esc(step.title)}</h3>
      <p>${esc(step.text)}</p>
      <button type="button" class="btn ghost small" data-cn-guide-camera>Vezi reperul 360°</button>
      ${entry && guide.approaches ? `<details class="cn-guide-approaches">
        <summary>Repere din apropiere</summary>
        ${guide.approaches.map((option, i) => `<div><b>${esc(option.name)}</b><p>${esc(option.text)}</p>
          <button type="button" class="link-btn" data-cn-guide-approach="${i}">Vezi traseul din ${esc(option.name)}</button></div>`).join('')}
      </details>` : ''}
      <div class="cn-actions cn-guide-actions">
        ${entry ? '' : `<button type="button" class="btn ghost small" data-cn-guide-step="${index - 1}">Înapoi</button>`}
        ${last ? '<button type="button" class="btn primary small" data-cn-guide-close>Gata</button>' :
          `<button type="button" class="btn primary small" data-cn-guide-step="${index + 1}">${entry ? 'Sunt la intrare' : 'Pasul următor'}</button>`}
      </div>`;
    if (isMobile()) api()?.sheetTo('full');
    $('#cn-guide-title').focus();
  }

  async function share(r) {
    if (!r) return;
    const url = location.origin + location.pathname + '#sala=' + encodeURIComponent(r.code);
    const text = `Sala ${r.code}: ${B[r.building].name}, ${whereText(r)}`;
    try {
      if (navigator.share) await navigator.share({ title: `Sala ${r.code}`, text, url });
      else { await navigator.clipboard.writeText(`${text}\n${url}`); toast('Linkul a fost copiat'); }
    } catch { /* anulat */ }
  }

  /* =========================================================
     3. Harta: clădiri, destinație, traseu
     ========================================================= */
  let destMarker = null;
  let buildingMarkers = [];

  function ensureTimisoara() { api()?.ensureCity('timisoara'); }

  function showBuildingLabels(show) {
    const map = getMap();
    if (!map) return;
    buildingMarkers.forEach((m) => m.remove());
    buildingMarkers = [];
    if (!show) return;
    const seen = new Set();
    for (const [key, b] of Object.entries(B)) {
      if (b.faculty === 'other' || seen.has(b.short)) continue;
      seen.add(b.short);
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'cn-blabel ' + b.faculty;
      el.textContent = b.short;
      el.title = b.name;
      el.addEventListener('click', (ev) => { ev.stopPropagation(); api()?.switchTab('campus'); showResult(finalize({ code: b.short, building: key, floor: null, nameOnly: true })); });
      buildingMarkers.push(new maplibregl.Marker({ element: el }).setLngLat(b.center).addTo(map));
    }
  }

  function setDestination(r) {
    const map = getMap();
    if (!map) return;
    const b = B[r.building];
    if (!destMarker) {
      const el = document.createElement('div');
      el.className = 'cn-dest';
      el.innerHTML = '<span class="cn-dest-pin"><i>🎓</i></span><span class="cn-dest-label"></span>';
      destMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' });
    }
    destMarker.getElement().querySelector('.cn-dest-label').textContent = r.code;
    destMarker.setLngLat(b.entrance).addTo(map);
  }
  function hideDestination() { destMarker?.remove(); }

  function showOnMap(r, focusMap) {
    const map = getMap();
    if (!r || !map) { if (focusMap) toast('Harta nu este încărcată'); return; }
    ensureTimisoara();
    setDestination(r);
    const b = B[r.building];
    map.flyTo({ center: b.entrance, zoom: 17.6, pitch: map.getPitch(), duration: 900 });
    if (focusMap && isMobile()) api()?.sheetTo('peek');
  }

  const ROUTE_SRC = 'cn-route';
  function ensureRouteLayers() {
    const map = getMap();
    if (!map || map.getSource(ROUTE_SRC)) return;
    map.addSource(ROUTE_SRC, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({ id: 'cn-route-casing', type: 'line', source: ROUTE_SRC, layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 10, 'line-opacity': 0.95 } });
    map.addLayer({ id: 'cn-route-line', type: 'line', source: ROUTE_SRC, filter: ['==', ['get', 'part'], 'todo'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#2563eb', 'line-width': 6 } });
    map.addLayer({ id: 'cn-route-done', type: 'line', source: ROUTE_SRC, filter: ['==', ['get', 'part'], 'done'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#94a3b8', 'line-width': 6 } });
    map.addLayer({ id: 'cn-route-approx', type: 'line', source: ROUTE_SRC, filter: ['==', ['get', 'part'], 'approx'], layout: { 'line-cap': 'round' }, paint: { 'line-color': '#2563eb', 'line-width': 5, 'line-dasharray': [1, 2] } });
  }
  function drawRoute(route, along = 0) {
    const map = getMap();
    if (!map) return;
    ensureRouteLayers();
    const features = [];
    if (route.approx) features.push({ type: 'Feature', properties: { part: 'approx' }, geometry: { type: 'LineString', coordinates: route.coords } });
    else {
      const cut = pointAt(route.coords, route.cum, along);
      const k = route.cum.findIndex((c) => c > along);
      const i = k < 0 ? route.coords.length - 1 : k;
      const done = [...route.coords.slice(0, i), cut];
      const todo = [cut, ...route.coords.slice(i)];
      if (done.length > 1) features.push({ type: 'Feature', properties: { part: 'done' }, geometry: { type: 'LineString', coordinates: done } });
      if (todo.length > 1) features.push({ type: 'Feature', properties: { part: 'todo' }, geometry: { type: 'LineString', coordinates: todo } });
    }
    map.getSource(ROUTE_SRC).setData({ type: 'FeatureCollection', features });
  }
  function clearRoute() {
    const map = getMap();
    map?.getSource(ROUTE_SRC)?.setData({ type: 'FeatureCollection', features: [] });
  }

  /* ---------- Rutare pe jos (OSRM, profil pietonal) ---------- */
  const MOD = { left: 'la stânga', right: 'la dreapta', 'slight left': 'ușor la stânga', 'slight right': 'ușor la dreapta', 'sharp left': 'brusc la stânga', 'sharp right': 'brusc la dreapta', straight: 'înainte', uturn: 'înapoi' };
  const ARROW = { left: '↰', right: '↱', 'slight left': '↖', 'slight right': '↗', 'sharp left': '↰', 'sharp right': '↱', straight: '↑', uturn: '↩' };
  function stepText(s, last, destName) {
    const t = s.maneuver.type, mod = s.maneuver.modifier, name = s.name ? ` pe ${s.name}` : '';
    const dir = MOD[mod] || '';
    if (t === 'depart') return { text: `Pornește${name || ' pe jos'}`, arrow: '↑' };
    if (t === 'arrive' || last) return { text: `Ai ajuns la ${destName}`, arrow: '🏁' };
    if (t === 'roundabout' || t === 'rotary' || t === 'exit roundabout') return { text: `În sensul giratoriu, ia ieșirea ${s.maneuver.exit || ''}${name}`.replace('  ', ' '), arrow: '⟳' };
    if (t === 'end of road') return { text: `La capătul drumului, virează ${dir}${name}`, arrow: ARROW[mod] || '↑' };
    if (t === 'fork') return { text: `La bifurcație, ține-te ${dir}${name}`, arrow: ARROW[mod] || '↑' };
    if (t === 'continue' || t === 'new name' || mod === 'straight') return { text: `Continuă ${mod === 'straight' || !dir ? 'înainte' : dir}${name}`, arrow: ARROW[mod] || '↑' };
    if (mod === 'uturn') return { text: 'Întoarce-te din drum', arrow: '↩' };
    return { text: `Virează ${dir}${name}`, arrow: ARROW[mod] || '↑' };
  }
  function cumulative(coords) {
    const cum = [0];
    for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + dist(coords[i - 1], coords[i]));
    return cum;
  }
  async function fetchRoute(from, to, destName) {
    const url = `https://routing.openstreetmap.de/routed-foot/route/v1/foot/${from[0].toFixed(6)},${from[1].toFixed(6)};${to[0].toFixed(6)},${to[1].toFixed(6)}?overview=full&geometries=geojson&steps=true`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      const j = await res.json();
      if (j.code !== 'Ok' || !j.routes?.length) throw new Error('fără traseu');
      const route = j.routes[0];
      const coords = route.geometry.coordinates;
      if (dist(coords[coords.length - 1], to) > 3) coords.push(to); // ultimii metri, până la ușă
      const cum = cumulative(coords);
      const raw = route.legs[0].steps;
      let acc = 0;
      const steps = raw.map((s, i) => {
        const st = { ...stepText(s, i === raw.length - 1, destName), at: acc, loc: s.maneuver.location, name: s.name };
        acc += s.distance;
        return st;
      });
      steps[steps.length - 1].at = cum[cum.length - 1];
      return { coords, cum, steps, total: cum[cum.length - 1], approx: false };
    } catch {
      // Fără server de rutare: linie dreaptă și direcție.
      const coords = [from, to];
      const cum = cumulative(coords);
      const card = ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-vest', 'vest', 'nord-vest'][Math.round(bearing(from, to) / 45) % 8];
      return { coords, cum, total: cum[1], approx: true, steps: [
        { text: `Mergi spre ${card}, către ${destName}`, arrow: '↑', at: 0, loc: from },
        { text: `Ai ajuns la ${destName}`, arrow: '🏁', at: cum[1], loc: to },
      ] };
    } finally { clearTimeout(timer); }
  }

  /* =========================================================
     4. Navigarea live
     ========================================================= */
  const nav = {
    active: false, r: null, route: null, from: null, user: null, live: false,
    watch: null, sim: null, follow: true, stepIdx: -1, spokenIdx: -1, nearSpoken: -1,
    offCount: 0, lastReroute: 0, arrived: false, wake: null, userMarker: null, heading: null,
  };
  let voiceOn = store.get('voice', false);

  function buildOverlay() {
    if ($('#cn-nav')) return;
    const el = document.createElement('div');
    el.id = 'cn-nav';
    el.className = 'cn-nav hidden';
    el.innerHTML = `
      <div class="cn-banner" role="status" aria-live="polite">
        <div class="cn-arrow" id="cn-arrow">↑</div>
        <div class="cn-instr-wrap"><div class="cn-ndist" id="cn-ndist"></div><div class="cn-instr" id="cn-instr">Calculez traseul…</div></div>
      </div>
      <div class="cn-bottom glass">
        <div class="cn-summary">
          <div><div class="cn-eta" id="cn-eta">…</div><div class="cn-target" id="cn-target"></div></div>
          <button type="button" class="btn ghost small cn-stop" id="cn-stop">Oprește</button>
        </div>
        <div class="cn-tools">
          <button type="button" class="pill" id="cn-recenter" hidden>◎ Recentrează</button>
          <button type="button" class="pill" id="cn-voice" aria-pressed="${voiceOn}">${voiceOn ? '🔊 Voce' : '🔇 Voce'}</button>
          <button type="button" class="pill" id="cn-list">☰ Pași</button>
          <button type="button" class="pill" id="cn-sim" hidden>▶ Simulează drumul</button>
          <button type="button" class="pill" id="cn-360b">🔭 360°</button>
        </div>
        <ol class="cn-steps hidden" id="cn-steps"></ol>
        <div class="cn-arrive hidden" id="cn-arrive"></div>
        <p class="cn-privacy">Pentru traseu, punctul de plecare și destinația sunt trimise serviciului de rutare OSRM (FOSSGIS). Locația nu e salvată.</p>
      </div>`;
    document.body.appendChild(el);
    $('#cn-stop').addEventListener('click', stopNavigation);
    $('#cn-recenter').addEventListener('click', () => { nav.follow = true; $('#cn-recenter').hidden = true; followCamera(true); });
    $('#cn-voice').addEventListener('click', () => {
      voiceOn = !voiceOn; store.set('voice', voiceOn);
      $('#cn-voice').textContent = voiceOn ? '🔊 Voce' : '🔇 Voce';
      $('#cn-voice').setAttribute('aria-pressed', String(voiceOn));
      if (voiceOn && nav.route) speak(nav.route.steps[Math.max(1, nav.stepIdx)]?.text || '');
    });
    $('#cn-list').addEventListener('click', () => $('#cn-steps').classList.toggle('hidden'));
    $('#cn-sim').addEventListener('click', toggleSimulation);
    $('#cn-360b').addEventListener('click', () => open360(nav.r));
  }

  function speak(text) {
    if (!voiceOn || !('speechSynthesis' in window) || !text) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ro-RO';
      const v = speechSynthesis.getVoices().find((x) => x.lang?.toLowerCase().startsWith('ro'));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch { /* fără voce */ }
  }

  async function startNavigation(r, chooseManually = false) {
    if (!r) return;
    const map = getMap();
    if (!map) { toast('Harta nu s-a încărcat. Folosește butonul Google Maps.'); return; }
    if (nav.active) stopNavigation(true);
    ensureTimisoara();
    buildOverlay();
    nav.r = r;
    nav.arrived = false;
    nav.stepIdx = -1; nav.spokenIdx = -1; nav.nearSpoken = -1; nav.follow = true;
    setDestination(r);
    if (chooseManually) { chooseStart('Selectează un reper din apropiere.'); return; }
    const pos = await getPosition();
    if (nav.r !== r) return;
    if (pos && inArea(pos)) { nav.live = true; begin(pos); }
    else chooseStart(pos ? 'Ești în afara zonei campusului.' : 'Nu am primit locația telefonului.');
  }

  function getPosition() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve([p.coords.longitude, p.coords.latitude]),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 9000, maximumAge: 15000 },
      );
    });
  }

  function chooseStart(reason) {
    api()?.openModal(`
      <h3>De unde pleci?</h3>
      <p>${esc(reason)} Alege un punct de plecare. Pe telefon, în campus, navigarea merge cu GPS.</p>
      <div class="cn-starts">
        ${CAMPUS_STARTS.map((s) => `<button type="button" class="btn ghost block" data-cn-start="${esc(s.id)}">${esc(s.name)}</button>`).join('')}
      </div>
      <div class="modal-actions"><button type="button" class="btn ghost" data-cn-retry>📍 Încearcă din nou cu GPS</button></div>`);
  }

  // Butoanele din ferestrele modale ale ghidului (un singur ascultător, ferestrele se refolosesc).
  function onModalClick(ev) {
    const s = ev.target.closest('[data-cn-start]');
    if (s) { api()?.closeModal(); nav.live = false; begin(CAMPUS_STARTS.find((x) => x.id === s.dataset.cnStart).coord); return; }
    if (ev.target.closest('[data-cn-retry]')) { api()?.closeModal(); startNavigation(nav.r); return; }
    const p = ev.target.closest('[data-cn-par]');
    if (p) {
      store.set('parity', { week: weekIndex(new Date()), parity: p.dataset.cnPar });
      api()?.closeModal();
      renderTimetable();
    }
  }

  async function begin(from) {
    const r = nav.r;
    const b = B[r.building];
    nav.active = true;
    nav.from = from;
    document.body.classList.add('cn-navigating');
    api()?.closeDetail?.();
    if (isMobile()) api()?.sheetTo('peek');
    $('#cn-nav').classList.remove('hidden');
    $('#cn-arrive').classList.add('hidden');
    $('#cn-steps').classList.add('hidden');
    $('#cn-target').textContent = `${r.code} · ${b.short}${r.floor != null ? ', ' + floorLabel(r.floor) : ''}`;
    $('#cn-instr').textContent = 'Calculez traseul…';
    $('#cn-ndist').textContent = '';
    $('#cn-sim').hidden = nav.live;
    nav.route = await fetchRoute(from, b.entrance, b.entranceName.startsWith('intrarea') ? b.entranceName : 'clădire');
    if (!nav.active) return;
    if (nav.route.approx) toast('Serviciul de traseu nu răspunde. Îți arăt direcția în linie dreaptă.');
    $('#cn-steps').innerHTML = nav.route.steps.map((s, i) => `<li data-i="${i}"><span class="a">${s.arrow}</span><span>${esc(s.text)}</span>${i < nav.route.steps.length - 1 ? `<span class="d">${fmtDist((nav.route.steps[i + 1].at) - s.at)}</span>` : ''}</li>`).join('');
    drawRoute(nav.route, 0);
    fitRoute();
    requestWakeLock();
    if (nav.live) {
      onPosition(from, null, null);
      nav.watch = navigator.geolocation.watchPosition(
        (p) => onPosition([p.coords.longitude, p.coords.latitude], p.coords.accuracy, p.coords.heading),
        () => toast('Am pierdut semnalul GPS. Încerc în continuare…'),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
      );
    } else onPosition(from, null, null);
    const map = getMap();
    map.on('dragstart', onUserDrag);
  }

  function onUserDrag() {
    if (!nav.active) return;
    nav.follow = false;
    $('#cn-recenter').hidden = false;
  }

  function fitRoute() {
    const map = getMap();
    if (!map || !nav.route) return;
    const xs = nav.route.coords.map((c) => c[0]), ys = nav.route.coords.map((c) => c[1]);
    const pad = isMobile() ? { top: 140, bottom: 230, left: 40, right: 40 } : { top: 150, bottom: 200, left: 460, right: 90 };
    map.fitBounds([[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], { padding: pad, maxZoom: 18, duration: 700 });
  }

  function setUserMarker(p, heading) {
    const map = getMap();
    if (!map) return;
    if (!nav.userMarker) {
      const el = document.createElement('div');
      el.className = 'cn-me';
      el.innerHTML = '<span class="cn-me-cone"></span><span class="cn-me-dot"></span>';
      nav.userMarker = new maplibregl.Marker({ element: el, rotationAlignment: 'map' });
    }
    nav.userMarker.setLngLat(p).addTo(map);
    if (heading != null && Number.isFinite(heading)) {
      nav.userMarker.setRotation(heading);
      nav.userMarker.getElement().classList.add('has-heading');
    }
  }

  function followCamera(force) {
    const map = getMap();
    if (!map || !nav.user || (!nav.follow && !force)) return;
    const ahead = pointAt(nav.route.coords, nav.route.cum, Math.min(nav.route.total, (nav.lastAlong || 0) + 25));
    const brg = dist(nav.user, ahead) > 3 ? bearing(nav.user, ahead) : map.getBearing();
    map.easeTo({ center: nav.user, zoom: 18, pitch: isMobile() ? 45 : 50, bearing: brg, duration: 700, padding: isMobile() ? { top: 120, bottom: 200 } : { top: 0, bottom: 0, left: 420 } });
  }

  function onPosition(p, accuracy, heading) {
    if (!nav.active || !nav.route) return;
    const route = nav.route;
    const prev = nav.user;
    nav.user = p;
    const pr = project(p, route.coords, route.cum);
    const along = Math.max(nav.lastAlong && nav.live ? nav.lastAlong - 15 : 0, pr.along);
    nav.lastAlong = along;
    const hdg = heading != null && Number.isFinite(heading) ? heading : prev && dist(prev, p) > 2 ? bearing(prev, p) : null;
    setUserMarker(p, hdg);
    if (nav.arrived) return;

    // Ai ajuns?
    const toDoor = dist(p, B[nav.r.building].entrance);
    if (!nav.arrived && (toDoor < 18 || route.total - along < 12)) { arrive(); return; }

    // Ai ieșit de pe traseu?
    if (!route.approx && nav.live) {
      const tol = Math.max(30, (accuracy || 0) * 1.2);
      nav.offCount = pr.off > tol ? nav.offCount + 1 : 0;
      if (nav.offCount >= 2 && Date.now() - nav.lastReroute > 12000) { reroute(p); return; }
    }

    // Următoarea manevră
    let i = route.steps.findIndex((s, k) => k > 0 && s.at > along + 3);
    if (i < 0) i = route.steps.length - 1;
    const step = route.steps[i];
    const toNext = Math.max(0, step.at - along);
    $('#cn-arrow').textContent = step.arrow;
    $('#cn-ndist').textContent = toNext < 12 ? 'Acum' : 'În ' + fmtDist(toNext);
    $('#cn-instr').textContent = step.text;
    const remaining = Math.max(0, route.total - along);
    const eta = new Date(Date.now() + remaining / WALK * 1000);
    $('#cn-eta').innerHTML = `<b>${fmtMin(remaining / WALK)}</b> · ${fmtDist(remaining)} · ajungi la ${fmtClock(eta)}`;
    $$('#cn-steps li').forEach((li) => li.classList.toggle('now', Number(li.dataset.i) === i));
    if (i !== nav.stepIdx) {
      nav.stepIdx = i;
      if (nav.spokenIdx !== i) { nav.spokenIdx = i; speak(toNext > 15 ? `În ${fmtDist(toNext)}, ${step.text.toLowerCase()}` : step.text); }
    } else if (toNext < 15 && nav.nearSpoken !== i && i < route.steps.length - 1) {
      nav.nearSpoken = i; speak(step.text);
    }
    drawRoute(route, along);
    followCamera(false);
  }

  async function reroute(p) {
    nav.lastReroute = Date.now();
    nav.offCount = 0;
    toast('Ai ieșit de pe traseu. Recalculez…');
    speak('Recalculez traseul');
    const b = B[nav.r.building];
    const next = await fetchRoute(p, b.entrance, 'intrare');
    if (!nav.active) return;
    nav.route = next;
    nav.lastAlong = 0;
    nav.stepIdx = -1;
    $('#cn-steps').innerHTML = next.steps.map((s, i) => `<li data-i="${i}"><span class="a">${s.arrow}</span><span>${esc(s.text)}</span></li>`).join('');
    onPosition(p, null, null);
  }

  function arrive() {
    nav.arrived = true;
    stopSimulation();
    const r = nav.r, b = B[r.building];
    $('#cn-arrow').textContent = '🏁';
    const guide = guideFor(r);
    $('#cn-ndist').textContent = guide ? (b.verify ? 'Ești aproape de intrare' : 'Ai ajuns la intrare') : 'Ai ajuns';
    $('#cn-instr').textContent = b.entranceName[0].toUpperCase() + b.entranceName.slice(1);
    $('#cn-eta').innerHTML = `<b>${esc(r.code)}</b> · ${esc(whereText(r))}`;
    drawRoute(nav.route, nav.route.total);
    if (guide) {
      speak(guide.entry.text);
      $('#cn-arrive').innerHTML = `
        <div class="cn-arrive-title">${esc(guide.entry.title)}</div>
        <p>${esc(guide.entry.text)}</p>
        <button type="button" class="btn primary" id="cn-arr-guide">Sunt la intrare</button>`;
      $('#cn-arrive').classList.remove('hidden');
      $('#cn-steps').classList.add('hidden');
      $('#cn-arr-guide').onclick = () => {
        stopNavigation(true);
        api()?.switchTab('campus');
        if (current !== r) showResult(r);
        showGuide(0);
      };
      return;
    }
    speak(`Ai ajuns. ${indoorSteps(r).slice(0, 2).join(' ')}`);
    $('#cn-arrive').innerHTML = `
      <div class="cn-arrive-title">🎉 Ești la intrare. Acum, în clădire:</div>
      <ol>${indoorSteps(r).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      <div class="cn-actions">
        <button type="button" class="btn primary" id="cn-arr-360">🔭 Vezi drumul în 360°</button>
        <button type="button" class="btn ghost" id="cn-arr-done">Gata</button>
      </div>`;
    $('#cn-arrive').classList.remove('hidden');
    $('#cn-steps').classList.add('hidden');
    $('#cn-arr-360').addEventListener('click', () => open360(r));
    $('#cn-arr-done').addEventListener('click', () => stopNavigation());
  }

  function stopNavigation(silent) {
    nav.active = false;
    if (nav.watch != null) navigator.geolocation.clearWatch(nav.watch);
    nav.watch = null;
    stopSimulation();
    nav.userMarker?.remove();
    nav.userMarker = null;
    nav.route = null;
    nav.user = null;
    nav.lastAlong = 0;
    clearRoute();
    getMap()?.off('dragstart', onUserDrag);
    $('#cn-nav')?.classList.add('hidden');
    document.body.classList.remove('cn-navigating');
    try { speechSynthesis.cancel(); } catch { /* */ }
    nav.wake?.release?.().catch(() => {});
    nav.wake = null;
    if (!silent && isMobile()) api()?.sheetTo('half');
  }

  async function requestWakeLock() {
    try { if ('wakeLock' in navigator) nav.wake = await navigator.wakeLock.request('screen'); } catch { /* opțional */ }
  }

  // Simulare: pentru test de acasă sau demonstrație, avansează pe traseu cu viteză de mers × 4.
  function toggleSimulation() { if (nav.sim) stopSimulation(); else startSimulation(); }
  function startSimulation() {
    if (!nav.route) return;
    let s = nav.lastAlong || 0;
    $('#cn-sim').textContent = '⏸ Oprește simularea';
    nav.follow = true;
    nav.sim = setInterval(() => {
      s += WALK * 4 * 0.5;
      const p = pointAt(nav.route.coords, nav.route.cum, Math.min(s, nav.route.total));
      onPosition(p, 5, null);
      if (s >= nav.route.total) stopSimulation();
    }, 500);
  }
  function stopSimulation() {
    clearInterval(nav.sim);
    nav.sim = null;
    const b = $('#cn-sim');
    if (b) b.textContent = '▶ Simulează drumul';
  }

  /* =========================================================
     5. Turul 360° (visit360.upt.ro)
     ========================================================= */
  let tour = { path: [], i: 0, loaded: false };

  function build360() {
    if ($('#cn-360')) return;
    const el = document.createElement('div');
    el.id = 'cn-360';
    el.className = 'cn-360 hidden';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Tur virtual 360°');
    el.innerHTML = `
      <div class="cn-360-bar">
        <div class="cn-360-title"><b id="cn-360-name"></b><span id="cn-360-step"></span></div>
        <div class="cn-360-ctrl">
          <button type="button" class="btn ghost small" id="cn-360-prev" aria-label="Cadrul anterior">‹ Înapoi</button>
          <button type="button" class="btn primary small" id="cn-360-next" aria-label="Cadrul următor">Înainte ›</button>
          <a class="btn ghost small" id="cn-360-ext" target="_blank" rel="noopener" aria-label="Deschide pe site">↗</a>
          <button type="button" class="close cn-360-close" id="cn-360-close" aria-label="Închide">✕</button>
        </div>
      </div>
      <iframe id="cn-360-frame" title="Turul virtual UPT" allow="fullscreen; gyroscope; accelerometer" referrerpolicy="no-referrer"></iframe>
      <div class="cn-360-foot">Tur virtual © Universitatea Politehnica Timișoara · visit360.upt.ro. La prima deschidere, alege limba. Apoi folosește butoanele Înainte / Înapoi sau săgețile din imagine.</div>`;
    document.body.appendChild(el);
    $('#cn-360-close').addEventListener('click', close360);
    $('#cn-360-prev').addEventListener('click', () => step360(-1));
    $('#cn-360-next').addEventListener('click', () => step360(1));
    el.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') close360(); });
  }

  function open360(r) {
    if (!r) return;
    const b = B[r.building];
    const path = r.place?.path || b.panoPath || (b.pano ? [b.pano] : []);
    if (!path.length) { toast('Nu avem panorame pentru această clădire.'); return; }
    openTour(path, r.place && !r.nameOnly ? r.place.name : `${r.code} · ${b.short}`);
  }
  function openTour(path, name, trigger = document.activeElement) {
    build360();
    tour = { path, i: 0, trigger };
    $('#cn-360-name').textContent = name;
    $('#cn-360').classList.remove('hidden');
    go360();
    $('#cn-360-close').focus();
  }
  function go360() {
    const frame = tour.path[tour.i];
    const media = typeof frame === 'number' ? frame : frame.media;
    const angle = frame.yaw == null ? '' : `&yaw=${frame.yaw}&pitch=0.01&fov=75`;
    const url = `${CAMPUS_TOUR_URL}#media=${media}${angle}`;
    $('#cn-360-frame').src = url;
    $('#cn-360-ext').href = url;
    const last = tour.i === tour.path.length - 1;
    $('#cn-360-step').textContent = tour.path.length > 1
      ? (last ? `Cadrul ${tour.i + 1} din ${tour.path.length} · ai ajuns` : `Cadrul ${tour.i + 1} din ${tour.path.length}`)
      : 'Panoramă';
    $('#cn-360-prev').disabled = tour.i === 0;
    $('#cn-360-next').disabled = last;
  }
  function step360(d) { tour.i = Math.max(0, Math.min(tour.path.length - 1, tour.i + d)); go360(); }
  function close360() {
    $('#cn-360').classList.add('hidden');
    $('#cn-360-frame').removeAttribute('src');
    tour.trigger?.focus();
  }

  /* =========================================================
     6. Orarul meu (local, în browser)
     ========================================================= */
  const DAYS = ['', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];
  const DAY_KEYS = { luni: 1, marti: 2, miercuri: 3, joi: 4, vineri: 5, sambata: 6 };
  const TYPES = { C: 'Curs', S: 'Seminar', L: 'Laborator', P: 'Proiect' };
  let classes = store.get('orar', []);
  const saveClasses = () => store.set('orar', classes);

  // Săptămâna pară/impară: studentul spune o dată ce săptămână e acum, restul se calculează.
  const weekIndex = (d) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000 + 3) / 7);
  function parityOf(d) {
    const ref = store.get('parity', null);
    if (!ref) return null;
    return (weekIndex(d) - ref.week) % 2 === 0 ? ref.parity : (ref.parity === 'par' ? 'impar' : 'par');
  }
  const hm = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };

  function occurrences(from, days = 14) {
    const out = [];
    for (let k = 0; k < days; k++) {
      const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + k);
      const wd = d.getDay() === 0 ? 7 : d.getDay();
      const par = parityOf(d);
      for (const c of classes) {
        if (c.day !== wd) continue;
        if (c.week !== 'all' && par && c.week !== par) continue;
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(hm(c.start) / 60), hm(c.start) % 60);
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(hm(c.end) / 60), hm(c.end) % 60);
        out.push({ c, start, end, unsure: c.week !== 'all' && !par });
      }
    }
    return out.sort((a, b) => a.start - b.start);
  }

  function relTime(ms) {
    const m = Math.round(ms / 60000);
    if (m < 60) return `în ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `în ${h} h${m % 60 ? ' ' + (m % 60) + ' min' : ''}`;
    return `în ${Math.round(h / 24)} zile`;
  }

  function renderNext() {
    const box = $('#cn-next');
    if (!box) return;
    if (!classes.length) { box.innerHTML = ''; return; }
    const now = new Date();
    const occ = occurrences(now).filter((o) => o.end > now);
    const o = occ[0];
    if (!o) { box.innerHTML = '<p class="muted small">Nicio oră în următoarele două săptămâni.</p>'; return; }
    const r = parseRoom(o.c.room);
    const live = o.start <= now;
    const day = o.start.toDateString() === now.toDateString() ? 'azi' : DAYS[o.c.day === 7 ? 0 : o.c.day].toLowerCase();
    box.innerHTML = `
      <div class="cn-next ${live ? 'live' : ''}">
        <div class="cn-next-k">${live ? 'Acum' : 'Următoarea oră'}${o.unsure ? ' · verifică săptămâna pară/impară' : ''}</div>
        <div class="cn-next-t">${esc(o.c.subj)} <span>(${esc(TYPES[o.c.type] || o.c.type)})</span></div>
        <div class="cn-next-w">${live ? `până la ${esc(o.c.end)}` : `${day}, ${esc(o.c.start)} · ${relTime(o.start - now)}`} · <b>${esc(o.c.room)}</b>${r.ok ? ` · ${esc(B[r.building].short)}, ${esc(r.floor != null ? floorLabel(r.floor) : r.floorText || '')}` : ''}</div>
        <button type="button" class="btn primary small" data-cn-goroom="${esc(o.c.room)}">🧭 Du-mă la ${esc(o.c.room)}</button>
      </div>`;
  }

  function renderTimetable() {
    renderNext();
    const box = $('#cn-orar');
    const par = parityOf(new Date());
    $('#cn-parity').textContent = par ? `Săptămâna asta: ${par}ă` : 'Setează săptămâna pară/impară';
    if (!classes.length) {
      box.innerHTML = `<div class="cn-empty">Adaugă orele din orar și îți arătăm mereu unde e următoarea și cum ajungi.
        <div class="cn-actions"><button type="button" class="btn ghost small" id="cn-paste">📋 Lipește din orar</button></div></div>`;
      return;
    }
    const byDay = {};
    classes.slice().sort((a, b) => a.day - b.day || hm(a.start) - hm(b.start)).forEach((c) => (byDay[c.day] ||= []).push(c));
    box.innerHTML = Object.entries(byDay).map(([d, list]) => `
      <div class="cn-day"><div class="cn-day-h">${DAYS[d]}</div>
        ${list.map((c) => `
          <div class="cn-class">
            <div class="cn-class-time">${esc(c.start)}<span>${esc(c.end)}</span></div>
            <div class="cn-class-main"><b>${esc(c.subj)}</b><span>${esc(TYPES[c.type] || c.type)}${c.week !== 'all' ? ' · săpt. ' + esc(c.week) + 'ă' : ''}</span></div>
            <button type="button" class="pill" data-cn-goroom="${esc(c.room)}" title="Du-mă acolo">${esc(c.room)} →</button>
            <button type="button" class="cn-del" data-cn-del="${esc(c.id)}" aria-label="Șterge ${esc(c.subj)}">✕</button>
          </div>`).join('')}
      </div>`).join('') + '<div class="cn-actions"><button type="button" class="btn ghost small" id="cn-paste">📋 Lipește din orar</button></div>';
  }

  function deleteClass(id) {
    classes = classes.filter((c) => c.id !== id);
    saveClasses();
    renderTimetable();
  }

  function classModal() {
    api()?.openModal(`
      <h3>Adaugă o oră</h3>
      <p>Copiază datele din orarul oficial. Rămân doar în acest browser.</p>
      <form id="cn-class-form">
        <div class="field"><label for="cn-f-subj">Materia</label><input id="cn-f-subj" required maxlength="80" placeholder="Ex: Analiză matematică" /></div>
        <div class="field-row">
          <div class="field"><label for="cn-f-type">Tip</label><select id="cn-f-type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
          <div class="field"><label for="cn-f-room">Sala</label><input id="cn-f-room" required maxlength="30" placeholder="Ex: N 301" /></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="cn-f-day">Ziua</label><select id="cn-f-day">${DAYS.slice(1, 6).map((d, i) => `<option value="${i + 1}">${d}</option>`).join('')}</select></div>
          <div class="field"><label for="cn-f-week">Săptămâna</label><select id="cn-f-week"><option value="all">În fiecare săptămână</option><option value="par">Doar săptămâna pară</option><option value="impar">Doar săptămâna impară</option></select></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="cn-f-start">Începe</label><input id="cn-f-start" type="time" value="08:00" required /></div>
          <div class="field"><label for="cn-f-end">Se termină</label><input id="cn-f-end" type="time" value="10:00" required /></div>
        </div>
        <div class="cn-room-check muted small" id="cn-room-check"></div>
        <div class="modal-actions"><button type="button" class="btn ghost" data-close>Renunță</button><button class="btn primary">Salvează</button></div>
      </form>`);
    const check = () => {
      const r = parseRoom($('#cn-f-room').value);
      $('#cn-room-check').textContent = $('#cn-f-room').value ? (r.ok ? `✓ ${B[r.building].name}, ${r.floor != null ? floorLabel(r.floor) : r.floorText || ''}` : '⚠️ ' + r.message) : '';
    };
    $('#cn-f-room').addEventListener('input', check);
    $('#cn-class-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      if (hm($('#cn-f-end').value) <= hm($('#cn-f-start').value)) { toast('Ora de final trebuie să fie după ora de început'); return; }
      classes.push({
        id: 'c' + Date.now().toString(36),
        subj: $('#cn-f-subj').value.trim(), type: $('#cn-f-type').value, room: cleanRoom($('#cn-f-room').value),
        day: Number($('#cn-f-day').value), week: $('#cn-f-week').value, start: $('#cn-f-start').value, end: $('#cn-f-end').value,
      });
      saveClasses();
      api()?.closeModal();
      renderTimetable();
      toast('Ora a fost adăugată');
    });
  }

  // Păstrăm sala în forma recunoscută (N 210, C303A), altfel așa cum a scris-o studentul.
  function cleanRoom(text) {
    const t = String(text).replace(/\s+/g, ' ').trim();
    const r = parseRoom(t);
    return r.ok && !r.nameOnly ? r.code : t;
  }

  // Lipește rânduri din orar: „Luni 8-10 Fizică (C) N 301”.
  const ROOM_IN_TEXT = /\b(ASPC\s*\/?\s*\d{3}|SPM\s*\/?\s*\d{3}\s?[A-E]?|2\d{2}\s?[A-E](?=\b)(?:\s*\(?SPM\)?)?|LN\s?\d{2}|[MN]\s?\d{3}[A-Z]?|[ABCD]\s?\d{3}[A-Z]?(?:\s*CHIMIE)?|\d{3}\s?[A-Z]?\s*CORP(?:UL)?\s*[ABCD]|A3\s*CHIMIE|IOAN\s+ANTON|TRAIAN\s+LALESCU)\b/;
  function parseLines(text) {
    const out = [];
    let skipped = 0;
    let day = null;
    for (const line of String(text).split(/\n+/)) {
      const n = norm(line);
      if (!n.trim()) continue;
      const d = Object.keys(DAY_KEYS).find((k) => new RegExp('\\b' + k + '\\b').test(n));
      if (d) day = DAY_KEYS[d];
      const t = n.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*[-–_]\s*(\d{1,2})(?:[:.](\d{2}))?\b/);
      const up = n.toUpperCase();
      const room = up.match(ROOM_IN_TEXT);
      if (!t || !room || !day) { if (t || room) skipped++; continue; }
      const type = /\(c\)|\bcurs\b/.test(n) ? 'C' : /\(s\)|\bseminar\b/.test(n) ? 'S' : /\(l\)|\blab/.test(n) ? 'L' : /\(p\)|\bproiect\b/.test(n) ? 'P' : 'C';
      const week = /\bimpar/.test(n) ? 'impar' : /\bpar[aă]?\b|\bpare\b/.test(n) ? 'par' : 'all';
      const pad = (h, m) => String(h).padStart(2, '0') + ':' + (m || '00');
      let subj = line
        .replace(new RegExp(room[0].replace(/\s+/g, '\\s*'), 'i'), ' ')
        .replace(/\b\d{1,2}(?:[:.]\d{2})?\s*[-–_]\s*\d{1,2}(?:[:.]\d{2})?\b/, ' ')
        .replace(/(?<!\p{L})(luni|marți|marţi|marti|miercuri|joi|vineri|sâmbătă|sambata|sala|amf|săpt|sapt|saptamana|săptămâna|doar|para|pară|pare|impara|impară|impare)(?!\p{L})\.?/giu, ' ')
        .replace(/\((c|s|l|p)\)|(?<!\p{L})(curs|seminar|laborator|lab|proiect)(?!\p{L})/giu, ' ')
        .replace(/[|;,()]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (!subj) subj = TYPES[type];
      out.push({ id: 'c' + Date.now().toString(36) + out.length, subj: subj.slice(0, 80), type, room: cleanRoom(room[0]), day, week, start: pad(t[1], t[2]), end: pad(t[3], t[4]) });
    }
    return { items: out, skipped };
  }

  function pasteModal() {
    api()?.openModal(`
      <h3>Lipește din orar</h3>
      <p>Un rând pentru fiecare oră: ziua, intervalul, materia și sala. Dacă ziua apare doar o dată, rândurile de sub ea țin de aceeași zi.</p>
      <div class="field"><label for="cn-paste-t">Orarul tău</label>
        <textarea id="cn-paste-t" rows="7" placeholder="Luni 8-10 Analiză matematică (C) N 301&#10;Luni 10-12 Fizică (S) N 212 săpt. pară&#10;Marți 12-14 Engleză M 201"></textarea></div>
      <div class="muted small" id="cn-paste-preview"></div>
      <div class="modal-actions"><button type="button" class="btn ghost" data-close>Renunță</button><button type="button" class="btn primary" id="cn-paste-ok" disabled>Adaugă</button></div>`);
    let parsed = { items: [] };
    $('#cn-paste-t').addEventListener('input', (ev) => {
      parsed = parseLines(ev.target.value);
      $('#cn-paste-preview').innerHTML = parsed.items.length
        ? `Am găsit ${parsed.items.length} ${parsed.items.length === 1 ? 'oră' : 'ore'}${parsed.skipped ? `, ${parsed.skipped} rânduri neînțelese` : ''}:<br>` + parsed.items.slice(0, 6).map((c) => `${DAYS[c.day]} ${c.start}–${c.end} · ${esc(c.subj)} · <b>${esc(c.room)}</b>`).join('<br>')
        : (ev.target.value.trim() ? 'Nu am găsit ore. Fiecare rând are nevoie de zi, interval (8-10) și sală (N 301).' : '');
      $('#cn-paste-ok').disabled = !parsed.items.length;
    });
    $('#cn-paste-ok').addEventListener('click', () => {
      classes.push(...parsed.items);
      saveClasses();
      api()?.closeModal();
      renderTimetable();
      toast(`Am adăugat ${parsed.items.length} ore`);
    });
  }

  function parityModal() {
    api()?.openModal(`
      <h3>Ce săptămână e acum?</h3>
      <p>Unele ore se țin doar în săptămâna pară sau impară. Uită-te în calendarul facultății și alege o dată. Restul săptămânilor le calculăm noi.</p>
      <div class="cn-actions"><button type="button" class="btn ghost" data-cn-par="par">Pară</button><button type="button" class="btn ghost" data-cn-par="impar">Impară</button></div>`);
  }

  /* =========================================================
     7. Pornire
     ========================================================= */
  function onTab(tab) {
    const map = getMap();
    if (tab === 'campus') {
      showBuildingLabels(true);
      if (map && !nav.active && !current) {
        ensureTimisoara();
        map.flyTo({ center: [21.2272, 45.7462], zoom: 16.6, duration: 900 });
      }
    } else if (!nav.active) {
      showBuildingLabels(false);
    }
  }

  function openFromHash() {
    const m = location.hash.match(/^#sala=(.+)$/);
    if (!m) return;
    let q;
    try { q = decodeURIComponent(m[1]); } catch { return; }
    api()?.switchTab('campus');
    $('#cn-q').value = q;
    search(q);
  }

  function init() {
    if (!window.UniPulse || !$('#tab-campus')) return;
    setupPanel();
    document.addEventListener('unipulse:tab', (ev) => onTab(ev.detail));
    document.addEventListener('unipulse:mapready', () => {
      if (document.body.dataset.tab === 'campus') onTab('campus');
      if (current) showOnMap(current, false);
    });
    window.addEventListener('hashchange', openFromHash);
    // Orarul a venit din cont (alt dispozitiv): îl recitim.
    document.addEventListener('unipulse:sync', () => {
      classes = store.get('orar', []);
      renderTimetable();
      renderNext();
    });
    openFromHash();
  }

  // Expus doar pentru teste.
  window.UniPulseCampus = { parseRoom, parseLines, indoorSteps };
  init();
})();
