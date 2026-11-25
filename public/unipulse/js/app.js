/* =========================================================
   UniPulse – logica aplicației
   Hartă 3D: MapLibre GL + OpenFreeMap (gratuit, fără cheie API)
   ========================================================= */
(() => {
  'use strict';

  // ---------- Utilitare ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const isMobile = () => window.innerWidth <= 820;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function externalEventLink(value) {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  const store = {
    get(k, d) { try { const v = localStorage.getItem('unipulse:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('unipulse:' + k, JSON.stringify(v)); } catch { /* storage indisponibil */ } },
  };

  const DAY = 86400000;
  const calendarZone = 'Europe/Bucharest';
  const dateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: calendarZone, year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const offsetFormat = new Intl.DateTimeFormat('en', { timeZone: calendarZone, timeZoneName: 'longOffset' });
  const calendarDay = date => Date.parse(dateKey.format(date));
  const today = () => calendarDay(new Date());
  function dayBoundary(day) {
    const offset = offsetFormat.formatToParts(day - 4 * 60 * 60 * 1000).find(part => part.type === 'timeZoneName').value.slice(3);
    return Date.parse(new Date(day).toISOString().slice(0, 10) + 'T00:00:00' + offset);
  }

  // ---------- Pregătirea datelor ----------
  function hydrate(ev) {
    const venue = ev.venue && VENUES[ev.venue] ? VENUES[ev.venue] : null;
    const e = { ...ev };
    e.startDate = new Date(ev.startISO);
    e.endDate = ev.endISO ? new Date(ev.endISO) : new Date(+e.startDate + (ev.durationH || 2) * 3600000);
    if (Number.isFinite(+e.startDate) && Number.isFinite(+e.endDate)) {
      e.startDay = calendarDay(e.startDate);
      e.endDay = calendarDay(e.endDate);
    }
    e.city = ev.city || venue?.city || 'timisoara';
    e.lat = ev.lat ?? venue?.lat;
    e.lng = ev.lng ?? venue?.lng;
    e.venueName = ev.venueName || venue?.name || 'Locație aleasă pe hartă';
    e.address = ev.address || venue?.address || '';
    e.venueKey = ev.venue || (Number.isFinite(e.lat) ? `${e.lat.toFixed(5)},${e.lng.toFixed(5)}` : e.id);
    return e;
  }

  let userEvents = store.get('userEvents', []);
  let userTeams = store.get('userTeams', []);
  let joined = new Set(store.get('joined', []));
  let saved = new Set(store.get('saved', []));
  let profile = store.get('profile', null);

  let allEvents = [];
  function rebuildEvents() {
    allEvents = [...EVENTS, ...userEvents].map(hydrate)
      .filter((e) => e.endDate >= Date.now() && Number.isFinite(e.lat) && Number.isFinite(e.lng) && CATEGORIES[e.category])
      .sort((a, b) => a.startDate - b.startDate);
  }
  rebuildEvents();
  const byId = (id) => allEvents.find((e) => e.id === id);
  const allTeams = () => userTeams;

  // ---------- Starea aplicației ----------
  const preferredCity = store.get('city', profile?.city);
  const state = {
    cats: new Set(), when: 'all', free: false, query: '', tab: 'explore', activeId: null,
    city: Object.hasOwn(CITIES, preferredCity) ? preferredCity : 'timisoara',
    scope: new URLSearchParams(location.search).get('view') === 'all' ? 'all' : profile?.scope || 'all',
  };
  const city = () => CITIES[state.city];
  const cityEvents = () => allEvents.filter((e) => e.city === state.city);

  // ---------- Profil: „Pentru tine” vs „Toate” ----------
  const hasPrefs = () => !!profile && ((profile.cats || []).length + (profile.topics || []).length > 0);
  function matchesProfile(e) {
    if (!hasPrefs()) return true;
    const topics = (profile.topics || []).map(norm);
    return (profile.cats || []).includes(e.category) || (e.tags || []).some((t) => topics.includes(norm(t)));
  }

  // ---------- Formatare ----------
  const fmtDay = new Intl.DateTimeFormat('ro-RO', { timeZone: calendarZone, weekday: 'short', day: 'numeric', month: 'short' });
  const fmtDate = new Intl.DateTimeFormat('ro-RO', { timeZone: calendarZone, day: 'numeric', month: 'short', year: 'numeric' });
  const fmtTime = new Intl.DateTimeFormat('ro-RO', { timeZone: calendarZone, hour: '2-digit', minute: '2-digit' });
  function dayLabel(d) {
    const diff = (calendarDay(d) - today()) / DAY;
    if (diff === 0) return 'Azi';
    if (diff === 1) return 'Mâine';
    const s = fmtDay.format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  function whenText(e) {
    if (e.dateOnly) return fmtDate.formatRange(e.startDate, e.endDate);
    if (e.startOnly) return `${dayLabel(e.startDate)} · ${fmtTime.format(e.startDate)}`;
    const sameDay = e.startDay === e.endDay;
    if (sameDay) return `${dayLabel(e.startDate)} · ${fmtTime.format(e.startDate)}–${fmtTime.format(e.endDate)}`;
    return `${dayLabel(e.startDate)} ${fmtTime.format(e.startDate)} → ${dayLabel(e.endDate)} ${fmtTime.format(e.endDate)}`;
  }
  const isToday = (e) => e.startDay <= today() && e.endDate >= Date.now();
  const isLive = (e) => !e.dateOnly && !e.startOnly && e.startDate <= Date.now() && e.endDate >= Date.now();
  const priceText = (e) => e.price === 0 ? 'Gratuit' : Number.isFinite(e.price) ? `${e.price} lei` : 'Acces la organizator';
  function eventStatus(e) {
    if (isLive(e)) return '● Acum';
    if (!isToday(e)) return '';
    return e.dateOnly && e.startDay < today() ? 'În perioada evenimentului' : 'Azi';
  }

  // ---------- Locația utilizatorului ----------
  let userLoc = null;
  function distKm(e) {
    if (!userLoc) return null;
    const R = 6371, toR = (x) => (x * Math.PI) / 180;
    const dLat = toR(e.lat - userLoc.lat), dLng = toR(e.lng - userLoc.lng);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toR(userLoc.lat)) * Math.cos(toR(e.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  function distText(e) {
    const d = distKm(e);
    if (d === null || d > 50) return '';
    return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1).replace('.', ',')} km`;
  }

  // ---------- Filtre de timp ----------
  function weekendRange(day) {
    const dow = new Date(day).getUTCDay();
    const toSat = dow === 0 ? -1 : 6 - dow;
    const saturday = day + toSat * DAY;
    return [dayBoundary(saturday), dayBoundary(saturday + 2 * DAY)];
  }
  function inWhen(e, when, day) {
    const s = e.startDate, en = e.endDate;
    switch (when) {
      case 'today': return e.startDay <= day && e.endDay >= day;
      case 'tomorrow': return e.startDay <= day + DAY && e.endDay >= day + DAY;
      case 'weekend': { const [a, b] = weekendRange(day); return s < b && en >= a; }
      case 'week': return e.startDay < day + 7 * DAY;
      case 'month': return e.startDay < day + 30 * DAY;
      default:
        if (when && when.startsWith('m')) return new Date(e.startDay).getUTCMonth() === Number(when.slice(1));
        return true;
    }
  }

  // ---------- „Asistentul AI”: căutare în limbaj natural ----------
  // Rulează local (reguli + scor). În etapa 2, parseQuery poate fi înlocuită cu un
  // apel la un LLM (prin backend) care întoarce același obiect { cats, when, free, terms }.
  const CAT_WORDS = {
    hackathon: ['hackathon', 'hackaton', 'hackatoane', 'hack'],
    workshop: ['workshop', 'atelier', 'ateliere'],
    conferinta: ['conferint', 'talk', 'speaker', 'prezentari'],
    cariera: ['cariera', 'cariere', 'job', 'joburi', 'internship', 'intern', 'angajare', 'targ', 'recrutare', 'practica'],
    curs: ['curs', 'cursuri', 'training', 'bootcamp', 'invat'],
    concurs: ['concurs', 'competiti', 'olimpiad', 'pitch'],
    meetup: ['meetup', 'echipa', 'echipe', 'coechipier', 'networking', 'cunosc', 'prieteni noi', 'colegi'],
    sport: ['sport', 'fotbal', 'meci', 'baschet', 'alerga', 'tenis', 'handbal', 'volei'],
    cultura: ['opera', 'teatru', 'concert', 'muzeu', 'expozit', 'cultur', 'film', 'filarmonic', 'simfonic'],
    social: ['bowling', 'distractie', 'party', 'iesire', 'karaoke', 'petrecere', 'socializ'],
    voluntariat: ['voluntar', 'caritate', 'ecolog', 'plantare'],
  };
  const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
  const STOP = new Set(('vreau caut cautam ceva un una o de la in pe cu si sau pentru sa ma care ce din este sunt imi mi eveniment evenimente ' +
    'timisoara cluj bucuresti iasi as vrea prin acest asta aceasta acesta niste unde cand cel cea cele cei merg mergem fie ar fi ne noi eu tu ' +
    'gratuit gratis free bani fara azi astazi maine weekend weekendul saptamana luna asta aici zile seara dimineata ' +
    'interesant interesante bun bune student studenti studentii pt doar mai foarte tot toate').split(' '));

  function parseQuery(q) {
    const n = norm(q);
    const res = { cats: new Set(), when: null, free: false, terms: [], labels: [] };
    if (!n.trim()) return res;
    for (const [cat, words] of Object.entries(CAT_WORDS)) {
      if (words.some((w) => n.includes(w))) { res.cats.add(cat); res.labels.push(CATEGORIES[cat].label); }
    }
    if (/\b(azi|astazi|diseara|acum)\b/.test(n)) res.when = 'today';
    else if (/\bmaine\b/.test(n)) res.when = 'tomorrow';
    else if (/weekend/.test(n)) res.when = 'weekend';
    else if (/saptaman/.test(n)) res.when = 'week';
    else if (/\bluna\b/.test(n)) res.when = 'month';
    else { const mi = MONTHS.findIndex((m) => n.includes(m)); if (mi >= 0) res.when = 'm' + mi; }
    if (res.when) res.labels.push({ today: 'azi', tomorrow: 'mâine', weekend: 'weekend', week: 'următoarele 7 zile', month: 'următoarele 30 de zile' }[res.when] || MONTHS[Number(res.when.slice(1))]);
    if (/(gratuit|gratis|\bfree\b|fara bani|fara cost)/.test(n)) { res.free = true; res.labels.push('gratuit'); }
    const catWordList = Object.values(CAT_WORDS).flat();
    res.terms = n.split(/[^a-z0-9+#]+/).filter((t) => t.length > 1 && !STOP.has(t) && !MONTHS.includes(t) &&
      !catWordList.some((w) => t.startsWith(w) || (w.startsWith(t) && t.length > 3)));
    return res;
  }

  function haystack(e) {
    return norm([e.title, e.description, e.organizer, e.venueName, (e.tags || []).join(' '), CATEGORIES[e.category]?.label].join(' '));
  }

  // opts.ignoreCats: pentru numărătoarea de pe chip-uri; opts.allScope: ignoră profilul
  function filterEvents(opts = {}) {
    const p = parseQuery(state.query);
    const day = today();
    // Profilul filtrează doar când utilizatorul nu a ales explicit o categorie sau o căutare
    const explicit = state.cats.size > 0 || p.cats.size > 0 || p.terms.length > 0;
    const scopeOn = !opts.allScope && state.scope === 'mine' && hasPrefs() && !explicit;
    let list = cityEvents().filter((e) => {
      if (!opts.ignoreCats && state.cats.size && !state.cats.has(e.category)) return false;
      if (p.cats.size && !p.cats.has(e.category)) return false;
      if (!inWhen(e, state.when, day)) return false;
      if (p.when && !inWhen(e, p.when, day)) return false;
      if ((state.free || p.free) && e.price !== 0) return false;
      if (scopeOn && !matchesProfile(e)) return false;
      return true;
    });
    let usedTerms = [];
    if (p.terms.length) {
      const scored = list.map((e) => {
        const h = haystack(e);
        const words = new Set(h.split(/[^a-z0-9+#]+/));
        // termenii scurți (ex. „AI”) trebuie să fie cuvinte întregi, cei lungi pot fi și prefixe
        const hits = p.terms.filter((t) => (t.length <= 3 ? words.has(t) : h.includes(t)));
        return { e, score: hits.length, hits };
      });
      const matched = scored.filter((s) => s.score > 0);
      if (matched.length) {
        usedTerms = [...new Set(matched.flatMap((s) => s.hits))];
        list = matched.sort((a, b) => b.score - a.score || a.e.startDate - b.e.startDate).map((s) => s.e);
      } else list = [];
    }
    return { list, parsed: p, usedTerms, scopeOn };
  }

  // ---------- Recomandări personalizate ----------
  function recommend() {
    if (!hasPrefs()) return [];
    const ints = new Set(profile.cats || []);
    const topics = (profile.topics || []).map(norm);
    return cityEvents().map((e) => {
      let score = 0; const why = [];
      if (ints.has(e.category)) { score += 3; why.push(CATEGORIES[e.category].label); }
      const tagHits = (e.tags || []).filter((t) => topics.includes(norm(t)));
      score += tagHits.length * 2; why.push(...tagHits);
      if (e.featured) score += 1;
      if ((e.startDate - Date.now()) / DAY < 7) score += 1;
      return { e, score, why };
    }).filter((r) => r.score >= 3).sort((a, b) => b.score - a.score || a.e.startDate - b.e.startDate).slice(0, 6);
  }

  // ---------- Hartă ----------
  let map = null;
  const markers = new Map();
  let pickMarker = null;
  let userMarker = null;
  let touring = false;
  let is3D = !isMobile() && !reducedMotion.matches;
  let cameraChange = 0;

  function loadMap() {
    const url = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl';
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = url + '.css';
    style.integrity = 'sha384-MinO0mNliZ3vwppuPOUnGa+iq619pfMhLVUXfC4LHwSCvF9H+6P/KO4Q7qBOYV5V';
    style.crossOrigin = 'anonymous';
    const script = document.createElement('script');
    script.src = url + '.js';
    script.integrity = 'sha384-SYKAG6cglRMN0RVvhNeBY0r3FYKNOJtznwA0v7B5Vp9tr31xAHsZC0DqkQ/pZDmj';
    script.crossOrigin = 'anonymous';
    script.onload = initMap;
    script.onerror = () => $('#map-error').classList.remove('hidden');
    document.head.append(style, script);
  }

  function initMap() {
    if (typeof maplibregl === 'undefined') { $('#map-error').classList.remove('hidden'); return; }
    const c = city();
    try {
      map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: c.center, zoom: isMobile() ? c.zoom - 0.6 : c.zoom,
        pitch: is3D ? 54 : 0, bearing: is3D ? -18 : 0, maxPitch: 72,
        pixelRatio: isMobile() ? Math.min(window.devicePixelRatio || 1, 1.5) : Math.min(window.devicePixelRatio || 1, 2),
        maxTileCacheSize: isMobile() ? 55 : 100,
        fadeDuration: isMobile() ? 100 : 180,
        minZoom: 11.5, maxBounds: c.bounds,
        attributionControl: { compact: true },
      });
    } catch {
      $('#map-error').classList.remove('hidden');
      return;
    }
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.on('error', (ev) => {
      if (!map.isStyleLoaded() && String(ev?.error?.message || '').match(/fetch|network|style/i)) $('#map-error').classList.remove('hidden');
    });
    map.on('load', () => {
      enlargePlaceIcons();
      if (is3D) setup3DBuildings();
      renderMarkers(filterEvents().list);
      const selected = state.activeId && byId(state.activeId);
      if (selected) flyToEvent(selected);
    });
    ['mousedown', 'touchstart', 'wheel'].forEach((t) => map.on(t, () => stopTour()));
  }

  function enlargePlaceIcons() {
    for (const layer of map.getStyle().layers) {
      if (layer.type !== 'symbol' || layer['source-layer'] !== 'poi' || !layer.layout?.['icon-image']) continue;
      if (layer.id === 'poi_transit') {
        map.setLayoutProperty(layer.id, 'icon-image', [
          'coalesce', ['image', layer.layout['icon-image']], ['image', 'railway']
        ]);
        map.setLayoutProperty(layer.id, 'icon-size', 0.8);
        continue;
      }
      map.setLayoutProperty(layer.id, 'icon-image', [
        'coalesce', ['image', layer.layout['icon-image']], ['image', 'circle_11']
      ]);
      if (layer.id === 'poi_r1' && isMobile()) map.setLayerZoomRange(layer.id, 14.5, layer.maxzoom ?? 24);
      map.setLayoutProperty(layer.id, 'icon-size', [
        'match', ['get', 'class'],
        ['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'shop', 'grocery', 'bakery', 'clothing_store', 'supermarket', 'mall'], 1.32,
        1.12
      ]);
      map.setLayoutProperty(layer.id, 'icon-padding', 3);
      map.setLayoutProperty(layer.id, 'text-offset', [0, 0.85]);
    }
  }

  function setup3DBuildings() {
    if (map.getLayer('up-buildings')) return;
    const style = map.getStyle();
    const srcId = Object.keys(style.sources).find((k) => style.sources[k].type === 'vector');
    if (!srcId) return;
    const firstSymbol = style.layers.find((l) => l.type === 'symbol')?.id;
    map.addLayer({
      id: 'up-buildings', type: 'fill-extrusion', source: srcId, 'source-layer': 'building', minzoom: 13,
      paint: {
        'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 8],
          0, '#e6e3f1', 20, '#d6d1ea', 50, '#bdb4e0', 120, '#9d8fd6'],
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.5, ['coalesce', ['get', 'render_height'], 8]],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.92,
        'fill-extrusion-vertical-gradient': true,
      },
    }, firstSymbol);
    map.addSource('up-highlight', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
      id: 'up-highlight', type: 'fill-extrusion', source: 'up-highlight',
      paint: {
        'fill-extrusion-color': ['get', 'color'],
        'fill-extrusion-height': ['+', ['get', 'h'], 1.5],
        'fill-extrusion-base': ['get', 'b'],
        'fill-extrusion-opacity': 0.95,
      },
    }, firstSymbol);
    try { map.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.35, position: [1.3, 210, 40] }); } catch { /* opțional */ }
    try { if (map.setSky) map.setSky({ 'sky-color': '#cfe3ff', 'horizon-color': '#f1ecff', 'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.5, 'fog-color': '#f1ecff', 'fog-ground-blend': 0.2 }); } catch { /* opțional */ }
  }

  function pointInRing(pt, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function pointInGeom(pt, g) {
    if (!g) return false;
    if (g.type === 'Polygon') return pointInRing(pt, g.coordinates[0]);
    if (g.type === 'MultiPolygon') return g.coordinates.some((p) => pointInRing(pt, p[0]));
    return false;
  }
  function distToGeom(pt, g) {
    const rings = g.type === 'Polygon' ? [g.coordinates[0]] : g.type === 'MultiPolygon' ? g.coordinates.map((p) => p[0]) : [];
    let best = Infinity;
    rings.forEach((r) => r.forEach(([x, y]) => { best = Math.min(best, (x - pt[0]) ** 2 + (y - pt[1]) ** 2); }));
    return best;
  }

  function highlightBuilding(e) {
    if (!map || !map.getSource('up-highlight')) return;
    const src = map.getSource('up-highlight');
    if (!e || !is3D) { src.setData({ type: 'FeatureCollection', features: [] }); return; }
    const p = map.project([e.lng, e.lat]);
    const r = 60;
    const feats = map.queryRenderedFeatures([[p.x - r, p.y - r], [p.x + r, p.y + r]], { layers: ['up-buildings'] });
    const pt = [e.lng, e.lat];
    let f = feats.find((ft) => pointInGeom(pt, ft.geometry));
    if (!f && feats.length) {
      f = feats.slice().sort((a, b) => distToGeom(pt, a.geometry) - distToGeom(pt, b.geometry))[0];
      if (distToGeom(pt, f.geometry) > 0.0006 ** 2) f = null;
    }
    if (!f) { src.setData({ type: 'FeatureCollection', features: [] }); return; }
    src.setData({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: f.geometry, properties: {
        h: Number(f.properties.render_height) || 12, b: Number(f.properties.render_min_height) || 0, color: CATEGORIES[e.category].color } }],
    });
  }

  function renderMarkers(list) {
    if (!map) return;
    const groups = new Map();
    list.forEach((e) => { if (!groups.has(e.venueKey)) groups.set(e.venueKey, []); groups.get(e.venueKey).push(e); });
    for (const [key, existing] of markers) {
      if (groups.has(key)) continue;
      existing.marker.remove();
      markers.delete(key);
    }
    groups.forEach((evs, key) => {
      const live = evs.some(isLive);
      const signature = evs.map(e => e.id).join('|') + ':' + live;
      const existing = markers.get(key);
      if (existing?.signature === signature) return;
      existing?.marker.remove();
      const first = evs[0];
      const cat = CATEGORIES[first.category];
      const el = document.createElement('div');
      el.className = 'pin' + (live ? ' live' : '');
      el.style.setProperty('--c', cat.color);
      el.dataset.key = key;
      const icons = [...new Set(evs.map((e) => CATEGORIES[e.category].icon))];
      const head = icons.length === 1
        ? `<span>${cat.icon}</span>`
        : `<div class="pin-stack">${icons.slice(0, 3).map((i) => `<span>${i}</span>`).join('')}</div>`;
      el.innerHTML = `
        <div class="pin-label">${esc(evs.length === 1 ? first.title : `${first.venueName} · ${evs.length} evenimente`)}</div>
        <div class="pin-head">${head}</div>
        ${evs.length > 1 ? `<div class="pin-count">${evs.length}</div>` : ''}
        <div class="pin-pulse"></div>`;
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (document.body.classList.contains('picking')) return;
        if (evs.length === 1) openEvent(first.id); else openVenue(evs);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([first.lng, first.lat]).addTo(map);
      markers.set(key, { marker, signature });
    });
    markActivePin();
  }

  function markActivePin() {
    const e = state.activeId ? byId(state.activeId) : null;
    $$('.pin').forEach((p) => p.classList.toggle('active', !!e && p.dataset.key === e.venueKey));
  }

  function flyToEvent(e) {
    if (!map) return;
    stopTour();
    const version = ++cameraChange;
    const duration = reducedMotion.matches ? 0 : isMobile() ? 520 : 700;
    map.easeTo({
      center: [e.lng, e.lat], zoom: isMobile() ? 16.3 : 16.8,
      pitch: is3D ? 54 : 0, offset: isMobile() ? [0, -window.innerHeight * 0.2] : [-60, 40],
      duration
    });
    if (is3D) map.once('idle', () => {
      if (version === cameraChange && state.activeId === e.id) highlightBuilding(e);
    });
  }

  function goToCity(animate = true) {
    if (!map) return;
    const c = city();
    stopTour();
    ++cameraChange;
    const opts = { center: c.center, zoom: isMobile() ? c.zoom - 0.6 : c.zoom, pitch: is3D ? 54 : 0, bearing: is3D ? -18 : 0 };
    // Salt între orașe, fără a încărca dalele de hartă de pe traseu.
    const center = map.getCenter();
    const [[west, south], [east, north]] = c.bounds;
    const sameCity = center.lng >= west && center.lng <= east && center.lat >= south && center.lat <= north;
    map.setMaxBounds(c.bounds);
    if (animate && sameCity && !reducedMotion.matches) map.easeTo({ ...opts, duration: 400 });
    else map.jumpTo(opts);
  }

  function setCity(key) {
    if (!CITIES[key] || key === state.city) return;
    state.city = key;
    store.set('city', key);
    if (profile) { profile.city = key; store.set('profile', profile); }
    closeDetail();
    state.cats.clear();
    updateCityPill();
    renderAll();
    goToCity(true);
    toast(`📍 Acum vezi evenimentele din ${city().name}`);
  }

  // ---------- Tur 3D ----------
  function startTour() {
    if (!map) return;
    if (reducedMotion.matches) { toast('Turul animat respectă setarea de mișcare redusă.'); return; }
    set3D(true, false);
    touring = true; $('#btn-tour').classList.add('active');
    map.easeTo({ pitch: 50, bearing: map.getBearing() + 145, zoom: Math.max(map.getZoom(), 15.5), duration: 4200 });
    map.once('moveend', () => stopTour());
  }
  function stopTour() {
    if (!touring) return;
    touring = false;
    $('#btn-tour').classList.remove('active');
    map.stop();
  }
  function set3D(enabled, moveCamera = true) {
    is3D = enabled;
    const control = $('#btn-3d');
    control.textContent = enabled ? '3D' : '2D';
    control.setAttribute('aria-pressed', String(enabled));
    control.classList.toggle('active', enabled);
    if (!map) return;
    if (enabled && map.isStyleLoaded()) setup3DBuildings();
    for (const id of ['up-buildings', 'up-highlight']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', enabled ? 'visible' : 'none');
    }
    if (moveCamera) map.easeTo({ pitch: enabled ? 54 : 0, bearing: enabled ? -18 : 0, duration: reducedMotion.matches ? 0 : 420 });
  }

  // ---------- Lângă mine ----------
  function locateMe() {
    if (!navigator.geolocation) { toast('Browserul nu permite localizarea'); return; }
    $('#btn-locate').classList.add('loading');
    navigator.geolocation.getCurrentPosition((pos) => {
      $('#btn-locate').classList.remove('loading');
      $('#btn-locate').classList.add('active');
      userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const [[w, s], [e, n]] = city().bounds;
      const inside = userLoc.lng > w && userLoc.lng < e && userLoc.lat > s && userLoc.lat < n;
      if (map) {
        if (!userMarker) { const el = document.createElement('div'); el.className = 'user-dot'; userMarker = new maplibregl.Marker({ element: el }); }
        userMarker.setLngLat([userLoc.lng, userLoc.lat]).addTo(map);
        if (inside) map.flyTo({ center: [userLoc.lng, userLoc.lat], zoom: 15.8 });
      }
      if (!inside) {
        const near = Object.entries(CITIES).find(([, c]) => {
          const [[w2, s2], [e2, n2]] = c.bounds;
          return userLoc.lng > w2 && userLoc.lng < e2 && userLoc.lat > s2 && userLoc.lat < n2;
        });
        if (near) { toast(`Ești în ${near[1].name}, te mut acolo`); setCity(near[0]); }
        else toast(`Ești în afara orașului ales (${city().name}). Distanțele se afișează doar în oraș.`);
      } else toast('📍 Ți-am găsit locația. Vezi distanța până la fiecare eveniment.');
      renderAll();
    }, () => {
      $('#btn-locate').classList.remove('loading');
      toast('Nu am primit acces la locație');
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  // ---------- Randare listă ----------
  function evCard(e, opts = {}) {
    const c = CATEGORIES[e.category];
    const dist = distText(e);
    const status = eventStatus(e);
    return `
      <div class="ev-card${state.activeId === e.id ? ' active' : ''}" style="--c:${c.color}" data-id="${esc(e.id)}" role="button" tabindex="0">
        <div class="ev-icon">${c.icon}</div>
        <div class="ev-main">
          <div class="ev-title">${esc(e.title)}</div>
          <div class="ev-meta">${esc(whenText(e))}</div>
          <div class="ev-meta">📍 ${esc(e.venueName)}${dist ? ` · <b>${dist}</b>` : ''}</div>
          <div class="ev-badges">
            ${status ? `<span class="badge today">${status}</span>` : ''}
            <span class="badge ${e.price === 0 ? 'free' : ''}">${priceText(e)}</span>
            ${opts.showCat ? `<span class="badge cat">${c.label}</span>` : ''}
            ${opts.showCity && e.city !== state.city ? `<span class="badge">${esc(CITIES[e.city]?.name || '')}</span>` : ''}
            ${e.userCreated ? '<span class="badge">Creat de tine</span>' : ''}
          </div>
        </div>
        <button class="heart${saved.has(e.id) ? ' on' : ''}" data-heart="${esc(e.id)}" aria-label="Salvează">❤️</button>
      </div>`;
  }

  function renderChips(list) {
    const counts = {};
    list.forEach((e) => { counts[e.category] = (counts[e.category] || 0) + 1; });
    ['edu', 'social'].forEach((g) => {
      $('#chips-' + g).innerHTML = Object.entries(CATEGORIES).filter(([, c]) => c.group === g).map(([k, c]) => `
        <button class="chip${state.cats.has(k) ? ' active' : ''}${counts[k] ? '' : ' empty'}" data-cat="${k}" style="--c:${c.color}">
          <span class="dot">${c.icon}</span>${c.label} <span class="n">${counts[k] || 0}</span>
        </button>`).join('');
    });
  }

  function renderExplore() {
    const { list, parsed, usedTerms, scopeOn } = filterEvents();
    renderChips(filterEvents({ ignoreCats: true, allScope: true }).list);

    const u = $('#ai-understood');
    if (state.query.trim()) {
      const parts = [...parsed.labels, ...usedTerms.map((t) => `„${t}”`)];
      u.innerHTML = parts.length
        ? `✨ Am înțeles: <b>${parts.map(esc).join(' · ')}</b> — ${list.length ? `${list.length} rezultate` : 'nimic potrivit încă'}`
        : `✨ Nu am recunoscut filtre, caut după text. Încearcă: „concert gratuit weekend”, „internship IT”, „bowling mâine”.`;
      u.classList.remove('hidden');
    } else u.classList.add('hidden');

    const cityCount = cityEvents().length;
    const filterCount = Number(state.when !== 'all') + Number(state.free) + state.cats.size;
    $('#all-events-count').textContent = cityCount;
    $('#show-all-events').setAttribute('aria-pressed', String(!scopeOn && !filterCount && !state.query.trim()));
    $('#show-personal-events').setAttribute('aria-pressed', String(scopeOn));
    $('#filter-count').textContent = filterCount ? `(${filterCount})` : '';

    const recs = recommend();
    const showRecs = recs.length && scopeOn && !filterCount && !state.query;
    $('#for-you').classList.toggle('hidden', !showRecs);
    if (showRecs) {
      $('#for-you-list').innerHTML = recs.map(({ e, why }) => {
        const c = CATEGORIES[e.category];
        return `<button class="fy-card" style="--c:${c.color}" data-id="${esc(e.id)}">
          <div class="fy-top"><span>${c.icon} ${c.label}</span><span>${dayLabel(e.startDate)}</span></div>
          <div class="fy-title">${esc(e.title)}</div>
          <div class="fy-why">Pentru că te interesează: ${esc([...new Set(why)].slice(0, 3).join(', '))}</div>
        </button>`;
      }).join('');
    }

    const total = scopeOn ? filterEvents({ allScope: true }).list.length : list.length;
    $('#result-count').innerHTML = scopeOn
      ? `${list.length} pentru tine <span class="muted">din ${total} în ${esc(city().name)}</span>`
      : `${list.length} ${list.length === 1 ? 'eveniment' : 'evenimente'} <span class="muted">în ${esc(city().name)}</span>`;

    let empty = `<div class="empty-state"><span class="big">🔭</span>Niciun eveniment pentru filtrele alese.<br/>Încearcă altă perioadă sau altă categorie.</div>`;
    if (!cityCount) empty = '<div class="empty-state">Selecția UniPulse nu are evenimente viitoare pentru acest oraș. Poți consulta agenda organizatorilor mai jos.</div>';
    if (scopeOn && !list.length && total) {
      empty = '<div class="empty-state">Niciun eveniment nu corespunde intereselor tale. Folosește „Toate evenimentele” pentru lista completă din oraș.</div>';
    }
    $('#event-list').innerHTML = list.length ? list.map((e) => evCard(e)).join('') : empty;
    renderMarkers(list);
  }

  function teamCard(t) {
    const ev = byId(t.eventId);
    const isJoined = joined.has(t.id);
    const taken = (t.joined || 0) + (isJoined ? 1 : 0);
    const left = Math.max(0, t.spots - taken);
    return `
      <div class="team-card">
        <div class="team-head">
          <div>
            <div class="team-author">${esc(t.author)}</div>
            ${ev ? `<button class="team-event" data-id="${esc(ev.id)}">${CATEGORIES[ev.category].icon} ${esc(ev.title)}</button>` : ''}
          </div>
        </div>
        <div class="team-msg">${esc(t.message)}</div>
        ${t.have?.length ? `<div class="skill-row"><span class="lbl">Are:</span>${t.have.map((s) => `<span class="skill have">${esc(s)}</span>`).join('')}</div>` : ''}
        ${t.need?.length ? `<div class="skill-row"><span class="lbl">Caută:</span>${t.need.map((s) => `<span class="skill need">${esc(s)}</span>`).join('')}</div>` : ''}
        <div class="team-foot">
          <span class="spots">${left > 0 ? `${left} ${left === 1 ? 'loc liber' : 'locuri libere'}` : 'Echipă completă'}</span>
          ${t.mine ? '<span class="badge">Postarea ta</span>' :
            `<button class="btn ${isJoined ? 'ghost' : 'primary'} small" data-join="${esc(t.id)}" ${!isJoined && left === 0 ? 'disabled' : ''}>${isJoined ? '✓ Ai cerut să intri' : 'Vreau în echipă'}</button>`}
        </div>
      </div>`;
  }

  function renderTeams() {
    const teams = allTeams().filter((t) => byId(t.eventId)?.city === state.city);
    $('#team-list').innerHTML = teams.length ? teams.map(teamCard).join('')
      : '<div class="empty-state">Nicio postare încă în acest oraș. Fii primul care caută echipă!</div>';
    const meetups = cityEvents().filter((e) => CATEGORIES[e.category].group === 'social');
    $('#meetup-list').innerHTML = meetups.length ? meetups.map((e) => evCard(e, { showCat: true })).join('')
      : '<div class="empty-state">Nicio ieșire programată. Organizează tu una!</div>';
  }

  function renderSaved() {
    const list = allEvents.filter((e) => saved.has(e.id));
    $('#saved-list').innerHTML = list.length ? list.map((e) => evCard(e, { showCat: true, showCity: true })).join('')
      : '<div class="empty-state"><span class="big">❤️</span>Apasă pe inimă la un eveniment ca să-l salvezi aici.</div>';
    $('#saved-count').textContent = saved.size;
    $('#saved-count').classList.toggle('hidden', !saved.size);
  }

  function renderAll() { renderExplore(); renderTeams(); renderSaved(); }

  function updateCityPill() {
    $('#city-name').textContent = city().name;
    const [label, url] = ORGANIZER_CALENDARS[state.city];
    const calendar = $('#organizer-calendar');
    calendar.href = url;
    calendar.textContent = label + ' ↗';
  }

  // ---------- Detalii ----------
  function openEvent(id, { fly = true } = {}) {
    const e = byId(id);
    if (!e) return;
    if (e.city !== state.city) { state.city = e.city; updateCityPill(); renderAll(); goToCity(false); }
    state.activeId = id;
    const c = CATEGORIES[e.category];
    const teams = allTeams().filter((t) => t.eventId === id);
    const going = joined.has('go:' + id);
    const left = e.spots ? Math.max(0, e.spots - (going ? 1 : 0)) : null;
    const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}`;
    const eventUrl = externalEventLink(e.url);
    const canTeam = ['hackathon', 'concurs', 'sport', 'meetup', 'workshop'].includes(e.category);
    const dist = distText(e);
    const status = eventStatus(e);
    $('#detail-body').innerHTML = `
      <div class="d-hero" style="--c:${c.color}">
        <div class="d-grab"></div>
        <div class="d-icon">${c.icon}</div>
        <div class="d-cat">${c.label}${e.featured ? ' · ⭐ Recomandat' : ''}</div>
        <h2>${esc(e.title)}</h2>
        <div class="d-org">de ${esc(e.organizer || 'Comunitatea UniPulse')}</div>
      </div>
      <div class="d-body">
        <div class="d-facts">
          <div class="fact"><div class="fi">🗓️</div><div class="fv"><b>${esc(whenText(e))}</b>${status ? `<span>${status}</span>` : ''}</div></div>
          <div class="fact"><div class="fi">📍</div><div class="fv"><b>${esc(e.venueName)}</b><span>${esc(e.address)}${dist ? ` · la ${dist} de tine` : ''}</span></div></div>
          <div class="fact"><div class="fi">🎟️</div><div class="fv"><b>${priceText(e)}</b>${left !== null ? `<span>${left} locuri disponibile din ${e.spots}</span>` : ''}</div></div>
        </div>
        <p class="d-desc">${esc(e.description || '')}</p>
        ${e.tags?.length ? `<div class="d-tags">${e.tags.map((t) => `<span>#${esc(t)}</span>`).join('')}</div>` : ''}
        <div class="d-actions">
          ${eventUrl ? `<a class="btn primary wide" href="${esc(eventUrl)}" target="_blank" rel="noopener">${e.userCreated ? 'Site-ul evenimentului' : 'Sursa oficială ↗'}</a>` : ''}
          <button class="btn ghost" data-going="${esc(id)}">${going ? '✓ Marcat în browser' : 'Marchează interesul'}</button>
          <button class="btn ghost" data-heart="${esc(id)}">${saved.has(id) ? '❤️ Salvat' : '🤍 Salvează'}</button>
          <a class="btn ghost" href="${gmaps}" target="_blank" rel="noopener">🧭 Traseu</a>
          <button class="btn ghost" data-ics="${esc(id)}">📅 Calendar</button>
          <button class="btn ghost ${eventUrl ? 'wide' : ''}" data-share="${esc(id)}">🔗 Trimite</button>
        </div>
        ${canTeam ? `
        <div class="d-teams">
          <div class="section-title" style="margin-top:0"><span>🤝 Echipe pentru acest eveniment (${teams.length})</span></div>
          ${teams.map(teamCard).join('')}
          <button class="btn ghost block" data-newteam="${esc(id)}">🔎 Caut echipă / coechipieri</button>
        </div>` : ''}
      </div>`;
    $('#detail').classList.remove('hidden');
    $('#detail').scrollTop = 0;
    if (location.hash !== '#ev-' + id) history.replaceState(null, '', '#ev-' + id);
    $$('.ev-card').forEach((el) => el.classList.toggle('active', el.dataset.id === id));
    markActivePin();
    if (isMobile()) sheetTo('peek');
    if (fly) flyToEvent(e);
  }

  function openVenue(evs) {
    const v = evs[0];
    state.activeId = null;
    $('#detail-body').innerHTML = `
      <div class="d-hero" style="--c:#0f172a">
        <div class="d-grab"></div>
        <div class="d-icon">🏛️</div>
        <div class="d-cat">${evs.length} evenimente în această clădire</div>
        <h2>${esc(v.venueName)}</h2>
        <div class="d-org">${esc(v.address)}</div>
      </div>
      <div class="venue-list">${evs.map((e) => evCard(e, { showCat: true })).join('')}</div>`;
    $('#detail').classList.remove('hidden');
    $('#detail').scrollTop = 0;
    if (isMobile()) sheetTo('peek');
    flyToEvent(v);
  }

  function closeDetail() {
    $('#detail').classList.add('hidden');
    state.activeId = null;
    highlightBuilding(null);
    markActivePin();
    $$('.ev-card.active').forEach((el) => el.classList.remove('active'));
    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  }

  function openFromHash() {
    const m = location.hash.match(/^#ev-(.+)$/);
    if (!m) return;
    let id;
    try { id = decodeURIComponent(m[1]); } catch { return; }
    if (byId(id)) openEvent(id);
  }

  // ---------- Acțiuni ----------
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), 2800);
  }

  function toggleSave(id) {
    if (saved.has(id)) { saved.delete(id); toast('Eliminat din salvate'); } else { saved.add(id); toast('❤️ Salvat'); }
    store.set('saved', [...saved]);
    renderAll();
    if (state.activeId === id) openEvent(id, { fly: false });
  }

  function toggleJoin(key, msg) {
    if (joined.has(key)) joined.delete(key); else { joined.add(key); toast(msg); }
    store.set('joined', [...joined]);
  }

  function downloadICS(id) {
    const e = byId(id);
    if (!e) return;
    const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const day = (utc) => new Date(utc).toISOString().slice(0, 10).replace(/-/g, '');
    const dates = e.dateOnly
      ? [`DTSTART;VALUE=DATE:${day(e.startDay)}`, `DTEND;VALUE=DATE:${day(e.endDay + DAY)}`]
      : [`DTSTART:${f(e.startDate)}`, ...(e.startOnly ? [] : [`DTEND:${f(e.endDate)}`])];
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//UniPulse//RO', 'BEGIN:VEVENT',
      `UID:${e.id}@unipulse`, `DTSTAMP:${f(new Date())}`, ...dates,
      `SUMMARY:${e.title.replace(/[,;]/g, ' ')}`, `LOCATION:${(e.venueName + ', ' + e.address + ', ' + (CITIES[e.city]?.name || '')).replace(/[,;]/g, ' ')}`,
      `DESCRIPTION:${(e.description || '').replace(/[,;\n]/g, ' ')}${e.url ? ' ' + e.url : ''}`,
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = `${e.id}.ics`;
    document.body.appendChild(a); a.click(); a.remove();
    toast('📅 Fișier de calendar descărcat');
  }

  async function shareLink(id) {
    const e = byId(id);
    if (!e) return;
    const url = location.href.split('#')[0] + '#ev-' + id;
    if (navigator.share) {
      try { await navigator.share({ title: e.title, text: `${e.title} · ${whenText(e)}`, url }); return; } catch { /* anulat */ }
    }
    try { await navigator.clipboard.writeText(url); toast('🔗 Link copiat'); } catch { toast(url); }
  }

  // ---------- Modale ----------
  function openModal(html) { $('#modal-body').innerHTML = html; $('#modal').classList.remove('hidden'); }
  function closeModal() { $('#modal').classList.add('hidden'); }

  // Onboarding în 2 pași: 1) orașul, 2) interesele + ce vrei să vezi pe hartă
  function onboarding(step = 1, draft = null) {
    const d = draft || {
      city: profile?.city || state.city, faculty: profile?.faculty || '',
      cats: [...(profile?.cats || [])], topics: [...(profile?.topics || [])], scope: profile?.scope || 'all',
    };
    const first = !profile;
    if (step === 1) {
      openModal(`
        <div class="steps"><span class="on"></span><span></span></div>
        <h3>${first ? '👋 Bun venit pe UniPulse!' : '📍 Orașul tău'}</h3>
        <p>În ce oraș studiezi? Îți arătăm harta și evenimentele de acolo. Poți schimba oricând din butonul cu orașul de sus.</p>
        <div class="city-grid">${Object.entries(CITIES).map(([k, c]) => {
          const n = allEvents.filter((e) => e.city === k).length;
          return `<button type="button" class="city-card${d.city === k ? ' active' : ''}" data-city="${k}">
            <span class="ce">${c.emoji}</span><b>${esc(c.name)}</b><span class="muted small">${n} evenimente</span></button>`;
        }).join('')}</div>
        <div class="modal-actions"><button class="btn primary" id="ob-next">Continuă →</button></div>`);
      $$('.city-card').forEach((b) => b.addEventListener('click', () => {
        d.city = b.dataset.city; $$('.city-card').forEach((x) => x.classList.toggle('active', x === b));
      }));
      $('#ob-next').onclick = () => onboarding(2, d);
      return;
    }
    const facs = [...(FACULTIES[d.city] || []), 'Altă facultate'];
    openModal(`
      <div class="steps"><span class="on"></span><span class="on"></span></div>
      <h3>🎯 Ce te interesează?</h3>
      <p>Alege tipurile de evenimente și domeniile tale. Pe hartă îți arătăm mai întâi ce se potrivește.</p>
      <div class="field"><label>Facultatea</label>
        <select id="pf-fac"><option value="">Alege…</option>${facs.map((f) => `<option ${d.faculty === f ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Tipuri de evenimente</label>
        <div class="select-chips" id="pf-cats">${Object.entries(CATEGORIES).map(([k, c]) => `<button type="button" class="pill${d.cats.includes(k) ? ' active' : ''}" data-v="${k}">${c.icon} ${c.label}</button>`).join('')}</div>
      </div>
      <div class="field"><label>Domenii</label>
        <div class="select-chips" id="pf-topics">${TOPICS.map((t) => `<button type="button" class="pill${d.topics.includes(t) ? ' active' : ''}" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      </div>
      <div class="field"><label>Pe hartă vreau să văd</label>
        <div class="seg" id="pf-scope">
          <button type="button" data-v="mine" class="${d.scope === 'mine' ? 'active' : ''}">🎯 Ce mă interesează</button>
          <button type="button" data-v="all" class="${d.scope === 'all' ? 'active' : ''}">🌍 Toate evenimentele</button>
        </div>
        <span class="muted small">Poți comuta oricând din lista de evenimente.</span>
      </div>
      <div class="modal-actions">
        <button class="btn ghost" id="pf-back">← Înapoi</button>
        <button class="btn primary" id="pf-save">${first ? 'Gata, arată-mi harta' : 'Salvează'}</button>
      </div>`);
    $$('#pf-cats .pill, #pf-topics .pill').forEach((b) => b.addEventListener('click', () => b.classList.toggle('active')));
    $$('#pf-scope button').forEach((b) => b.addEventListener('click', () => {
      $$('#pf-scope button').forEach((x) => x.classList.toggle('active', x === b));
    }));
    const collect = () => {
      d.faculty = $('#pf-fac').value;
      d.cats = $$('#pf-cats .pill.active').map((b) => b.dataset.v);
      d.topics = $$('#pf-topics .pill.active').map((b) => b.dataset.v);
      d.scope = $('#pf-scope button.active')?.dataset.v || 'mine';
    };
    $('#pf-back').onclick = () => { collect(); onboarding(1, d); };
    $('#pf-save').onclick = () => {
      collect();
      const cityChanged = d.city !== state.city;
      profile = { ...d };
      store.set('profile', profile);
      state.scope = profile.scope;
      state.cats.clear();
      closeModal();
      if (cityChanged) { state.city = d.city; store.set('city', d.city); updateCityPill(); goToCity(!first); }
      renderAll();
      toast(hasPrefs() && state.scope === 'mine' ? '🎯 Îți arătăm evenimentele potrivite pentru tine' : '🌍 Îți arătăm toate evenimentele');
    };
  }

  function cityModal() {
    openModal(`
      <h3>📍 Alege orașul</h3>
      <p>Harta rămâne centrată pe orașul ales.</p>
      <div class="city-grid">${Object.entries(CITIES).map(([k, c]) => {
        const n = allEvents.filter((e) => e.city === k).length;
        return `<button type="button" class="city-card${state.city === k ? ' active' : ''}" data-city="${k}">
          <span class="ce">${c.emoji}</span><b>${esc(c.name)}</b><span class="muted small">${n} evenimente</span></button>`;
      }).join('')}</div>`);
    $$('.city-card').forEach((b) => b.addEventListener('click', () => { closeModal(); setCity(b.dataset.city); }));
  }

  function loginModal(asOrganizer) {
    openModal(`
      <h3>${asOrganizer ? '📣 Publică un eveniment' : '🔐 Intră în cont'}</h3>
      <p>${asOrganizer
        ? 'Organizatorii (asociații studențești, facultăți, companii) își vor putea adăuga evenimentele direct pe hartă.'
        : 'Te vei loga cu adresa de email: primești un link pe mail și ești înăuntru, fără parolă.'}</p>
      <div class="field"><label>Email</label><input type="email" placeholder="nume.prenume@student.upt.ro" disabled /></div>
      <button class="btn primary block" disabled>Trimite link de logare</button>
      <div class="roadmap"><b>🚧 Vine în etapa 2:</b>
        <ul>
          <li>Logare cu email (magic link)</li>
          <li>Rol de organizator și organizator la nivel de facultate</li>
          <li>Formular de publicare eveniment cu alegerea clădirii pe hartă</li>
          <li>Moderare și badge „Verificat” pentru organizatori</li>
        </ul>
      </div>
      <button class="btn ghost block" id="lg-prefs" style="margin-top:12px">⚙️ Între timp: schimbă orașul și interesele</button>`);
    $('#lg-prefs').onclick = () => onboarding(2);
  }

  function teamModal(eventId) {
    const options = cityEvents().filter((e) => ['hackathon', 'concurs', 'sport', 'meetup', 'workshop'].includes(e.category));
    if (!options.length) { toast('Nu există încă evenimente de echipă în acest oraș'); return; }
    openModal(`
      <h3>🔎 Caut echipă</h3>
      <p>Spune ce știi să faci și pe cine cauți. Postarea apare la eveniment și în secțiunea „Echipe”.</p>
      <form id="team-form">
        <div class="field"><label>Pentru evenimentul</label>
          <select id="tf-ev" required>${options.map((e) => `<option value="${esc(e.id)}" ${e.id === eventId ? 'selected' : ''}>${CATEGORIES[e.category].icon} ${esc(e.title)}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Numele tău și facultatea</label><input id="tf-author" required placeholder="Ex: Maria · UPT AC, anul 2" /></div>
        <div class="field-row">
          <div class="field"><label>Ce știi să faci</label><input id="tf-have" placeholder="React, design, pitch" /></div>
          <div class="field"><label>Pe cine cauți</label><input id="tf-need" placeholder="Backend, ML" /></div>
        </div>
        <div class="field"><label>Câți oameni cauți</label><input id="tf-spots" type="number" min="1" max="10" value="2" /></div>
        <div class="field"><label>Mesaj</label><textarea id="tf-msg" rows="3" required placeholder="Ideea, ce vrei să construiești, cum ne auzim…"></textarea></div>
        <div class="modal-actions"><button type="button" class="btn ghost" data-close>Renunță</button><button class="btn primary">Publică</button></div>
      </form>`);
    $('#team-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const split = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
      const t = {
        id: 'u' + Date.now(), eventId: $('#tf-ev').value, author: $('#tf-author').value.trim(),
        have: split($('#tf-have').value), need: split($('#tf-need').value),
        spots: Math.max(1, Number($('#tf-spots').value) || 1), joined: 0, message: $('#tf-msg').value.trim(), mine: true,
      };
      userTeams.unshift(t); store.set('userTeams', userTeams);
      closeModal(); renderAll(); switchTab('teams');
      toast('✅ Postarea a fost publicată');
    });
  }

  let pendingMeetup = null;
  function meetupModal(draft = {}) {
    const cityVenues = Object.entries(VENUES).filter(([, v]) => (v.city || 'timisoara') === state.city);
    const d = { title: '', category: 'social', when: '', venue: cityVenues[0]?.[0], spots: 10, description: '', url: '', ...draft };
    const defaultWhen = (() => { const t = new Date(Date.now() + DAY); t.setHours(19, 0, 0, 0); return new Date(t - t.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })();
    openModal(`
      <h3>🎉 Organizează o ieșire</h3>
      <p>Bowling, meci, operă, sesiune de învățat împreună… Apare pe hartă și oricine se poate alătura.</p>
      <form id="mu-form">
        <div class="field"><label>Titlu</label><input id="mu-title" required value="${esc(d.title)}" placeholder="Ex: Bowling vineri seara, cine vine?" /></div>
        <div class="field-row">
          <div class="field"><label>Tip</label>
            <select id="mu-cat">${['social', 'meetup', 'sport', 'cultura', 'voluntariat'].map((k) => `<option value="${k}" ${d.category === k ? 'selected' : ''}>${CATEGORIES[k].icon} ${CATEGORIES[k].label}</option>`).join('')}</select>
          </div>
          <div class="field"><label>Când</label><input id="mu-when" type="datetime-local" required value="${esc(d.when || defaultWhen)}" /></div>
        </div>
        <div class="field"><label>Unde</label>
          <select id="mu-venue">
            ${d.lat ? '<option value="__pick" selected>📍 Locația aleasă pe hartă</option>' : ''}
            ${cityVenues.map(([k, v]) => `<option value="${k}" ${!d.lat && d.venue === k ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}
          </select>
          <button type="button" class="btn ghost small" id="mu-pick" style="align-self:flex-start;margin-top:4px">📍 Alege pe hartă</button>
          ${d.lat ? `<div class="loc-picked">✓ Locație aleasă: ${d.lat.toFixed(5)}, ${d.lng.toFixed(5)}</div>` : ''}
        </div>
        ${d.lat ? `<div class="field"><label>Numele locului</label><input id="mu-place" value="${esc(d.venueName || '')}" placeholder="Ex: Bowling Center, Cafeneaua X" /></div>` : ''}
        <div class="field-row">
          <div class="field"><label>Locuri</label><input id="mu-spots" type="number" min="2" max="500" value="${esc(d.spots)}" /></div>
          <div class="field"><label>Link (opțional)</label><input id="mu-url" type="url" value="${esc(d.url)}" placeholder="https://…" /></div>
        </div>
        <div class="field"><label>Detalii</label><textarea id="mu-desc" rows="3" placeholder="Unde ne întâlnim, ce trebuie să aduci…">${esc(d.description)}</textarea></div>
        <div class="modal-actions"><button type="button" class="btn ghost" data-close>Renunță</button><button class="btn primary">Publică pe hartă</button></div>
      </form>`);
    const collect = () => ({
      title: $('#mu-title').value, category: $('#mu-cat').value, when: $('#mu-when').value,
      venue: $('#mu-venue').value === '__pick' ? null : $('#mu-venue').value,
      lat: $('#mu-venue').value === '__pick' ? d.lat : undefined, lng: $('#mu-venue').value === '__pick' ? d.lng : undefined,
      venueName: $('#mu-place')?.value, spots: $('#mu-spots').value, url: $('#mu-url').value, description: $('#mu-desc').value,
    });
    $('#mu-pick').onclick = () => { pendingMeetup = collect(); closeModal(); startPicking(); };
    $('#mu-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const v = collect();
      const start = new Date(v.when);
      if (isNaN(start) || start < Date.now()) { toast('Alege o dată din viitor'); return; }
      const e = {
        id: 'u-' + Date.now(), title: v.title.trim(), category: v.category, startISO: start.toISOString(), durationH: 3,
        price: 0, spots: Number(v.spots) || 10, organizer: 'Organizat de tine', tags: ['Socializare'],
        url: externalEventLink(v.url), description: v.description.trim(), userCreated: true, city: state.city,
      };
      if (v.venue) e.venue = v.venue; else { e.lat = v.lat; e.lng = v.lng; e.venueName = (v.venueName || '').trim() || 'Locație aleasă pe hartă'; }
      userEvents.push(e); store.set('userEvents', userEvents);
      rebuildEvents(); closeModal(); renderAll();
      toast('🎉 Ieșirea a apărut pe hartă');
      openEvent(e.id);
    });
  }

  function startPicking() {
    if (!map) { meetupModal(pendingMeetup); return; }
    document.body.classList.add('picking');
    $('#pick-banner').classList.remove('hidden');
    closeDetail();
    if (isMobile()) sheetTo('peek');
    map.once('click', onPick);
  }
  function onPick(ev) {
    stopPicking();
    if (pickMarker) pickMarker.remove();
    const el = document.createElement('div'); el.className = 'pick-marker';
    pickMarker = new maplibregl.Marker({ element: el }).setLngLat(ev.lngLat).addTo(map);
    setTimeout(() => { pickMarker?.remove(); pickMarker = null; }, 4000);
    meetupModal({ ...pendingMeetup, lat: ev.lngLat.lat, lng: ev.lngLat.lng });
  }
  function stopPicking() {
    document.body.classList.remove('picking');
    $('#pick-banner').classList.add('hidden');
    if (map) map.off('click', onPick);
  }

  // ---------- Tab-uri ----------
  function switchTab(tab) {
    state.tab = tab;
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
    ['explore', 'teams', 'saved'].forEach((k) => $('#tab-' + k).classList.toggle('hidden', k !== tab));
    if (isMobile() && document.body.dataset.sheet === 'peek') sheetTo('half');
  }

  // ---------- Panou glisant pe mobil (bottom sheet) ----------
  const sheetLevels = ['peek', 'half', 'full'];
  function sheetSizes() {
    const viewport = window.visualViewport?.height || window.innerHeight;
    const full = Math.max(140, Math.round(viewport - 80));
    return { peek: Math.min(full, 142), half: Math.min(full, Math.max(235, Math.round(viewport * .53))), full };
  }
  function sheetTo(level) {
    if (!isMobile()) return;
    const sizes = sheetSizes();
    const panel = $('#panel');
    panel.style.setProperty('--sheet-full', sizes.full + 'px');
    panel.style.setProperty('--sheet-visible', sizes[level] + 'px');
    panel.style.setProperty('--sheet-offset', sizes.full - sizes[level] + 'px');
    document.body.style.setProperty('--sheet-map-bottom', sizes[level] + 'px');
    document.body.dataset.sheet = level;
  }

  function setupSheet() {
    const panel = $('#panel');
    const grab = $('#sheet-handle');
    let pointer = null;
    let frame = 0;
    let resizeFrame = 0;
    let moved = false;
    grab.addEventListener('pointerdown', event => {
      if (!isMobile() || !event.isPrimary || event.button !== 0) return;
      const sizes = sheetSizes();
      const visible = sizes[document.body.dataset.sheet] || sizes.half;
      moved = false;
      pointer = { id: event.pointerId, startY: event.clientY, startVisible: visible, visible, sizes };
      grab.setPointerCapture(event.pointerId);
    });
    grab.addEventListener('pointermove', event => {
      if (pointer?.id !== event.pointerId) return;
      const distance = pointer.startY - event.clientY;
      if (!moved && Math.abs(distance) < 6) return;
      if (!moved) panel.classList.add('dragging');
      moved = true;
      pointer.visible = Math.min(pointer.sizes.full, Math.max(pointer.sizes.peek, pointer.startVisible + distance));
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        if (pointer) panel.style.setProperty('--sheet-offset', pointer.sizes.full - pointer.visible + 'px');
      });
    });
    const end = event => {
      if (pointer?.id !== event.pointerId) return;
      cancelAnimationFrame(frame);
      frame = 0;
      const { visible, sizes } = pointer;
      pointer = null;
      panel.classList.remove('dragging');
      if (!moved) return;
      const nearest = sheetLevels.reduce((a, b) => Math.abs(sizes[a] - visible) <= Math.abs(sizes[b] - visible) ? a : b);
      sheetTo(nearest);
    };
    grab.addEventListener('pointerup', end);
    grab.addEventListener('pointercancel', end);
    grab.addEventListener('click', event => {
      if (moved && event.detail) { moved = false; return; }
      const current = sheetLevels.indexOf(document.body.dataset.sheet);
      sheetTo(sheetLevels[(current + 1) % sheetLevels.length]);
    });
    const onResize = () => {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        sheetTo(document.body.dataset.sheet || 'half');
      });
    };
    window.addEventListener('resize', onResize, { passive: true });
    window.visualViewport?.addEventListener('resize', onResize, { passive: true });
    sheetTo('half');
  }

  // ---------- Instalare ca aplicație (PWA) ----------
  let installEvt = null;
  function setupPWA() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* nu e critic */ });
    }
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const dismissed = store.get('installDismissed', false);
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const show = () => { if (!standalone && !dismissed && isMobile()) $('#install-banner').classList.remove('hidden'); };
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; show(); });
    if (isIOS) show();
    $('#install-go').addEventListener('click', async () => {
      if (installEvt) {
        installEvt.prompt();
        try { await installEvt.userChoice; } catch { /* ignorat */ }
        installEvt = null; $('#install-banner').classList.add('hidden');
      } else {
        openModal(`<h3>📲 Instalează pe iPhone</h3>
          <p>1. Apasă butonul <b>Partajează</b> (pătratul cu săgeată) din Safari.<br/>2. Alege <b>„Adaugă pe ecranul principal”</b>.<br/>3. UniPulse apare ca o aplicație, pe tot ecranul.</p>`);
      }
    });
    $('#install-x').addEventListener('click', () => { store.set('installDismissed', true); $('#install-banner').classList.add('hidden'); });
  }

  // ---------- Evenimente UI ----------
  function bindUI() {
    document.addEventListener('click', (ev) => {
      const t = ev.target;
      const heart = t.closest('[data-heart]');
      if (heart) { ev.stopPropagation(); toggleSave(heart.dataset.heart); return; }
      const join = t.closest('[data-join]');
      if (join) {
        toggleJoin(join.dataset.join, 'Interesul pentru echipă a fost salvat în acest browser.');
        renderTeams(); if (state.activeId) openEvent(state.activeId, { fly: false }); return;
      }
      const going = t.closest('[data-going]');
      if (going) { toggleJoin('go:' + going.dataset.going, 'Interesul a fost salvat în acest browser. Înscrierile se fac la organizator.'); openEvent(going.dataset.going, { fly: false }); return; }
      const ics = t.closest('[data-ics]'); if (ics) { downloadICS(ics.dataset.ics); return; }
      const share = t.closest('[data-share]'); if (share) { shareLink(share.dataset.share); return; }
      const nt = t.closest('[data-newteam]'); if (nt) { teamModal(nt.dataset.newteam); return; }
      if (t.closest('[data-close]')) { closeModal(); return; }
      const card = t.closest('.ev-card, .fy-card, .team-event');
      if (card && card.dataset.id) openEvent(card.dataset.id);
    });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        if (!$('#modal').classList.contains('hidden')) closeModal();
        else if (document.body.classList.contains('picking')) { stopPicking(); meetupModal(pendingMeetup); }
        else closeDetail();
      }
      if (ev.key === 'Enter' && ev.target.classList?.contains('ev-card')) openEvent(ev.target.dataset.id);
    });

    $$('.tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));

    $('.filters').addEventListener('click', (ev) => {
      const chip = ev.target.closest('.chip'); if (!chip) return;
      const k = chip.dataset.cat;
      if (state.cats.has(k)) state.cats.delete(k); else state.cats.add(k);
      renderExplore();
    });
    $('#when-row').addEventListener('click', (ev) => {
      const p = ev.target.closest('[data-when]'); if (!p) return;
      state.when = p.dataset.when;
      $$('#when-row [data-when]').forEach((b) => b.classList.toggle('active', b === p));
      renderExplore();
    });
    $('#free-only').addEventListener('change', (ev) => {
      state.free = ev.target.checked;
      ev.target.closest('.pill').classList.toggle('active', state.free);
      renderExplore();
    });
    let qt;
    const showEvents = scope => {
      clearTimeout(qt);
      state.cats.clear();
      state.when = 'all';
      state.free = false;
      state.query = '';
      $('#q').value = '';
      $('#clear-q').classList.add('hidden');
      $('#free-only').checked = false;
      $('#free-only').closest('.pill').classList.remove('active');
      $$('#when-row [data-when]').forEach(button => button.classList.toggle('active', button.dataset.when === 'all'));
      $('.filter-panel').open = false;
      closeDetail();
      switchTab('explore');
      sheetTo('half');
      setScope(scope);
      $('#tab-explore').scrollTop = 0;
    };
    $('#show-all-events').addEventListener('click', () => showEvents('all'));
    $('#show-personal-events').addEventListener('click', () => {
      if (!hasPrefs()) { onboarding(2); return; }
      showEvents('mine');
    });
    $('#q').addEventListener('input', (ev) => {
      clearTimeout(qt);
      $('#clear-q').classList.toggle('hidden', !ev.target.value);
      qt = setTimeout(() => { state.query = ev.target.value; renderExplore(); }, 180);
    });
    $('#q').addEventListener('focus', () => { if (isMobile()) sheetTo('full'); });
    $('#ai-search').addEventListener('submit', (ev) => { ev.preventDefault(); state.query = $('#q').value; renderExplore(); $('#q').blur(); });
    $('#clear-q').addEventListener('click', () => { $('#q').value = ''; state.query = ''; $('#clear-q').classList.add('hidden'); renderExplore(); });

    $('#detail-close').addEventListener('click', closeDetail);
    $('#modal-close').addEventListener('click', closeModal);
    $('#modal').addEventListener('click', (ev) => { if (ev.target.id === 'modal') closeModal(); });
    $('#edit-interests').addEventListener('click', () => onboarding(2));
    $('#btn-prefs').addEventListener('click', () => onboarding(2));
    $('#btn-city').addEventListener('click', cityModal);
    $('#btn-login').addEventListener('click', () => loginModal(false));
    $('#btn-organizer').addEventListener('click', () => loginModal(true));
    $('#btn-new-team').addEventListener('click', () => teamModal());
    $('#btn-new-meetup').addEventListener('click', () => { pendingMeetup = null; meetupModal(); });
    $('#pick-cancel').addEventListener('click', () => { stopPicking(); meetupModal(pendingMeetup); });

    $('#btn-3d').addEventListener('click', () => { if (map) { stopTour(); set3D(!is3D); } });
    $('#btn-tour').addEventListener('click', () => (touring ? stopTour() : startTour()));
    $('#btn-home').addEventListener('click', () => { closeDetail(); goToCity(true); });
    $('#btn-locate').addEventListener('click', locateMe);

    window.addEventListener('hashchange', openFromHash);
  }

  function setScope(scope) {
    state.scope = scope;
    if (profile) { profile.scope = scope; store.set('profile', profile); }
    renderExplore();
  }

  // ---------- Pornire ----------
  bindUI();
  setupSheet();
  setupPWA();
  const checked = $('#calendar-verified');
  checked.dateTime = EVENT_CALENDAR_CHECKED;
  checked.textContent = fmtDate.format(new Date(EVENT_CALENDAR_CHECKED + 'T12:00:00Z'));
  updateCityPill();
  renderAll();
  set3D(is3D, false);
  openFromHash();
  loadMap();
  let eventClock = '';
  function refreshCalendar() {
    if (document.hidden) { stopTour(); return; }
    const next = [today(), ...allEvents.map(event => Number(isLive(event)) + ':' + Number(event.endDate >= Date.now()))].join('|');
    if (next === eventClock) return;
    eventClock = next;
    rebuildEvents();
    if (state.activeId && !byId(state.activeId)) closeDetail();
    renderAll();
  }
  document.addEventListener('visibilitychange', refreshCalendar);
  setInterval(refreshCalendar, 60000);
})();
