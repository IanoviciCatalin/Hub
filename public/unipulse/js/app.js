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

  // onStored trimite în cont cheile sincronizate (vezi „Sincronizare cu contul”).
  let onStored = null;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('unipulse:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) {
      try { localStorage.setItem('unipulse:' + k, JSON.stringify(v)); } catch { /* storage indisponibil */ }
      onStored?.(k);
    },
  };
  const social = window.UniPulseSocial;
  // Participări: socialState păstrează răspunsul complet pentru evenimentul deschis,
  // participantCounts doar numărul, pentru carduri.
  const socialState = new Map();
  let participantCounts = {};
  let rsvpBusy = false;
  const goingCount = (id) => socialState.get(id)?.count ?? participantCounts[id] ?? 0;
  const canParticipate = (e) => !!social && !e.userCreated;
  let activeRoom = null;
  let chatTimer = 0;
  let chatDelay = 3000;
  let chatMessages = [];

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
  function hydrate(ev, origin) {
    const venue = ev.venue && VENUES[ev.venue] ? VENUES[ev.venue] : null;
    const e = { ...ev, origin, group: eventGroup(ev) };
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
    if (ev.community) e.organizer = ev.ownerName || 'Un student';
    return e;
  }

  let userEvents = store.get('userEvents', []);
  let userTeams = store.get('userTeams', []);
  let joined = new Set(store.get('joined', []));
  let saved = new Set(store.get('saved', []));
  let profile = store.get('profile', null);
  const allowsTopic = (topic, cats) => Object.hasOwn(TOPIC_TYPES, topic) && TOPIC_TYPES[topic].some(cat => cats.includes(cat));
  if (profile && Array.isArray(profile.topics)) {
    const valid = profile.topics.filter(topic => allowsTopic(topic, profile.cats || []));
    if (valid.length !== profile.topics.length) {
      profile.topics = valid;
      store.set('profile', profile);
    }
  }

  // Evenimentele comunității vin de pe server, pe oraș. userEvents sunt ieșirile vechi, salvate doar local.
  const communityEvents = new Map(); // oraș → evenimente
  // Evenimentele importate automat din surse oficiale (catalogul de pe server), pe oraș.
  const catalogEvents = new Map(); // oraș → evenimente
  // Linkuri comparabile: același anunț poate apărea cu „www.”, slash final sau parametri utm.
  function sameLink(value) {
    try {
      const url = new URL(value);
      for (const key of [...url.searchParams.keys()]) if (/^utm_|^fbclid$/i.test(key)) url.searchParams.delete(key);
      return url.hostname.toLowerCase().replace(/^www\./, '') + url.pathname.replace(/\/+$/, '') + url.search;
    } catch {
      return '';
    }
  }
  // Un eveniment importat care există deja în selecția statică (același link oficial) păstrează ID-ul static,
  // ca participanții și discuția să rămână legate de el; datele vin din import, fiind mai noi.
  function officialEvents() {
    const imported = [...catalogEvents.values()].flat();
    const byLink = new Map(imported.filter((e) => e.url).map((e) => [sameLink(e.url), e]));
    const used = new Set();
    const merged = EVENTS.map((event) => {
      const twin = event.url && byLink.get(sameLink(event.url));
      if (!twin) return event;
      used.add(twin.id);
      return { ...event, ...twin, id: event.id, venue: undefined, featured: event.featured };
    });
    return [...merged, ...imported.filter((e) => !used.has(e.id))];
  }
  let allEvents = [];
  function rebuildEvents() {
    allEvents = [
      ...officialEvents().map((event) => hydrate(event, 'official')),
      ...[...communityEvents.values()].flat().map((event) => hydrate(event, 'community')),
      ...userEvents.map((event) => hydrate(event, 'community')),
    ]
      .filter((e) => e.endDate >= Date.now() && Number.isFinite(e.lat) && Number.isFinite(e.lng) && Object.hasOwn(EVENT_GROUPS, e.group))
      .sort((a, b) => a.startDate - b.startDate);
  }
  rebuildEvents();
  const byId = (id) => allEvents.find((e) => e.id === id);
  // Echipele vin de pe server, pe oraș; postările vechi din acest browser rămân marcate „doar pe acest dispozitiv”.
  const serverTeams = new Map();
  const allTeams = () => [...(serverTeams.get(state.city) || []), ...userTeams.map((t) => ({ ...t, local: true }))];

  // ---------- Starea aplicației ----------
  const preferredCity = store.get('city', profile?.city);
  const state = {
    cats: new Set(), when: 'all', free: false, origin: 'all', query: '', tab: 'explore', activeId: null,
    city: Object.hasOwn(CITIES, preferredCity) ? preferredCity : 'timisoara',
    scope: new URLSearchParams(location.search).get('view') === 'all' ? 'all' : profile?.scope || 'all',
  };
  const city = () => CITIES[state.city];
  const cityEvents = () => allEvents.filter((e) => e.city === state.city);

  // ---------- Profil: „Pentru tine” vs „Toate” ----------
  const hasPrefs = () => !!profile && ((profile.eventGroups || profile.cats || []).length + (profile.topics || []).length > 0);
  const matchesCategoryPreference = (e) => Array.isArray(profile.eventGroups)
    ? profile.eventGroups.includes(e.group)
    : (profile.cats || []).includes(e.category);
  function matchesProfile(e) {
    if (!hasPrefs()) return true;
    const topics = (profile.topics || []).map(norm);
    return matchesCategoryPreference(e) || (e.tags || []).some((t) => topics.includes(norm(t)));
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
  const fmtLei = new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 });
  const isFree = (e) => !e.soldOut && e.price === 0 && !e.priceFrom;
  function priceText(e) {
    if (e.soldOut) return 'Bilete epuizate';
    if (isFree(e)) return 'Gratuit';
    if (!Number.isFinite(e.price)) return 'Acces la organizator';
    return `${e.priceFrom ? 'de la ' : ''}${fmtLei.format(e.price)} lei`;
  }
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
    cariera: ['cariera', 'cariere', 'job', 'joburi', 'internship', 'angajare', 'targ de carier', 'targ de job', 'recrutare', 'practica', 'stagiu'],
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
    // Pe început de cuvânt: „concurs” nu mai înseamnă și „curs”, „excursie” nu e curs.
    const tokens = n.split(/[^a-z0-9+#]+/).filter(Boolean);
    for (const [cat, words] of Object.entries(CAT_WORDS)) {
      if (words.some((w) => (w.includes(' ') ? n.includes(w) : tokens.some((t) => t.startsWith(w))))) { res.cats.add(cat); res.labels.push(CATEGORIES[cat].label); }
    }
    if (/\b(azi|astazi|diseara|acum)\b/.test(n)) res.when = 'today';
    else if (/\bmaine\b/.test(n)) res.when = 'tomorrow';
    else if (/weekend/.test(n)) res.when = 'weekend';
    else if (/saptaman/.test(n)) res.when = 'week';
    else {
      // „mai” e și adverb („mai multe”), așa că e lună doar în „în mai”, „pe 5 mai”, „luna mai”.
      const mi = MONTHS.findIndex((m) => (m === 'mai'
        ? /\b(in|pe|din|luna)\s+mai\b|\b\d{1,2}\s+mai\b/.test(n)
        : new RegExp('\\b' + m + '\\b').test(n)));
      if (mi >= 0) res.when = 'm' + mi;
      else if (/\bluna\b/.test(n)) res.when = 'month';
    }
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
      if (!opts.ignoreCats && state.cats.size && !state.cats.has(e.group)) return false;
      if (p.cats.size && !p.cats.has(e.category)) return false;
      if (state.origin !== 'all' && e.origin !== state.origin) return false;
      if (!inWhen(e, state.when, day)) return false;
      if (p.when && !inWhen(e, p.when, day)) return false;
      if ((state.free || p.free) && !isFree(e)) return false;
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
    const topics = (profile.topics || []).map(norm);
    return cityEvents().map((e) => {
      let score = 0; const why = [];
      if (matchesCategoryPreference(e)) { score += 3; why.push(EVENT_GROUPS[e.group].label); }
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
    // Iconițele lipsă din stil (porți, stâlpișori, parcări de biciclete) devin transparente încă de la
    // primele dale: nu se desenează puncte fără nume și consola nu se umple de avertismente.
    map.on('styleimagemissing', (event) => {
      if (!map.hasImage(event.id)) map.addImage(event.id, { width: 1, height: 1, data: new Uint8Array(4) });
    });
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');
    map.on('error', (ev) => {
      if (!map.isStyleLoaded() && String(ev?.error?.message || '').match(/fetch|network|style/i)) $('#map-error').classList.remove('hidden');
    });
    map.on('load', () => {
      enlargePlaceIcons();
      for (const layer of map.getStyle().layers) {
        if (layer.type === 'fill-extrusion' && layer['source-layer'] === 'building') {
          map.setLayoutProperty(layer.id, 'visibility', 'none');
        }
      }
      neutralFlatBuildings();
      setupHighlight();
      if (is3D) setup3DBuildings();
      const firstSymbol = map.getStyle().layers.find(layer => layer.type === 'symbol')?.id;
      map.addLayer(CATHEDRAL.createLayer(), firstSymbol);
      applyMapPalette();
      let cathedralCheck = 0;
      map.on('idle', () => {
        if (Date.now() - cathedralCheck < 1500) return;
        cathedralCheck = Date.now();
        refreshCathedralParts();
      });
      renderMarkers(filterEvents().list);
      const selected = state.activeId && byId(state.activeId);
      if (selected) flyToEvent(selected);
      else map.jumpTo(eventsCamera());
      document.dispatchEvent(new CustomEvent('unipulse:mapready'));
    });
    map.on('moveend', () => renderMarkers(mapEvents));
    ['mousedown', 'touchstart', 'wheel'].forEach((t) => map.on(t, () => stopTour()));
  }

  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const mapPalettes = {
    day: {
      ground: '#f4f3ec', parks: '#dce8d4', grass: '#e3ebdb', greenOutline: '#c6d8bd',
      water: '#b9dce5', waterLabel: '#365e6c', buildings: '#e7e3d9', buildingOutline: '#d5cfc3',
      road: '#fdfcf7', majorRoad: '#f5e8c6', casing: '#e2dcd0', path: '#c9c5ac', rail: '#aba69b',
      label: '#424d44', halo: '#faf9f3', sky: '#dfeaf0', horizon: '#f4f3ec',
    },
    night: {
      ground: '#172321', parks: '#254239', grass: '#203930', greenOutline: '#34564a',
      water: '#163e51', waterLabel: '#a9d6e7', buildings: '#384742', buildingOutline: '#414f48',
      road: '#354640', majorRoad: '#605a44', casing: '#243530', path: '#566d61', rail: '#6c786f',
      label: '#c6d4cd', halo: '#1c2825', sky: '#14252d', horizon: '#1d2c2d',
    },
  };
  const currentMapPalette = () => mapPalettes[document.body.dataset.theme] || mapPalettes.day;

  function palettePaint(layer, colors) {
    const { id, type, 'source-layer': source } = layer;
    if (type === 'background') return { 'background-color': colors.ground };
    if (id === 'park') return { 'fill-color': colors.parks, 'fill-outline-color': colors.greenOutline };
    if (id === 'park_outline') return { 'line-color': colors.greenOutline };
    if (id === 'water') return { 'fill-color': colors.water };
    if (id === 'road_area_pattern') return { 'fill-pattern': null, 'fill-color': colors.road };
    if (id === 'up-buildings') return { 'fill-extrusion-color': colors.buildings };
    if (type === 'fill' && source === 'building') return { 'fill-color': colors.buildings, 'fill-outline-color': colors.buildingOutline };
    if (type === 'fill' && (source === 'landcover' || source === 'landuse')) {
      const color = /wood|cemetery/.test(id) ? colors.parks : /grass|pitch|wetland/.test(id) ? colors.grass : colors.ground;
      return { 'fill-color': color };
    }
    if (type === 'line' && source === 'transportation') {
      const color = id.endsWith('_casing') ? colors.casing
        : id.includes('rail') ? colors.rail
        : /path|track/.test(id) ? colors.path
        : /motorway|trunk|primary/.test(id) ? colors.majorRoad : colors.road;
      return { 'line-color': color };
    }
    if (type === 'line' && source === 'waterway') return { 'line-color': colors.water };
    if (type === 'symbol' && source && layer.layout?.['text-field'] && !/shield/.test(id)) {
      return { 'text-color': id.startsWith('water') ? colors.waterLabel : colors.label, 'text-halo-color': colors.halo };
    }
    return null;
  }

  function applyMapPalette() {
    if (!map?.getLayer('up-highlight')) return;
    const colors = currentMapPalette();
    // Keep custom layers and their data in place while recoloring the Liberty style.
    for (const layer of map.getStyle().layers) {
      const paint = palettePaint(layer, colors);
      if (!paint) continue;
      for (const [property, color] of Object.entries(paint)) map.setPaintProperty(layer.id, property, color);
    }
    map.setSky?.({
      'sky-color': colors.sky, 'horizon-color': colors.horizon, 'fog-color': colors.horizon,
      'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.5, 'fog-ground-blend': 0.2,
    });
  }

  function applyTheme() {
    const night = store.get('theme', systemDark.matches ? 'night' : 'day') === 'night';
    document.body.dataset.theme = night ? 'night' : 'day';
    $('meta[name="theme-color"]').content = night ? '#252927' : '#f7f8f6';
    const control = $('#btn-night');
    control.setAttribute('aria-pressed', String(night));
    control.title = night ? 'Treci la modul de zi' : 'Treci la modul de noapte';
    applyMapPalette();
    const selected = state.activeId ? byId(state.activeId) : null;
    if (map?.getSource('up-highlight') && selected) highlightBuilding(selected);
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
      // Locurile fără iconiță în stil (porți, parcări de biciclete, stâlpișori) nu mai primesc un cerc
      // închis în loc: apar doar prin nume, iar cele fără nume nu se mai desenează deloc.
      map.setLayoutProperty(layer.id, 'icon-image', ['coalesce', ['image', layer.layout['icon-image']]]);
      if (isMobile() && (layer.id === 'poi_r1' || layer.id === 'poi_r7')) {
        const minZoom = layer.id === 'poi_r1' ? 15.5 : 15.8;
        map.setLayerZoomRange(layer.id, Math.max(layer.minzoom ?? 0, minZoom), layer.maxzoom ?? 24);
      }
      map.setLayoutProperty(layer.id, 'icon-size', [
        'match', ['get', 'class'],
        ['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'shop', 'grocery', 'bakery', 'clothing_store', 'supermarket', 'mall'], 1.32,
        1.12
      ]);
      map.setLayoutProperty(layer.id, 'icon-padding', 3);
      map.setLayoutProperty(layer.id, 'text-offset', [0, 0.85]);
    }
  }

  // Clădirile rămân neutre. Doar clădirea evenimentului ales primește culoarea tipului lui.
  let flatBuildingLayers = [];
  // Stilul desenează clădirile plate doar până la zoom 14. Stratul propriu le păstrează în 2D
  // la orice zoom, ca să existe clădirea pe care o colorăm.
  function neutralFlatBuildings() {
    const style = map.getStyle();
    const base = style.layers.find((layer) => layer.type === 'fill' && layer['source-layer'] === 'building');
    if (!base || map.getLayer('up-buildings-flat')) return;
    const firstSymbol = style.layers.find((l) => l.type === 'symbol')?.id;
    map.addLayer({
      id: 'up-buildings-flat', type: 'fill', source: base.source, 'source-layer': 'building', minzoom: 14,
      filter: ['!', ['in', ['id'], ['literal', [...cathedralIds]]]],
      layout: { visibility: is3D ? 'none' : 'visible' },
      paint: { 'fill-color': currentMapPalette().buildings, 'fill-outline-color': currentMapPalette().buildingOutline },
    }, firstSymbol);
    flatBuildingLayers = [base.id, 'up-buildings-flat'];
  }

  function setupHighlight() {
    if (map.getSource('up-highlight')) return;
    const firstSymbol = map.getStyle().layers.find((l) => l.type === 'symbol')?.id;
    map.addSource('up-highlight', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    map.addLayer({
      id: 'up-highlight-flat', type: 'fill', source: 'up-highlight',
      layout: { visibility: is3D ? 'none' : 'visible' },
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.82, 'fill-outline-color': '#ffffff' },
    }, firstSymbol);
    map.addLayer({
      id: 'up-highlight', type: 'fill-extrusion', source: 'up-highlight',
      layout: { visibility: is3D ? 'visible' : 'none' },
      paint: {
        'fill-extrusion-color': ['get', 'color'],
        // Aceeași creștere cu zoomul ca stratul de bază, ca piesele neutre să nu „sară”.
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, ['get', 'b'], 14.5, ['+', ['get', 'h'], ['get', 'lift']]],
        'fill-extrusion-base': ['get', 'b'],
        'fill-extrusion-opacity': 0.92,
        'fill-extrusion-vertical-gradient': true,
      },
    }, firstSymbol);
  }

  function setup3DBuildings() {
    if (map.getLayer('up-buildings')) return;
    const style = map.getStyle();
    const srcId = Object.keys(style.sources).find((k) => style.sources[k].type === 'vector');
    if (!srcId) return;
    const below = map.getLayer('up-highlight-flat') ? 'up-highlight-flat' : style.layers.find((l) => l.type === 'symbol')?.id;
    map.addLayer({
      id: 'up-buildings', type: 'fill-extrusion', source: srcId, 'source-layer': 'building', minzoom: 13,
      filter: baseBuildingFilter(),
      paint: {
        'fill-extrusion-color': currentMapPalette().buildings,
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, ['coalesce', ['get', 'render_min_height'], 0], 14.5, ['coalesce', ['get', 'render_height'], 8]],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.92,
        'fill-extrusion-vertical-gradient': true,
      },
    }, below);
    try { map.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.35, position: [1.3, 210, 40] }); } catch { /* opțional */ }
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

  // Filtrul stratului 3D: fără turnurile ascunse, fără Catedrală (are model propriu) și fără
  // clădirea evidențiată. Altfel pereții identici din două straturi produc z-fighting (zgomot).
  const cathedralIds = new Set(typeof CATHEDRAL === 'undefined' ? [] : CATHEDRAL.footprints);
  let highlighted = null; // { id, pieces }
  function baseBuildingFilter() {
    const hidden = [...cathedralIds];
    if (highlighted?.id != null) hidden.push(highlighted.id);
    return ['all', ['!', ['has', 'hide_3d']], ['!', ['in', ['id'], ['literal', hidden]]]];
  }
  function applyBaseFilter() {
    if (map?.getLayer('up-buildings')) map.setFilter('up-buildings', baseBuildingFilter());
    if (map?.getLayer('up-buildings-flat')) map.setFilter('up-buildings-flat', ['!', ['in', ['id'], ['literal', [...cathedralIds]]]]);
  }
  // Amprentele OSM ale Catedralei se schimbă când se editează harta: adăugăm automat
  // părțile aflate pe amplasamentul ei (sub 40 m de axul turlei).
  function refreshCathedralParts() {
    if (!map || typeof CATHEDRAL === 'undefined' || map.getZoom() < 14.5 || !map.getBounds().contains(CATHEDRAL.center)) return;
    const source = (map.getLayer('up-buildings') || map.getLayer('up-buildings-flat'))?.source;
    if (!source) return;
    const [cx, cy] = CATHEDRAL.center;
    const metersX = 111320 * Math.cos((cy * Math.PI) / 180);
    let added = false;
    for (const feature of map.querySourceFeatures(source, { sourceLayer: 'building' })) {
      if (feature.id == null || cathedralIds.has(feature.id)) continue;
      const rings = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates[0]]
        : feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates.map((p) => p[0]) : [];
      const near = rings.some((ring) => {
        const x = ring.reduce((s, p) => s + p[0], 0) / ring.length, y = ring.reduce((s, p) => s + p[1], 0) / ring.length;
        return Math.hypot((x - cx) * metersX, (y - cy) * 110540) < 40;
      });
      if (near) { cathedralIds.add(feature.id); added = true; }
    }
    if (added) applyBaseFilter();
  }

  const polygonsOf = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []);
  function bbox(rings) {
    const box = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [x, y] of rings[0]) { box[0] = Math.min(box[0], x); box[1] = Math.min(box[1], y); box[2] = Math.max(box[2], x); box[3] = Math.max(box[3], y); }
    return box;
  }
  const touches = (a, b, eps = 2e-6) => a[0] <= b[2] + eps && b[0] <= a[2] + eps && a[1] <= b[3] + eps && b[1] <= a[3] + eps;

  function clearHighlight() {
    map?.getSource('up-highlight')?.setData({ type: 'FeatureCollection', features: [] });
    if (highlighted) { highlighted = null; applyBaseFilter(); }
  }

  function highlightBuilding(e) {
    if (!map || !map.getSource('up-highlight')) return;
    const src = map.getSource('up-highlight');
    const layers = (is3D ? ['up-buildings', 'up-highlight'] : [...flatBuildingLayers, 'up-highlight-flat']).filter((id) => map.getLayer(id));
    if (!e || !layers.length) { clearHighlight(); return; }
    const p = map.project([e.lng, e.lat]);
    const r = 60;
    const pt = [e.lng, e.lat];
    const osmId = (ft) => (ft.layer.id.startsWith('up-highlight') ? ft.properties.osm ?? null : ft.id ?? null);
    const feats = map.queryRenderedFeatures([[p.x - r, p.y - r], [p.x + r, p.y + r]], { layers });
    let f = feats.find((ft) => pointInGeom(pt, ft.geometry));
    if (!f && feats.length) {
      f = feats.slice().sort((a, b) => distToGeom(pt, a.geometry) - distToGeom(pt, b.geometry))[0];
      if (distToGeom(pt, f.geometry) > 0.0006 ** 2) f = null;
    }
    if (!f) { clearHighlight(); return; }
    const id = osmId(f);
    // Toate bucățile clădirii din ecran: dalele o taie la margini, iar la zoom mic o unesc cu altele.
    let pieces;
    if (id != null && highlighted?.id === id) pieces = highlighted.pieces;
    else if (id != null) {
      pieces = map.queryRenderedFeatures({ layers: layers.filter((l) => !l.startsWith('up-highlight')), filter: ['==', ['id'], id] })
        .map((ft) => ({ geometry: ft.geometry, h: Number(ft.properties.render_height) || 12, b: Number(ft.properties.render_min_height) || 0 }));
    }
    if (!pieces?.length) pieces = [{ geometry: f.geometry, h: Number(f.properties.render_height ?? f.properties.h) || 12, b: Number(f.properties.render_min_height ?? f.properties.b) || 0 }];
    const parts = pieces.flatMap((piece) => polygonsOf(piece.geometry).map((coordinates) => ({ ...piece, coordinates, box: bbox(coordinates) })));
    const main = parts.find((part) => pointInRing(pt, part.coordinates[0]))
      || parts.slice().sort((a, b) => distToGeom(pt, { type: 'Polygon', coordinates: a.coordinates }) - distToGeom(pt, { type: 'Polygon', coordinates: b.coordinates }))[0];
    const tone = EVENT_GROUPS[e.group].color;
    const excluded = is3D && id != null;
    src.setData({
      type: 'FeatureCollection',
      features: parts
        .filter((part) => excluded || part === main || touches(part.box, main.box))
        .map((part) => ({
          type: 'Feature', geometry: { type: 'Polygon', coordinates: part.coordinates },
          properties: {
            h: part.h, b: part.b, lift: excluded ? 0 : 1.5, osm: id,
            color: part === main || touches(part.box, main.box) ? tone : currentMapPalette().buildings,
          },
        })),
    });
    const next = excluded ? { id, pieces } : null;
    if (next?.id !== highlighted?.id) { highlighted = next; applyBaseFilter(); }
  }

  let mapEvents = [];
  function groupMapEvents(list) {
    const venues = new Map();
    for (const event of list) {
      if (!venues.has(event.venueKey)) venues.set(event.venueKey, []);
      venues.get(event.venueKey).push(event);
    }
    const locations = [...venues].map(([key, events]) => {
      const first = events[0];
      return { key, events, coords: [first.lng, first.lat] };
    });
    if (locations.length < 8 || map.getZoom() >= 16) return locations;

    // Grupăm doar pinii aflați aproape unul de altul în vederea curentă.
    const groups = [];
    const distance = isMobile() ? 46 : 42;
    for (const location of locations) {
      const point = map.project(location.coords);
      const nearby = groups.find(group => point.dist(group.anchor) < distance);
      if (nearby) nearby.locations.push(location);
      else groups.push({ anchor: point, locations: [location] });
    }
    return groups.map(({ locations: members }) => {
      if (members.length === 1) return members[0];
      const bounds = new maplibregl.LngLatBounds();
      for (const location of members) bounds.extend(location.coords);
      return {
        key: '@area:' + members.map(location => location.key).sort().join('|'),
        events: members.flatMap(location => location.events),
        coords: bounds.getCenter(),
        bounds,
        locations: members.length,
      };
    });
  }

  function makeAreaMarker(group) {
    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'pin pin-area';
    const count = group.events.length;
    pin.textContent = count;
    pin.addEventListener('click', (event) => {
      event.stopPropagation();
      if (document.body.classList.contains('picking')) return;
      closeDetail();
      if (isMobile()) sheetTo('peek');
      map.fitBounds(group.bounds, {
        padding: isMobile() ? { top: 120, right: 48, bottom: sheetSizes().peek + 28, left: 48 } : 125,
        maxZoom: 16.7,
        duration: reducedMotion.matches ? 0 : 360,
      });
      if (event.detail === 0) map.getCanvas().focus();
    });
    const marker = new maplibregl.Marker({ element: pin, anchor: 'center' }).setLngLat(group.coords).addTo(map);
    pin.setAttribute('role', 'button');
    pin.setAttribute('aria-label', `${count} evenimente în ${group.locations} locații. Apropie harta.`);
    return marker;
  }

  function renderMarkers(list) {
    mapEvents = list;
    if (!map) return;
    const groups = groupMapEvents(list);
    const visibleKeys = new Set(groups.map(group => group.key));
    for (const [key, existing] of markers) {
      if (visibleKeys.has(key)) continue;
      existing.marker.remove();
      markers.delete(key);
    }
    groups.forEach(group => {
      const { key, events: evs } = group;
      const live = evs.some(isLive);
      const signature = evs.map(e => e.id).join('|') + ':' + live;
      const existing = markers.get(key);
      if (existing?.signature === signature) return;
      existing?.marker.remove();
      if (group.bounds) {
        markers.set(key, { marker: makeAreaMarker(group), signature });
        return;
      }
      const first = evs[0];
      const cat = EVENT_GROUPS[first.group];
      const el = document.createElement('div');
      el.className = 'pin' + (live ? ' live' : '');
      el.style.setProperty('--c', cat.color);
      el.dataset.key = key;
      const venueName = VENUES[first.venue]?.name || first.venueName;
      const icons = [...new Set(evs.map(eventIcon))];
      const head = icons.length === 1
        ? `<span>${icons[0]}</span>`
        : `<div class="pin-stack">${icons.slice(0, 3).map((i) => `<span>${i}</span>`).join('')}</div>`;
      el.innerHTML = `
        <div class="pin-label">${esc(evs.length === 1 ? first.title : `${venueName} · ${evs.length} evenimente`)}</div>
        <div class="pin-head">${head}</div>
        ${evs.length > 1 ? `<div class="pin-count">${evs.length}</div>` : ''}
        <div class="pin-pulse"></div>`;
      // Pinul se poate folosi și cu tastatura (Tab, apoi Enter sau Space).
      el.tabIndex = 0;
      const pinLabel = evs.length === 1
        ? `${first.title}, ${whenText(first)}, ${first.venueName}`
        : `${venueName}: ${evs.length} evenimente`;
      const activate = () => {
        if (document.body.classList.contains('picking')) return;
        if (evs.length === 1) openEvent(first.id); else openVenue(evs);
      };
      el.addEventListener('click', (ev) => { ev.stopPropagation(); activate(); });
      el.addEventListener('keydown', (ev) => {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        ev.preventDefault();
        ev.stopPropagation();
        activate();
      });
      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([first.lng, first.lat]).addTo(map);
      // MapLibre pune „Map marker” pe element; eticheta și rolul nostru se aplică după.
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', pinLabel);
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
    highlightBuilding(null);
    map.once('idle', () => {
      if (version === cameraChange && (state.activeId === e.id || state.venueKey === e.venueKey)) highlightBuilding(e);
    });
  }

  // Camera care cuprinde toate evenimentele afișate, lăsând loc pentru panou și bara de sus.
  // Fără evenimente (sau unul singur) rămâne vederea orașului.
  function eventsCamera() {
    const list = filterEvents().list;
    if (!map || list.length < 2) return {};
    const bounds = new maplibregl.LngLatBounds();
    list.forEach((e) => bounds.extend([e.lng, e.lat]));
    const padding = isMobile()
      ? { top: 116, bottom: sheetSizes().peek + 28, left: 46, right: 62 }
      : { top: 150, bottom: 80, left: (window.innerWidth > 900 ? 440 : 60), right: 100 };
    try {
      const camera = map.cameraForBounds(bounds, { padding, maxZoom: isMobile() ? 15.6 : 16.2 });
      if (!camera) return {};
      return { center: camera.center, zoom: Math.max(map.getMinZoom(), camera.zoom) };
    } catch { return {}; }
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
    Object.assign(opts, eventsCamera());
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
    loadCommunityEvents(key);
    loadCatalogEvents(key);
    loadTeams(key);
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
    $('#map-view-label').textContent = enabled ? '3D' : '2D';
    control.setAttribute('aria-pressed', String(enabled));
    control.classList.toggle('active', enabled);
    if (!map) return;
    if (enabled && map.isStyleLoaded()) setup3DBuildings();
    for (const id of ['up-buildings', 'up-highlight']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', enabled ? 'visible' : 'none');
    }
    for (const id of ['up-highlight-flat', 'up-buildings-flat']) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', enabled ? 'none' : 'visible');
    }
    if (moveCamera) map.easeTo({ pitch: enabled ? 54 : 0, bearing: enabled ? -18 : 0, duration: reducedMotion.matches ? 0 : 420 });
    const selected = state.activeId ? byId(state.activeId) : null;
    if (selected) map.once('idle', () => { if (state.activeId === selected.id) highlightBuilding(selected); });
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
    const c = EVENT_GROUPS[e.group];
    const dist = distText(e);
    const status = eventStatus(e);
    return `
      <div class="ev-card${state.activeId === e.id ? ' active' : ''}${opts.interestMatch ? ' interest-match' : ''}" style="--c:${c.color}" data-id="${esc(e.id)}">
        <div class="ev-icon" aria-hidden="true">${eventIcon(e)}</div>
        <div class="ev-main">
          <div class="ev-title"><button type="button" class="ev-open">${esc(e.title)}</button></div>
          <div class="ev-meta">${esc(whenText(e))}</div>
          <div class="ev-meta">📍 ${esc(e.venueName)}${dist ? ` · <b>${dist}</b>` : ''}</div>
          <div class="ev-badges">
            ${e.eventStatus === 'cancelled' ? '<span class="badge today">Anulat</span>' : e.eventStatus === 'postponed' ? '<span class="badge today">Amânat</span>' : status ? `<span class="badge today">${status}</span>` : ''}
            <span class="badge ${e.soldOut ? 'today' : isFree(e) ? 'free' : ''}">${priceText(e)}</span>
            ${opts.interestMatch ? '<span class="badge interest-badge">Din interesele tale</span>' : ''}
            ${opts.showCat ? `<span class="badge cat">${c.label}</span>` : ''}
            ${opts.showCity && e.city !== state.city ? `<span class="badge">${esc(CITIES[e.city]?.name || '')}</span>` : ''}
            ${e.userCreated || e.mine ? '<span class="badge mine">Creat de tine</span>' : e.community ? '<span class="badge community">De la un student</span>' : ''}
            ${goingCount(e.id) ? `<span class="badge people">👥 ${goingCount(e.id)}</span>` : ''}
          </div>
        </div>
        <button type="button" class="heart${saved.has(e.id) ? ' on' : ''}" data-heart="${esc(e.id)}" aria-label="${saved.has(e.id) ? 'Scoate din salvate' : 'Salvează'}: ${esc(e.title)}" aria-pressed="${saved.has(e.id)}">❤️</button>
      </div>`;
  }

  function renderChips(list) {
    const counts = {};
    list.forEach((e) => { counts[e.group] = (counts[e.group] || 0) + 1; });
    $('#category-chips').innerHTML = Object.entries(EVENT_GROUPS).map(([k, c]) => `
      <button type="button" class="chip${state.cats.has(k) ? ' active' : ''}${counts[k] ? '' : ' empty'}" data-cat="${k}" aria-pressed="${state.cats.has(k)}" style="--c:${c.color}">
        <span class="dot" aria-hidden="true">${c.icon}</span>${c.label} <span class="n">${counts[k] || 0}</span>
      </button>`).join('');
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
    const filterCount = Number(state.when !== 'all') + Number(state.free) + Number(state.origin !== 'all') + state.cats.size;
    for (const button of $$('#origin-row [data-origin]')) {
      const selected = button.dataset.origin === state.origin;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    $('#all-events-count').textContent = cityCount;
    $('#show-all-events').setAttribute('aria-pressed', String(!scopeOn && !filterCount && !state.query.trim()));
    $('#show-personal-events').setAttribute('aria-pressed', String(scopeOn));
    $('#filter-count').textContent = filterCount ? `(${filterCount})` : '';

    const personal = recommend();
    const recs = personal.length || scopeOn ? personal : list.slice(0, 3).map(e => ({ e, why: [] }));
    const showRecs = recs.length && !filterCount && !state.query.trim();
    $('#for-you').classList.toggle('hidden', !showRecs);
    if (showRecs) {
      $('#for-you-list').innerHTML = recs.map(({ e, why }) => {
        const c = EVENT_GROUPS[e.group];
        return `<button class="fy-card" style="--c:${c.color}" data-id="${esc(e.id)}">
          <div class="fy-top"><span>${eventIcon(e)} ${c.label}</span><span>${dayLabel(e.startDate)}</span></div>
          <div class="fy-title">${esc(e.title)}</div>
          <div class="fy-why">${why.length ? 'Din interesele tale: ' + esc([...new Set(why)].slice(0, 3).join(', ')) : 'În agenda orașului'}</div>
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
    const highlightInterests = !scopeOn && hasPrefs();
    $('#event-list').innerHTML = list.length
      ? list.map((e) => evCard(e, { interestMatch: highlightInterests && matchesProfile(e) })).join('')
      : empty;
    renderMarkers(list);
  }

  function teamCard(t) {
    const ev = byId(t.eventId);
    const left = Math.max(0, t.spots - (t.joined || 0));
    const action = t.local ? '<span class="badge">Doar pe acest dispozitiv</span>'
      : t.mine ? `<button type="button" class="btn ghost small danger" data-team-delete="${esc(t.id)}">Șterge postarea</button>`
      : t.joinedByMe ? `<button type="button" class="btn ghost small" data-team-leave="${esc(t.id)}">✓ Ești în echipă · Ieși</button>`
      : `<button type="button" class="btn primary small" data-team-join="${esc(t.id)}" ${left === 0 ? 'disabled' : ''}>Intră în echipă</button>`;
    return `
      <div class="team-card">
        <div class="team-head">
          <div>
            <div class="team-author">${esc(t.author)}${t.faculty ? ` <span class="muted small">· ${esc(t.faculty)}</span>` : ''}</div>
            ${ev ? `<button class="team-event" data-id="${esc(ev.id)}">${eventIcon(ev)} ${esc(ev.title)}</button>` : ''}
          </div>
          ${!t.mine && !t.local ? `<button type="button" class="msg-act" data-team-report="${esc(t.id)}" aria-label="Raportează postarea lui ${esc(t.author)}" title="Raportează postarea">⚑</button>` : ''}
        </div>
        <div class="team-msg">${esc(t.message)}</div>
        ${t.have?.length ? `<div class="skill-row"><span class="lbl">Are:</span>${t.have.map((s) => `<span class="skill have">${esc(s)}</span>`).join('')}</div>` : ''}
        ${t.need?.length ? `<div class="skill-row"><span class="lbl">Caută:</span>${t.need.map((s) => `<span class="skill need">${esc(s)}</span>`).join('')}</div>` : ''}
        ${t.memberNames?.length ? `<div class="skill-row"><span class="lbl">În echipă:</span>${t.memberNames.map((n) => `<span class="skill">${esc(n)}</span>`).join('')}</div>` : ''}
        <div class="team-foot">
          <span class="spots">${left > 0 ? `${left} ${left === 1 ? 'loc liber' : 'locuri libere'}` : 'Echipă completă'}</span>
          ${action}
        </div>
      </div>`;
  }

  async function teamAction(button) {
    const [action, id] = button.dataset.teamJoin ? ['join', button.dataset.teamJoin]
      : button.dataset.teamLeave ? ['leave', button.dataset.teamLeave]
      : button.dataset.teamDelete ? ['delete', button.dataset.teamDelete] : ['report', button.dataset.teamReport];
    if (!social?.currentAccount()) { loginModal(() => teamAction(button), 'Intră în cont ca să intri în echipe.'); return; }
    if (action === 'delete' && !(await confirmModal({ title: 'Ștergi postarea?', text: 'Postarea dispare pentru toți, iar membrii echipei nu o mai văd. Nu se poate anula.', action: 'Șterge postarea', danger: true }))) return;
    if (action === 'report' && !(await confirmModal({ title: 'Raportezi postarea?', text: 'Raportează postările false, ofensatoare sau spam. După trei raportări, postarea se ascunde.', action: 'Raportează' }))) return;
    try {
      const result = await social.teamAction(id, action);
      toast({ join: 'Ai intrat în echipă. Autorul îți vede numele.', leave: 'Ai ieșit din echipă.', delete: 'Postarea a fost ștearsă.', report: result.hidden ? 'Mulțumim. Postarea a fost ascunsă.' : 'Mulțumim. Raportarea a fost trimisă.' }[action]);
      await loadTeams(state.city, true);
      if (state.activeId) openEvent(state.activeId, { fly: false });
    } catch (error) { toast(error.message); }
  }

  function renderTeams() {
    const teams = allTeams().filter((t) => t.city === state.city || byId(t.eventId)?.city === state.city);
    $('#team-list').innerHTML = teams.length ? teams.map(teamCard).join('')
      : '<div class="empty-state">Nicio echipă nu caută membri în acest oraș.</div>';
  }

  function renderSaved() {
    const list = allEvents.filter((e) => saved.has(e.id));
    $('#saved-list').innerHTML = list.length ? list.map((e) => evCard(e, { showCat: true, showCity: true })).join('')
      : '<div class="empty-state"><span class="big">❤️</span>Apasă pe inimă la un eveniment ca să-l salvezi aici.</div>';
    $('#saved-count').textContent = list.length;
    $('#saved-count').classList.toggle('hidden', !list.length);
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
  function avatar(name) {
    const text = String(name || '?');
    let hue = 0;
    for (const ch of text) hue = (hue * 31 + ch.codePointAt(0)) % 360;
    return `<span class="av" style="--h:${hue}" aria-hidden="true">${esc([...text.trim()][0]?.toUpperCase() || '?')}</span>`;
  }

  // Panoul „Particip” și lista participanților se redesenează separat, după răspunsul serverului.
  function renderParticipation(e) {
    const join = $('#d-join'), people = $('#d-people');
    if (!join || !people || state.activeId !== e.id) return;
    if (!canParticipate(e)) {
      join.innerHTML = '';
      people.innerHTML = e.userCreated
        ? '<p class="muted small">Ieșirea ta este salvată doar în acest browser. Trimite detaliile prietenilor direct.</p>'
        : '';
      people.classList.toggle('hidden', !e.userCreated);
      return;
    }
    const info = socialState.get(e.id);
    const me = social.currentAccount();
    const going = !!info?.joined;
    const n = goingCount(e.id);
    // Un eveniment anulat nu mai primește participanți noi; cei înscriși își păstrează locul în discuție.
    join.innerHTML = e.eventStatus === 'cancelled' && !going
      ? '<p class="muted small">Evenimentul a fost anulat de organizator și nu mai primește participanți noi.</p>'
      : `<button type="button" class="btn ${going ? 'going-btn' : 'primary'} block" data-rsvp="${esc(e.id)}" aria-pressed="${going}"${rsvpBusy ? ' disabled' : ''}>
      ${going ? '✓ Participi <span class="sub">· apasă ca să renunți</span>' : '<span aria-hidden="true">🙋</span> Particip'}</button>`;
    const names = info?.participants || [];
    people.innerHTML = `
      <div class="d-sec-head"><b><span aria-hidden="true">👥</span> ${n ? `${n} ${n === 1 ? 'participant' : 'participanți'}` : 'Fii primul care participă'}</b>
        ${going
          ? `<button type="button" class="btn ghost small" data-event-chat="${esc(e.id)}"><span aria-hidden="true">💬</span> Discuția participanților</button>`
          : n ? `<button type="button" class="btn ghost small locked" data-chat-locked="${esc(e.id)}" aria-disabled="true"><span aria-hidden="true">🔒</span> Discuția participanților</button>` : ''}
      </div>
      ${me && names.length ? `<div class="attendees">${names.slice(0, 8).map((p) => avatar(p.name)).join('')}${n > 8 ? `<span class="more">+${n - 8}</span>` : ''}
        <span class="att-names">${esc(names.slice(0, 3).map((p) => (p.me ? 'Tu' : p.name)).join(', '))}${n > 3 ? ' și alții' : ''}</span></div>` : ''}
      ${!me && n ? '<p class="muted small">Intră în cont ca să vezi cine mai participă.</p>' : ''}
      ${!going ? '<p class="muted small">Participanții pot discuta între ei într-un chat de grup. Apasă „Particip” ca să deblochezi discuția.</p>' : ''}`;
  }

  async function refreshEventSocial(id) {
    const e = byId(id);
    if (!e || !canParticipate(e)) return;
    try {
      const info = await social.event(id);
      socialState.set(id, info);
      participantCounts[id] = info.count;
    } catch { /* fără conexiune: rămâne starea cunoscută */ }
    if (state.activeId === id) renderParticipation(e);
  }

  async function toggleRsvp(id) {
    const e = byId(id);
    if (!e || !canParticipate(e) || rsvpBusy) return;
    if (!social.currentAccount()) {
      loginModal(() => toggleRsvp(id), 'Intră în cont ca să participi și să vorbești cu ceilalți participanți.');
      return;
    }
    const going = !!socialState.get(id)?.joined;
    rsvpBusy = true;
    renderParticipation(e);
    try {
      const info = going ? await social.leave(id) : await social.join(id);
      socialState.set(id, info);
      participantCounts[id] = info.count;
      toast(going ? 'Nu mai participi la acest eveniment.' : '🙋 Gata! Participi. Discuția participanților s-a deblocat.');
      renderExplore();
      renderSaved();
    } catch (error) {
      if (error.code === 'PLAYER_REQUIRED' || error.code === 'ACCOUNT_REQUIRED') { await social.load(); loginModal(() => toggleRsvp(id)); }
      else toast(error.message);
    } finally {
      rsvpBusy = false;
      if (state.activeId === id) renderParticipation(e);
    }
  }

  function openEvent(id, { fly = true } = {}) {
    stopChat();
    $('#detail').classList.remove('chat-mode');
    const e = byId(id);
    if (!e) return;
    if (e.city !== state.city) { state.city = e.city; updateCityPill(); renderAll(); goToCity(false); }
    const reopened = state.activeId === id && !$('#detail').classList.contains('hidden');
    const scroll = $('#detail').scrollTop;
    state.activeId = id;
    state.venueKey = null;
    const c = EVENT_GROUPS[e.group];
    const teams = allTeams().filter((t) => t.eventId === id);
    const left = e.spots ? Math.max(0, e.spots - goingCount(id)) : null;
    const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${e.lat},${e.lng}`;
    const eventUrl = externalEventLink(e.url);
    const canTeam = ['hackathon', 'concurs', 'sport', 'meetup', 'workshop'].includes(e.category);
    const dist = distText(e);
    const status = eventStatus(e);
    const isSaved = saved.has(id);
    $('#detail-body').innerHTML = `
      <div class="d-hero" style="--c:${c.color}">
        <div class="d-icon" aria-hidden="true">${eventIcon(e)}</div>
        <div class="d-cat">${c.label}${e.featured ? ' · ⭐ Recomandat' : ''}</div>
        <h2>${esc(e.title)}</h2>
        <div class="d-org">${e.community ? `Organizat de ${esc(e.mine ? 'tine' : e.organizer)} <span class="verified">De la un student</span>`
          : `${esc(e.organizer || 'Comunitatea UniPulse')}${e.imported ? ` <span class="verified">Preluat de pe ${esc(e.sourceName || 'site-ul organizatorului')}</span>` : e.source ? ' <span class="verified">Din agenda orașului</span>' : e.userCreated ? '' : ' <span class="verified">✓ Sursă oficială</span>'}`}</div>
      </div>
      <div class="d-body">
        <div class="d-facts">
          <div class="fact"><div class="fi" aria-hidden="true">📆</div><div class="fv"><b>${esc(whenText(e))}</b>${e.eventStatus === 'cancelled' ? '<span>Anulat de organizator</span>' : e.eventStatus === 'postponed' ? '<span>Amânat de organizator</span>' : status ? `<span>${status}</span>` : ''}</div></div>
          <div class="fact"><div class="fi" aria-hidden="true">📍</div><div class="fv"><b>${esc(e.venueName)}</b><span>${esc(e.address)}${e.approximateVenue ? ' · Pin orientativ' : ''}${dist ? ` · la ${dist} de tine` : ''}</span></div></div>
          <div class="fact"><div class="fi" aria-hidden="true">🎟️</div><div class="fv"><b>${priceText(e)}</b>${e.priceInfo ? `<span>${esc(e.priceInfo)}</span>` : ''}${left !== null ? `<span>${left} din ${e.spots} locuri libere</span>` : ''}</div></div>
        </div>
        <div class="d-primary">
          <div id="d-join"></div>
          ${eventUrl ? `<a class="btn outline block" href="${esc(eventUrl)}" target="_blank" rel="noopener"><span aria-hidden="true">🌐</span> ${e.imported ? 'Pagina oficială a evenimentului' : e.source ? 'Vezi anunțul' : e.userCreated || e.community ? 'Site-ul evenimentului' : 'Pagina oficială a evenimentului'} ↗</a>` : ''}
        </div>
        <div class="d-icons">
          <button type="button" data-heart="${esc(id)}" aria-pressed="${isSaved}"><span aria-hidden="true">${isSaved ? '❤️' : '🤍'}</span>${isSaved ? 'Salvat' : 'Salvează'}</button>
          <a href="${gmaps}" target="_blank" rel="noopener"><span aria-hidden="true">🧭</span>${e.approximateVenue ? 'Traseu orientativ' : 'Traseu'}</a>
          <button type="button" data-ics="${esc(id)}"><span aria-hidden="true">📅</span>Calendar</button>
          ${e.userCreated ? '' : `<button type="button" data-share="${esc(id)}"><span aria-hidden="true">🔗</span>Trimite</button>`}
        </div>
        <div class="d-section" id="d-people"></div>
        <p class="d-desc">${esc(e.description || '')}</p>
        ${e.imported ? `<p class="muted small">Preluat automat de pe ${esc(e.sourceName || 'site-ul organizatorului')}${e.lastChecked ? `, verificat ${esc(fmtDate.format(new Date(e.lastChecked)))}` : ''}. Detaliile complete, biletele și eventualele schimbări sunt pe pagina oficială a evenimentului.${e.eventStatus === 'cancelled' ? ' Evenimentul a fost anulat: discuția rămâne deschisă pentru cei înscriși.' : ' Butonul „Particip” te înscrie în grupul UniPulse, fără rezervare de bilet.'}</p>` : ''}
        ${e.source ? `<p class="muted small">Sursă din catalog: ${esc(e.source)}. Confirmă programul, locația și accesul la organizator. Butonul „Particip” te înscrie în grupul UniPulse, fără rezervare de bilet.</p>` : ''}
        ${e.tags?.length ? `<div class="d-tags">${e.tags.map((t) => `<span>#${esc(t)}</span>`).join('')}</div>` : ''}
        ${canTeam ? `
        <div class="d-section">
          <div class="d-sec-head"><b><span aria-hidden="true">🤝</span> Echipe pentru acest eveniment (${teams.length})</b></div>
          ${teams.map(teamCard).join('')}
          <button type="button" class="btn ghost block" data-newteam="${esc(id)}">＋ Creează echipă</button>
        </div>` : ''}
        ${e.community ? `
        <div class="d-section d-manage">
          <p class="muted small">Eveniment creat de un student. UniPulse nu a verificat informațiile.</p>
          ${e.mine
            ? `<button type="button" class="btn ghost small danger" data-delete-event="${esc(id)}"><span aria-hidden="true">🗑️</span> Șterge evenimentul</button>`
            : `<button type="button" class="btn ghost small" data-report-event="${esc(id)}"><span aria-hidden="true">⚑</span> Raportează evenimentul</button>`}
        </div>` : ''}
      </div>`;
    renderParticipation(e);
    refreshEventSocial(id);
    $('#detail').classList.remove('hidden');
    $('#detail').scrollTop = reopened ? scroll : 0;
    if (location.hash !== '#ev-' + id) history.replaceState(null, '', '#ev-' + id);
    $$('.ev-card').forEach((el) => el.classList.toggle('active', el.dataset.id === id));
    markActivePin();
    if (isMobile()) sheetTo('peek');
    if (fly) flyToEvent(e);
  }

  function openVenue(evs) {
    stopChat();
    $('#detail').classList.remove('chat-mode');
    const v = evs[0];
    const venue = VENUES[v.venue] || { name: v.venueName, address: v.address };
    state.activeId = null;
    state.venueKey = v.venueKey;
    $('#detail-body').innerHTML = `
      <div class="d-hero" style="--c:#0f172a">
        <div class="d-icon">🏛️</div>
        <div class="d-cat">${evs.length} evenimente în această locație</div>
        <h2>${esc(venue.name)}</h2>
        <div class="d-org">${esc(venue.address)}</div>
      </div>
      <div class="venue-list">${evs.map((e) => evCard(e, { showCat: true })).join('')}</div>`;
    $('#detail').classList.remove('hidden');
    $('#detail').scrollTop = 0;
    if (isMobile()) sheetTo('peek');
    flyToEvent(v);
  }

  function setupDetailHandle() {
    const detail = $('#detail');
    const handle = $('#detail-close');
    let drag = null;
    let suppressClick = false;
    handle.addEventListener('pointerdown', event => {
      suppressClick = false;
      if (!isMobile() || detail.classList.contains('chat-mode') || !event.isPrimary || event.button !== 0) return;
      drag = { id: event.pointerId, startY: event.clientY };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      const distance = event.clientY - drag.startY;
      if (Math.abs(distance) < 5 && !suppressClick) return;
      suppressClick = true;
      detail.style.setProperty('--detail-drag', Math.max(0, distance) + 'px');
      detail.classList.add('detail-dragging');
    });
    const finish = event => {
      if (drag?.id !== event.pointerId) return;
      const dismiss = event.type === 'pointerup' && (!suppressClick || event.clientY - drag.startY >= 40);
      drag = null;
      detail.classList.remove('detail-dragging');
      detail.style.removeProperty('--detail-drag');
      if (dismiss) closeDetail();
    };
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
    handle.addEventListener('lostpointercapture', finish);
    handle.addEventListener('click', event => {
      if (!suppressClick || event.detail === 0) closeDetail();
      suppressClick = false;
    });
  }

  function closeDetail() {
    stopChat();
    $('#detail').classList.remove('chat-mode');
    $('#detail').classList.add('hidden');
    state.activeId = null;
    state.venueKey = null;
    highlightBuilding(null);
    markActivePin();
    $$('.ev-card.active').forEach((el) => el.classList.remove('active'));
    if (location.hash.startsWith('#ev-')) history.replaceState(null, '', location.pathname + location.search);
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
      eventGroups: profile?.eventGroups, cats: [...(profile?.cats || [])], topics: [...(profile?.topics || [])], scope: profile?.scope || 'all',
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
    const preferredGroups = new Set(d.eventGroups ?? d.cats.map(type => TYPE_GROUPS[type]));
    openModal(`
      <div class="steps"><span class="on"></span><span class="on"></span></div>
      <h3>🎯 Ce te interesează?</h3>
      <p>Alege tipurile de evenimente și domeniile tale. Pe hartă îți arătăm mai întâi ce se potrivește.</p>
      <div class="field"><label for="pf-fac">Facultatea</label>
        <select id="pf-fac"><option value="">Alege…</option>${facs.map((f) => `<option ${d.faculty === f ? 'selected' : ''}>${esc(f)}</option>`).join('')}</select>
      </div>
      <div class="field" role="group" aria-labelledby="pf-cats-l"><span class="field-label" id="pf-cats-l">Tipuri de evenimente</span>
        <div class="select-chips" id="pf-cats">${Object.entries(EVENT_GROUPS).map(([k, c]) => `<button type="button" class="pill${preferredGroups.has(k) ? ' active' : ''}" data-v="${k}" aria-pressed="${preferredGroups.has(k)}" style="--c:${c.color}">${c.icon} ${c.label}</button>`).join('')}</div>
      </div>
      <div class="field" role="group" aria-labelledby="pf-topics-l"><span class="field-label" id="pf-topics-l">Domenii</span>
        <span class="muted small">Selectează un tip de eveniment ca să activezi domeniile asociate.</span>
        <div class="select-chips" id="pf-topics">${Object.keys(TOPIC_TYPES).map((t) => `<button type="button" class="pill${d.topics.includes(t) ? ' active' : ''}" data-v="${esc(t)}" aria-pressed="${d.topics.includes(t)}">${esc(t)}</button>`).join('')}</div>
      </div>
      <div class="field" role="group" aria-labelledby="pf-scope-l"><span class="field-label" id="pf-scope-l">Pe hartă vreau să văd</span>
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
    const selectedGroups = () => $$('#pf-cats .pill.active').map(b => b.dataset.v);
    const selectedCats = () => selectedGroups().flatMap(group => EVENT_GROUPS[group].types);
    const syncTopics = () => {
      const cats = selectedCats();
      for (const button of $$('#pf-topics .pill')) {
        button.disabled = !allowsTopic(button.dataset.v, cats);
        if (button.disabled) {
          button.classList.remove('active');
          button.setAttribute('aria-pressed', 'false');
        }
      }
    };
    $$('#pf-cats .pill, #pf-topics .pill').forEach(b => b.addEventListener('click', () => {
      b.setAttribute('aria-pressed', String(b.classList.toggle('active')));
      if (b.closest('#pf-cats')) syncTopics();
    }));
    syncTopics();
    $$('#pf-scope button').forEach((b) => b.addEventListener('click', () => {
      $$('#pf-scope button').forEach((x) => x.classList.toggle('active', x === b));
    }));
    const collect = () => {
      d.faculty = $('#pf-fac').value;
      d.eventGroups = selectedGroups();
      d.cats = selectedCats();
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

  // ---------- Cont: intrare, cont nou, parolă ----------
  const passwordField = (id, label, autocomplete, hint = '') => `
    <div class="field">
      <label for="${id}">${label}</label>
      <div class="pw-wrap">
        <input id="${id}" type="password" autocomplete="${autocomplete}" minlength="8" maxlength="128" required ${hint ? `aria-describedby="${id}-hint"` : ''}>
        <button type="button" class="pw-toggle" data-pw="${id}" aria-label="Arată parola" aria-pressed="false">👁</button>
      </div>
      ${hint ? `<span class="muted small" id="${id}-hint">${hint}</span>` : ''}
    </div>`;
  function bindPasswordToggles() {
    $$('[data-pw]').forEach((button) => button.addEventListener('click', () => {
      const input = $('#' + button.dataset.pw);
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(show));
      button.setAttribute('aria-label', show ? 'Ascunde parola' : 'Arată parola');
    }));
  }

  function loginModal(afterLogin, reason, mode) {
    if (!social) return;
    const device = social.deviceProfile();
    const guest = device && !device.hasPassword;
    const tab = mode || (guest ? 'register' : 'login');
    openModal(`
      <h3>${tab === 'login' ? 'Intră în cont' : guest ? 'Păstrează-ți profilul' : 'Cont nou'}</h3>
      <p>${esc(reason || 'Cu un cont poți participa, poți vorbi cu ceilalți și îți găsești datele pe orice dispozitiv.')}</p>
      <div class="seg auth-seg" role="tablist" aria-label="Alege">
        <button type="button" role="tab" data-auth="login" aria-selected="${tab === 'login'}" class="${tab === 'login' ? 'active' : ''}">Am cont</button>
        <button type="button" role="tab" data-auth="register" aria-selected="${tab === 'register'}" class="${tab === 'register' ? 'active' : ''}">Cont nou</button>
      </div>
      ${tab === 'login' ? `
      <form id="login-form" novalidate>
        <div class="field"><label for="lg-email">Email</label>
          <input id="lg-email" type="email" autocomplete="username" inputmode="email" maxlength="254" required placeholder="nume@student.upt.ro"></div>
        ${passwordField('lg-pass', 'Parolă', 'current-password')}
        ${guest ? '<p class="muted small">Profilul fără email de pe acest dispozitiv (scoruri, participări) rămâne în urmă când intri în alt cont.</p>' : ''}
        <p class="muted small">Ai uitat parola? Scrie-i administratorului din pagina <a href="/contact/" target="_blank" rel="noopener">Contact</a>; îți trimite o parolă temporară.</p>
        <button class="btn primary block" type="submit">Intră în cont</button>
      </form>` : `
      <form id="login-form" novalidate>
        <div class="field"><label for="lg-name">Numele afișat</label>
          <input id="lg-name" maxlength="24" autocomplete="nickname" required value="${esc(guest ? device.name : '')}" placeholder="Ex: Andrei P."></div>
        <div class="field"><label for="lg-email">Email</label>
          <input id="lg-email" type="email" autocomplete="username" inputmode="email" maxlength="254" required placeholder="nume@student.upt.ro"></div>
        ${passwordField('lg-pass', 'Parolă', 'new-password', 'Cel puțin 8 caractere.')}
        <p class="muted small">${guest ? 'Profilul de pe acest dispozitiv, cu scoruri și participări, devine contul tău. ' : ''}Ceilalți îți văd numele, nu și emailul.
          Continuând, accepți <a href="/termeni/" target="_blank" rel="noopener">termenii</a> și
          <a href="/confidentialitate/" target="_blank" rel="noopener">politica de confidențialitate</a>.</p>
        <button class="btn primary block" type="submit">Creează contul</button>
      </form>`}
      <p id="login-error" class="form-error" role="alert"></p>`);
    bindPasswordToggles();
    $$('[data-auth]').forEach((b) => b.addEventListener('click', () => loginModal(afterLogin, reason, b.dataset.auth)));
    setTimeout(() => (tab === 'login' ? $('#lg-email') : $('#lg-name'))?.focus(), 50);
    $('#login-form').onsubmit = async (event) => {
      event.preventDefault();
      const submit = event.currentTarget.querySelector('button[type="submit"]');
      const error = $('#login-error');
      const email = $('#lg-email').value.trim(), password = $('#lg-pass').value;
      const problem = tab === 'register' && !$('#lg-name').value.trim() ? ['#lg-name', 'Scrie numele afișat.']
        : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? ['#lg-email', 'Scrie o adresă de email validă.']
        : password.length < 8 ? ['#lg-pass', tab === 'register' ? 'Parola trebuie să aibă cel puțin 8 caractere.' : 'Scrie parola.']
        : null;
      if (problem) { error.textContent = problem[1]; $(problem[0]).focus(); return; }
      submit.disabled = true;
      error.textContent = '';
      try {
        const account = tab === 'login'
          ? await social.login({ email, password })
          : await social.register({ name: $('#lg-name').value, email, password });
        closeModal();
        toast(tab === 'login' ? `👋 Bine ai revenit, ${account.name}!` : `✅ Contul e gata, ${account.name}.`);
        await pullSync(true);
        if (account.mustChange) passwordModal(true, afterLogin);
        else afterLogin?.();
      } catch (err) {
        error.textContent = err.message;
        $('#lg-pass').value = '';
      } finally {
        submit.disabled = false;
      }
    };
  }

  function passwordModal(forced = false, after) {
    openModal(`
      <h3>${forced ? 'Alege o parolă nouă' : 'Schimbă parola'}</h3>
      <p>${forced ? 'Ai intrat cu o parolă temporară de la administrator. Alege acum una a ta.' : 'După schimbare, celelalte dispozitive ies din cont.'}</p>
      <form id="pw-form" novalidate>
        ${passwordField('pw-old', forced ? 'Parola temporară' : 'Parola actuală', 'current-password')}
        ${passwordField('pw-new', 'Parola nouă', 'new-password', 'Cel puțin 8 caractere.')}
        <p id="pw-error" class="form-error" role="alert"></p>
        <div class="modal-actions">${forced ? '' : '<button type="button" class="btn ghost" data-close>Renunță</button>'}<button class="btn primary" type="submit">Salvează parola</button></div>
      </form>`);
    bindPasswordToggles();
    setTimeout(() => $('#pw-old')?.focus(), 50);
    $('#pw-form').onsubmit = async (event) => {
      event.preventDefault();
      const next = $('#pw-new').value;
      if (next.length < 8) { $('#pw-error').textContent = 'Parola nouă trebuie să aibă cel puțin 8 caractere.'; $('#pw-new').focus(); return; }
      try {
        await social.changePassword($('#pw-old').value, next);
        closeModal();
        toast('Parola a fost schimbată.');
        after?.();
      } catch (error) { $('#pw-error').textContent = error.message; }
    };
  }

  function accountMenu() {
    const me = social?.currentAccount();
    if (!me) return;
    const calendarDate = new Intl.DateTimeFormat('ro-RO', {
      timeZone: calendarZone, day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(EVENT_CALENDAR_CHECKED + 'T12:00:00Z'));
    openModal(`
      <div class="account-head">${avatar(me.name)}<div><h3>${esc(me.name)}</h3>
        <p class="muted small">${esc(me.email)}</p></div></div>
      <p class="muted small">Datele contului (interese, evenimente salvate, orarul, echipele) sunt păstrate în Cloudflare și apar pe orice dispozitiv pe care intri.</p>
      <form id="rename-form">
        <div class="field">
          <label for="acc-name">Numele afișat</label>
          <input id="acc-name" maxlength="24" required value="${esc(me.name)}">
        </div>
        <div class="modal-actions"><button type="submit" class="btn primary">Salvează numele</button></div>
      </form>
      <p id="login-error" class="form-error" role="alert"></p>
      <div class="account-actions">
        <button type="button" class="btn ghost" id="account-preferences">Interesele mele</button>
        <button type="button" class="btn ghost" id="account-password">Schimbă parola</button>
        ${me.admin ? '<a class="btn ghost" href="/unipulse/admin/">Panou admin</a>' : ''}
        <button type="button" class="btn ghost danger" id="account-signout">Ieși din cont</button>
      </div>
      <p class="calendar-note">Selecția din surse oficiale a fost verificată la <time id="calendar-verified" datetime="${EVENT_CALENDAR_CHECKED}">${calendarDate}</time>.</p>`);
    $('#account-preferences').onclick = () => onboarding(2);
    $('#account-password').onclick = () => passwordModal(false);
    $('#account-signout').onclick = async () => {
      const ok = await confirmModal({ title: 'Ieși din cont?', text: 'Datele contului rămân salvate și le regăsești când intri din nou. De pe acest dispozitiv se șterg interesele, evenimentele salvate și orarul.', action: 'Ieși din cont' });
      if (!ok) return;
      try {
        await social.logout();
        clearSyncedData();
        location.reload();
      } catch (error) { toast(error.message); }
    };
    $('#rename-form').onsubmit = async (event) => {
      event.preventDefault();
      try {
        await social.rename($('#acc-name').value);
        closeModal();
        toast('Numele a fost schimbat');
      } catch (error) { $('#login-error').textContent = error.message; }
    };
  }

  // ---------- Sincronizare cu contul (Cloudflare) ----------
  // profile și saved sunt în store-ul aplicației; orar și parity în store-ul ghidului de campus.
  const SYNC_KEYS = ['profile', 'saved', 'orar', 'parity'];
  const CAMPUS_KEY = (key) => 'unipulse:campus:' + key;
  const syncTimers = {};
  let syncReady = false;
  function localValue(key) {
    if (key === 'profile') return store.get('profile', null);
    if (key === 'saved') return store.get('saved', []);
    try { const value = localStorage.getItem(CAMPUS_KEY(key)); return value ? JSON.parse(value) : null; } catch { return null; }
  }
  const isEmpty = (value) => value == null || (Array.isArray(value) && !value.length);
  function writeRaw(key, value) {
    const name = key === 'orar' || key === 'parity' ? CAMPUS_KEY(key) : 'unipulse:' + key;
    try { if (value == null) localStorage.removeItem(name); else localStorage.setItem(name, JSON.stringify(value)); } catch { /* fără stocare locală */ }
  }
  function applyValue(key, value) {
    writeRaw(key, value);
    if (key === 'profile') {
      profile = value && typeof value === 'object' ? value : null;
      if (profile?.scope) state.scope = profile.scope;
    }
    if (key === 'saved') saved = new Set(Array.isArray(value) ? value : []);
  }
  async function pullSync(afterLogin = false) {
    if (!social?.currentAccount()) return;
    let remote;
    try { remote = await social.getSync(); } catch { return; }
    let campusChanged = false;
    for (const key of SYNC_KEYS) {
      const local = localValue(key);
      if (remote[key] && !isEmpty(remote[key].value)) {
        applyValue(key, remote[key].value);
        if (key === 'orar' || key === 'parity') campusChanged = true;
      } else if (!isEmpty(local)) {
        // Contul nu are încă aceste date: le urcăm pe cele de pe dispozitiv.
        social.setSync(key, local).catch(() => {});
      }
    }
    syncReady = true;
    if (campusChanged) document.dispatchEvent(new CustomEvent('unipulse:sync'));
    renderAll();
    if (afterLogin && state.activeId) openEvent(state.activeId, { fly: false });
  }
  function schedulePush(key) {
    if (!syncReady || !SYNC_KEYS.includes(key) || !social?.currentAccount()) return;
    clearTimeout(syncTimers[key]);
    syncTimers[key] = setTimeout(() => social.setSync(key, localValue(key)).catch(() => toast('Nu am putut salva în cont. Verifică conexiunea.')), 800);
  }
  function clearSyncedData() {
    for (const key of SYNC_KEYS) writeRaw(key, null);
  }
  onStored = schedulePush;
  document.addEventListener('unipulse:stored', (event) => schedulePush(event.detail));

  function renderAccount() {
    const me = social?.currentAccount();
    $('#btn-login').classList.toggle('hidden', !!me);
    const account = $('#btn-account');
    account.classList.toggle('hidden', !me);
    if (me) {
      account.textContent = me.name.split(/\s+/).filter(Boolean).map((word) => [...word][0]).slice(0, 2).join('').toUpperCase() || '?';
      account.title = `Contul meu: ${me.name}`;
      account.setAttribute('aria-label', account.title);
    }
  }

  let roomsVersion = 0;
  async function renderSocial() {
    renderAccount();
    const box = $('#room-list');
    if (!social) { box.innerHTML = '<p class="muted small">Discuțiile nu sunt disponibile acum.</p>'; return; }
    const me = social.currentAccount();
    if (!me) {
      box.innerHTML = `<div class="empty-state"><span class="big" aria-hidden="true">💬</span>
        Intră în cont și apasă „Particip” la un eveniment ca să vorbești cu ceilalți participanți.<br>
        <button type="button" class="btn primary small" id="messages-login" style="margin-top:12px">Intră în cont</button></div>`;
      return;
    }
    if (state.tab !== 'messages') return;
    const version = ++roomsVersion;
    if (!box.children.length || box.querySelector('#messages-login')) box.innerHTML = '<p class="muted small">Se încarcă discuțiile…</p>';
    let rooms;
    try { rooms = (await social.rooms()).rooms || []; }
    catch (error) {
      if (version === roomsVersion) box.innerHTML = `<p class="muted small">${esc(error.message)}</p>`;
      return;
    }
    if (version !== roomsVersion) return;
    const known = rooms.filter((room) => byId(room.eventId));
    box.innerHTML = known.length ? known.map((room) => {
      const e = byId(room.eventId);
      const last = room.last;
      return `<button type="button" class="room-entry" data-room="${esc(e.id)}" style="--c:${EVENT_GROUPS[e.group].color}">
        <span class="room-icon" aria-hidden="true">${eventIcon(e)}</span>
        <span class="room-text"><b>${esc(e.title)}</b>
          <span>${last ? `${last.mine ? 'Tu' : esc(last.name)}: ${esc(last.body)}` : `${room.count} ${room.count === 1 ? 'participant' : 'participanți'} · niciun mesaj încă`}</span></span>
        ${last ? `<time>${dayLabel(new Date(last.time)) === 'Azi' ? fmtTime.format(new Date(last.time)) : dayLabel(new Date(last.time))}</time>` : ''}
      </button>`;
    }).join('') : `<div class="empty-state"><span class="big" aria-hidden="true">🙋</span>
      Apasă „Particip” la un eveniment. Discuția participanților apare aici.</div>`;
  }

  function stopChat() {
    clearTimeout(chatTimer);
    chatTimer = 0;
    activeRoom = null;
  }

  function drawMessages() {
    const list = $('#chat-msgs');
    if (!list) return;
    const nearBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
    let lastDay = '';
    list.innerHTML = chatMessages.length ? chatMessages.map((message) => {
      const when = new Date(message.time);
      const day = dayLabel(when);
      const divider = day !== lastDay ? `<div class="chat-day">${esc(day)}</div>` : '';
      lastDay = day;
      const action = message.mine
        ? `<button type="button" class="msg-act" data-msg-delete="${message.id}" aria-label="Șterge mesajul tău" title="Șterge mesajul">🗑️</button>`
        : `<button type="button" class="msg-act" data-msg-report="${message.id}" aria-label="Raportează mesajul lui ${esc(message.name)}" title="Raportează mesajul">⚑</button>`;
      return `${divider}<div class="msg${message.mine ? ' mine' : ''}">
        ${message.mine ? action : avatar(message.name)}
        <div class="bubble">${message.mine ? '' : `<span class="who">${esc(message.name)}</span>`}${esc(message.body)}<time>${fmtTime.format(when)}</time></div>
        ${message.mine ? '' : action}
      </div>`;
    }).join('') : '<div class="chat-empty"><span aria-hidden="true">👋</span><b>Niciun mesaj încă</b><span>Spune-le celorlalți participanți că vii.</span></div>';
    if (nearBottom || list.dataset.first !== 'done') { list.scrollTop = list.scrollHeight; list.dataset.first = 'done'; }
  }

  async function moderateMessage(button) {
    const id = activeRoom;
    const messageId = Number(button.dataset.msgDelete || button.dataset.msgReport);
    if (!id || !messageId) return;
    const removing = !!button.dataset.msgDelete;
    const ok = await confirmModal(removing
      ? { title: 'Ștergi mesajul?', text: 'Mesajul dispare pentru toți participanții. Nu se poate anula.', action: 'Șterge mesajul', danger: true }
      : { title: 'Raportezi mesajul?', text: 'Raportează mesajele ofensatoare, spam sau cu date personale. După trei raportări, mesajul se șterge automat.', action: 'Raportează' });
    if (!ok || activeRoom !== id) return;
    try {
      const result = removing ? await social.deleteMessage(id, messageId) : await social.reportMessage(id, messageId);
      if (result.removed) {
        chatMessages = chatMessages.filter((m) => m.id !== messageId);
        drawMessages();
      }
      toast(removing ? 'Mesajul a fost șters.' : result.removed ? 'Mulțumim. Mesajul a fost șters.' : 'Mulțumim. Raportarea a fost trimisă.');
    } catch (error) { toast(error.message); }
    $('#chat-input')?.focus();
  }

  let chatPolls = 0;
  async function pollChat(id) {
    if (activeRoom !== id) return;
    // La fiecare al șaselea apel cerem lista întreagă, ca mesajele șterse să dispară și la ceilalți.
    const full = ++chatPolls % 6 === 0;
    const after = full ? 0 : chatMessages.at(-1)?.id || 0;
    try {
      const { messages } = await social.messages(id, after);
      if (activeRoom !== id) return;
      if (full) {
        const changed = messages.length !== chatMessages.length || messages.some((m, i) => m.id !== chatMessages[i]?.id);
        if (changed) { chatMessages = messages; drawMessages(); }
        chatDelay = Math.min(12000, chatDelay + 1500);
        clearTimeout(chatTimer);
        chatTimer = setTimeout(() => pollChat(id), document.hidden ? 20000 : chatDelay);
        return;
      }
      chatDelay = messages.length ? 3000 : Math.min(12000, chatDelay + 1500);
      if (messages.length) {
        const seen = new Set(chatMessages.map((m) => m.id));
        chatMessages = [...chatMessages, ...messages.filter((m) => !seen.has(m.id))].slice(-300);
        drawMessages();
      }
      $('#chat-status')?.classList.add('hidden');
    } catch (error) {
      if (activeRoom !== id) return;
      if (['NOT_PARTICIPANT', 'PLAYER_REQUIRED', 'ACCOUNT_REQUIRED', 'EVENT_NOT_FOUND'].includes(error.code)) {
        socialState.delete(id);
        openEvent(id, { fly: false });
        toast(error.message);
        return;
      }
      const status = $('#chat-status');
      if (status) { status.textContent = error.message; status.classList.remove('hidden'); }
    }
    clearTimeout(chatTimer);
    chatTimer = setTimeout(() => pollChat(id), document.hidden ? 20000 : chatDelay);
  }

  async function openChat(id) {
    const e = byId(id);
    if (!e || !social) return;
    if (!social.currentAccount()) { loginModal(() => openChat(id)); return; }
    try {
      const info = await social.event(id);
      socialState.set(id, info);
      participantCounts[id] = info.count;
    } catch { /* fără conexiune: folosim starea cunoscută */ }
    if (!socialState.get(id)?.joined) { openEvent(id, { fly: false }); toast('Apasă „Particip” ca să deblochezi discuția.'); return; }
    stopChat();
    state.activeId = id;
    activeRoom = id;
    chatMessages = [];
    chatDelay = 3000;
    const detail = $('#detail');
    detail.classList.add('chat-mode');
    const n = goingCount(id);
    $('#detail-body').innerHTML = `
      <div class="chat-head" style="--c:${EVENT_GROUPS[e.group].color}">
        <button type="button" class="icon-btn" id="chat-back" aria-label="Înapoi la eveniment">←</button>
        <span class="chat-icon" aria-hidden="true">${eventIcon(e)}</span>
        <div><b>${esc(e.title)}</b><p class="small muted">Discuția participanților · ${n} ${n === 1 ? 'participant' : 'participanți'}</p></div>
      </div>
      <p id="chat-status" class="chat-status hidden" role="status"></p>
      <div id="chat-msgs" class="chat-messages" role="log" aria-live="polite"><p class="muted small">Se încarcă mesajele…</p></div>
      <form id="chat-form" class="chat-form">
        <input id="chat-input" aria-label="Mesaj" enterkeyhint="send" maxlength="500" autocomplete="off" placeholder="Scrie un mesaj…" required>
        <button type="submit" class="btn primary" aria-label="Trimite mesajul">➤</button>
      </form>`;
    detail.classList.remove('hidden');
    if (isMobile()) sheetTo('peek');
    $('#chat-back').onclick = () => openEvent(id, { fly: false });
    $('#chat-form').onsubmit = async (event) => {
      event.preventDefault();
      const input = $('#chat-input'), submit = event.currentTarget.querySelector('button');
      const text = input.value.trim();
      if (!text || submit.disabled) return;
      submit.disabled = true;
      try {
        const message = await social.send(id, text);
        if (input.value.trim() === text) input.value = '';
        if (activeRoom === id && !chatMessages.some((m) => m.id === message.id)) {
          chatMessages.push(message);
          chatDelay = 3000;
          clearTimeout(chatTimer);
          chatTimer = setTimeout(() => pollChat(id), chatDelay);
          const list = $('#chat-msgs');
          if (list) list.dataset.first = '';
          drawMessages();
        }
      } catch (error) {
        toast(error.code === 'NOT_PARTICIPANT' ? error.message : 'Mesajul nu a fost trimis. ' + error.message);
      } finally {
        submit.disabled = false;
        input.focus();
      }
    };
    if (!isMobile()) $('#chat-input').focus();
    pollChat(id);
  }

  function openEventChat(id) { openChat(id); }

  async function loadCounts() {
    if (!social) return;
    const ids = allEvents.filter((e) => !e.userCreated).map((e) => e.id);
    if (!ids.length) return;
    const batches = [];
    // API-ul returnează cel mult 60 de numărători per cerere.
    for (let offset = 0; offset < ids.length; offset += 60) batches.push(social.counts(ids.slice(offset, offset + 60)));
    const counts = await Promise.allSettled(batches);
    for (const result of counts) {
      if (result.status === 'fulfilled') Object.assign(participantCounts, result.value);
    }
    renderExplore();
    renderSaved();
  }

  function teamModal(eventId) {
    const options = cityEvents().filter((e) => ['hackathon', 'concurs', 'sport', 'meetup', 'workshop'].includes(e.category));
    if (!options.length) { toast('Nu există încă evenimente de echipă în acest oraș'); return; }
    if (!social?.currentAccount()) { loginModal(() => teamModal(eventId), 'Intră în cont ca să creezi o echipă. Postarea apare cu numele tău.'); return; }
    openModal(`
      <h3>Creează echipă</h3>
      <p>Spune ce știi să faci și pe cine cauți. Postarea o văd toți utilizatorii din ${esc(city().name)}, iar cine intră în echipă îți apare în listă.</p>
      <form id="team-form" novalidate>
        <div class="field"><label for="tf-ev">Pentru evenimentul</label>
          <select id="tf-ev" required>${options.map((e) => `<option value="${esc(e.id)}" ${e.id === eventId ? 'selected' : ''}>${eventIcon(e)} ${esc(e.title)}</option>`).join('')}</select>
        </div>
        <div class="field"><label for="tf-faculty">Facultatea și anul <span class="muted">(opțional)</span></label><input id="tf-faculty" maxlength="60" placeholder="Ex: UPT AC, anul 2" /></div>
        <div class="field-row">
          <div class="field"><label for="tf-have">Ce știi să faci</label><input id="tf-have" maxlength="200" placeholder="React, design, pitch" /></div>
          <div class="field"><label for="tf-need">Pe cine cauți</label><input id="tf-need" maxlength="200" placeholder="Backend, ML" /></div>
        </div>
        <div class="field"><label for="tf-spots">Câți oameni cauți</label><input id="tf-spots" type="number" inputmode="numeric" min="1" max="10" value="2" /></div>
        <div class="field"><label for="tf-msg">Mesaj</label><textarea id="tf-msg" rows="3" maxlength="500" required placeholder="Ideea, ce vrei să construiești, cum ne auzim…"></textarea></div>
        <p id="tf-error" class="form-error" role="alert"></p>
        <div class="modal-actions"><button type="button" class="btn ghost" data-close>Renunță</button><button class="btn primary" type="submit">Publică postarea</button></div>
      </form>`);
    $('#team-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const submit = ev.currentTarget.querySelector('button[type="submit"]');
      const event = byId($('#tf-ev').value);
      const message = $('#tf-msg').value.trim();
      if (message.length < 10) { $('#tf-error').textContent = 'Descrie echipa în cel puțin 10 caractere.'; $('#tf-msg').focus(); return; }
      submit.disabled = true;
      try {
        await social.createTeam({
          eventId: event.id, city: event.city, message, faculty: $('#tf-faculty').value.trim(),
          have: $('#tf-have').value, need: $('#tf-need').value, spots: Math.min(10, Math.max(1, Number($('#tf-spots').value) || 1)),
        });
        closeModal();
        await loadTeams(state.city, true);
        switchTab('teams');
        toast('✅ Postarea e publicată. Toți o văd acum.');
      } catch (error) {
        $('#tf-error').textContent = error.message;
      } finally { submit.disabled = false; }
    });
  }

  async function loadTeams(cityKey = state.city, force = false) {
    if (!social || (!force && serverTeams.has(cityKey))) return;
    try {
      serverTeams.set(cityKey, await social.listTeams(cityKey));
      renderTeams();
      if (state.activeId && !activeRoom) {
        const e = byId(state.activeId);
        if (e && ['hackathon', 'concurs', 'sport', 'meetup', 'workshop'].includes(e.category)) openEvent(e.id, { fly: false });
      }
    } catch { /* postările rămân cele cunoscute */ }
  }

  // ---------- Evenimentele importate din surse oficiale ----------
  let catalogLoading = null;
  async function loadCatalogEvents(city = state.city) {
    if (!social?.listCatalog) return;
    if (catalogLoading?.city === city) return catalogLoading.promise;
    const promise = (async () => {
      try {
        const list = await social.listCatalog(city);
        if (!Array.isArray(list)) return;
        catalogEvents.set(city, list);
        rebuildEvents();
        if (state.activeId && !byId(state.activeId)) closeDetail();
        renderAll();
      } catch { /* selecția statică rămâne afișată */ }
    })();
    catalogLoading = { city, promise };
    try { await promise; } finally { if (catalogLoading?.promise === promise) catalogLoading = null; }
  }

  // ---------- Evenimentele comunității ----------
  let communityLoading = null;
  async function loadCommunityEvents(city = state.city) {
    if (!social) return;
    if (communityLoading?.city === city) return communityLoading.promise;
    const promise = (async () => {
      try {
        const list = await social.listEvents(city);
        communityEvents.set(city, list);
        rebuildEvents();
        if (state.activeId && !byId(state.activeId)) closeDetail();
        renderAll();
      } catch { /* evenimentele oficiale rămân afișate */ }
    })();
    communityLoading = { city, promise };
    try { await promise; } finally { if (communityLoading?.promise === promise) communityLoading = null; }
  }

  const localInput = (date) => new Date(date - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  let pendingMeetup = null;
  function meetupModal(draft = {}) {
    const cityVenues = Object.entries(VENUES).filter(([, v]) => (v.city || 'timisoara') === state.city);
    const d = { title: '', category: 'social', when: '', until: '', venue: cityVenues[0]?.[0], spots: '', price: '', description: '', url: '', address: '', ...draft };
    const defaultWhen = (() => { const t = new Date(Date.now() + DAY); t.setHours(19, 0, 0, 0); return localInput(t); })();
    const options = Object.entries(EVENT_GROUPS).map(([key, { icon, label }]) =>
      `<option value="${key}" ${TYPE_GROUPS[d.category] === key ? 'selected' : ''}>${icon} ${label}</option>`
    ).join('');
    openModal(`
      <h3>Creează un eveniment</h3>
      <p>Toți utilizatorii UniPulse din ${esc(city().name)} îl văd pe hartă imediat după publicare. Cei care apasă „Particip” pot vorbi cu tine în discuția participanților.</p>
      <form id="mu-form" novalidate>
        <div class="field"><label for="mu-title">Titlu</label><input id="mu-title" required minlength="3" maxlength="80" value="${esc(d.title)}" placeholder="Ex: Bowling vineri seara, cine vine?" /></div>
        <div class="field-row">
          <div class="field"><label for="mu-cat">Tip</label><select id="mu-cat">${options}</select></div>
          <div class="field"><label for="mu-when">Începe</label><input id="mu-when" type="datetime-local" required value="${esc(d.when || defaultWhen)}" min="${localInput(new Date())}" /></div>
        </div>
        <div class="field-row">
          <div class="field"><label for="mu-until">Se termină <span class="muted">(opțional)</span></label><input id="mu-until" type="datetime-local" value="${esc(d.until)}" /></div>
          <div class="field"><label for="mu-price">Preț în lei <span class="muted">(0 = gratuit)</span></label><input id="mu-price" type="number" inputmode="numeric" min="0" max="10000" value="${esc(d.price)}" placeholder="Nespecificat" /></div>
        </div>
        <div class="field"><label for="mu-venue">Unde</label>
          <select id="mu-venue">
            ${d.lat ? '<option value="__pick" selected>📍 Locul ales pe hartă</option>' : ''}
            ${cityVenues.map(([k, v]) => `<option value="${k}" ${!d.lat && d.venue === k ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}
          </select>
          <button type="button" class="btn ghost small" id="mu-pick">📍 Alege pe hartă</button>
        </div>
        ${d.lat ? `<div class="field"><label for="mu-place">Numele locului</label><input id="mu-place" required maxlength="80" value="${esc(d.venueName || '')}" placeholder="Ex: Bowling Center, Cafeneaua X" /></div>
        <div class="field"><label for="mu-address">Adresă <span class="muted">(opțional)</span></label><input id="mu-address" maxlength="120" value="${esc(d.address || '')}" placeholder="Ex: Str. Alba Iulia 2" /></div>` : ''}
        <div class="field-row">
          <div class="field"><label for="mu-spots">Locuri <span class="muted">(opțional)</span></label><input id="mu-spots" type="number" inputmode="numeric" min="2" max="5000" value="${esc(d.spots)}" placeholder="Nelimitat" /></div>
          <div class="field"><label for="mu-url">Link <span class="muted">(opțional)</span></label><input id="mu-url" type="url" maxlength="300" value="${esc(d.url)}" placeholder="https://…" /></div>
        </div>
        <div class="field"><label for="mu-desc">Detalii <span class="muted">(opțional)</span></label><textarea id="mu-desc" rows="3" maxlength="1000" placeholder="Unde vă întâlniți, ce trebuie să aducă participanții…">${esc(d.description)}</textarea></div>
        <p class="muted small">Nu publica numere de telefon sau date personale. Evenimentele raportate de mai mulți utilizatori se ascund automat.</p>
        <p id="mu-error" class="form-error" role="alert"></p>
        <div class="modal-actions"><button type="button" class="btn ghost" data-close>Renunță</button><button class="btn primary" type="submit">Publică evenimentul</button></div>
      </form>`);
    const collect = () => ({
      title: $('#mu-title').value, category: $('#mu-cat').value, when: $('#mu-when').value, until: $('#mu-until').value,
      venue: $('#mu-venue').value === '__pick' ? null : $('#mu-venue').value,
      lat: $('#mu-venue').value === '__pick' ? d.lat : undefined, lng: $('#mu-venue').value === '__pick' ? d.lng : undefined,
      venueName: $('#mu-place')?.value, address: $('#mu-address')?.value, spots: $('#mu-spots').value, price: $('#mu-price').value,
      url: $('#mu-url').value, description: $('#mu-desc').value,
    });
    $('#mu-pick').onclick = () => { pendingMeetup = collect(); closeModal(); startPicking(); };
    $('#mu-form').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const v = collect();
      const error = $('#mu-error');
      const submit = ev.currentTarget.querySelector('button[type="submit"]');
      const start = new Date(v.when), end = v.until ? new Date(v.until) : null;
      const problem = v.title.trim().length < 3 ? ['#mu-title', 'Scrie un titlu de cel puțin 3 caractere.']
        : isNaN(start) || start < Date.now() - 3600000 ? ['#mu-when', 'Alege o dată și o oră din viitor.']
        : end && !(end > start) ? ['#mu-until', 'Sfârșitul trebuie să fie după început.']
        : v.lat && !(v.venueName || '').trim() ? ['#mu-place', 'Scrie numele locului ales pe hartă.']
        : v.url.trim() && !externalEventLink(v.url.trim()) ? ['#mu-url', 'Linkul trebuie să înceapă cu https://.']
        : null;
      if (problem) { error.textContent = problem[1]; $(problem[0])?.focus(); return; }
      if (!social) { error.textContent = 'Publicarea nu este disponibilă acum.'; return; }
      if (!social.currentAccount()) {
        // După autentificare, formularul revine completat și se publică singur.
        const resume = () => { meetupModal(v); $('#mu-form')?.requestSubmit(); };
        loginModal(resume, 'Intră în cont ca să publici evenimentul. Numele tău apare ca organizator.');
        return;
      }
      const venue = v.venue ? VENUES[v.venue] : null;
      const payload = {
        title: v.title.trim(), category: v.category, city: state.city,
        startISO: start.toISOString(), endISO: end ? end.toISOString() : undefined,
        lat: venue ? venue.lat : v.lat, lng: venue ? venue.lng : v.lng,
        venueName: venue ? venue.name : v.venueName.trim(), address: venue ? venue.address : (v.address || '').trim(),
        price: v.price === '' ? null : Number(v.price), spots: v.spots === '' ? null : Number(v.spots),
        url: v.url.trim(), description: v.description.trim(),
      };
      submit.disabled = true;
      error.textContent = '';
      try {
        const created = await social.createEvent(payload);
        communityEvents.set(state.city, [...(communityEvents.get(state.city) || []), created]);
        rebuildEvents();
        closeModal();
        renderAll();
        toast('✅ Evenimentul e publicat. Toți îl văd acum pe hartă.');
        openEvent(created.id);
      } catch (err) {
        if (err.code === 'PLAYER_REQUIRED' || err.code === 'ACCOUNT_REQUIRED') { await social.load(); loginModal(() => meetupModal(v)); return; }
        error.textContent = err.message;
      } finally {
        submit.disabled = false;
      }
    });
  }

  function confirmModal({ title, text, action, danger = false }) {
    return new Promise((resolve) => {
      openModal(`<h3>${esc(title)}</h3><p>${esc(text)}</p>
        <div class="modal-actions"><button type="button" class="btn ghost" id="cf-no">Renunță</button>
        <button type="button" class="btn ${danger ? 'danger-solid' : 'primary'}" id="cf-yes">${esc(action)}</button></div>`);
      $('#cf-yes').focus();
      $('#cf-no').onclick = () => { closeModal(); resolve(false); };
      $('#cf-yes').onclick = () => { closeModal(); resolve(true); };
    });
  }

  async function deleteCommunityEvent(id) {
    const e = byId(id);
    if (!e?.mine) return;
    const ok = await confirmModal({ title: `Ștergi „${e.title}”?`, text: 'Evenimentul dispare de pe hartă pentru toți, împreună cu discuția participanților. Nu se poate anula.', action: 'Șterge evenimentul', danger: true });
    if (!ok) return;
    try {
      await social.deleteEvent(id);
      communityEvents.set(e.city, (communityEvents.get(e.city) || []).filter((x) => x.id !== id));
      closeDetail();
      rebuildEvents();
      renderAll();
      toast('Evenimentul a fost șters.');
    } catch (error) { toast(error.message); }
  }

  async function reportCommunityEvent(id) {
    const e = byId(id);
    if (!e?.community) return;
    if (!social.currentAccount()) { loginModal(() => reportCommunityEvent(id), 'Intră în cont ca să raportezi evenimentul.'); return; }
    const ok = await confirmModal({ title: 'Raportezi evenimentul?', text: 'Raportează evenimentele false, ofensatoare sau spam. După trei raportări de la conturi diferite, evenimentul se ascunde pentru toți.', action: 'Raportează' });
    if (!ok) return;
    try {
      const result = await social.reportEvent(id);
      if (result.hidden) {
        communityEvents.set(e.city, (communityEvents.get(e.city) || []).filter((x) => x.id !== id));
        closeDetail();
        rebuildEvents();
        renderAll();
        toast('Mulțumim. Evenimentul a fost ascuns.');
      } else toast('Mulțumim. Raportarea a fost trimisă.');
    } catch (error) { toast(error.message); }
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
    if ($('#panel').classList.contains('hidden')) setPanelHidden(false);
    state.tab = tab;
    $$('.tab').forEach((button) => {
      const active = button.dataset.tab === tab;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    ['explore', 'teams', 'saved', 'campus', 'messages'].forEach((k) => $('#tab-' + k)?.classList.toggle('hidden', k !== tab));
    document.body.dataset.tab = tab;
    if (tab === 'messages') renderSocial();
    if (isMobile() && document.body.dataset.sheet === 'peek') sheetTo('half');
    document.dispatchEvent(new CustomEvent('unipulse:tab', { detail: tab }));
  }

  // ---------- Panou glisant pe mobil (bottom sheet) ----------
  const sheetLevels = ['peek', 'half', 'full'];
  function sheetSizes() {
    const viewport = window.visualViewport?.height || window.innerHeight;
    const full = Math.max(140, Math.round(viewport - 80));
    const inset = parseFloat(getComputedStyle($('#panel')).paddingBottom) || 0;
    return { peek: Math.min(full, 150 + inset), half: Math.min(full, Math.max(235, Math.round(viewport * .48))), full };
  }
  function setPanelHidden(hidden) {
    $('#panel').classList.toggle('hidden', hidden);
    $('#panel-open').classList.toggle('hidden', !hidden);
    sheetTo(hidden ? 'peek' : 'half');
    (hidden ? $('#panel-open') : $('#panel-close')).focus();
  }
  function sheetTo(level) {
    if (!isMobile()) return;
    const sizes = sheetSizes();
    const panel = $('#panel');
    panel.style.setProperty('--sheet-full', sizes.full + 'px');
    panel.style.setProperty('--sheet-visible', sizes[level] + 'px');
    panel.style.setProperty('--sheet-offset', sizes.full - sizes[level] + 'px');
    document.body.style.setProperty('--sheet-map-bottom', (panel.classList.contains('hidden') ? 0 : sizes[level]) + 'px');
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
      const { visible, sizes, startVisible } = pointer;
      pointer = null;
      panel.classList.remove('dragging');
      if (!moved) return;
      const nearest = sheetLevels.reduce((a, b) => Math.abs(sizes[a] - visible) <= Math.abs(sizes[b] - visible) ? a : b);
      const level = sheetLevels.indexOf(document.body.dataset.sheet);
      const distance = visible - startVisible;
      const step = Math.max(0, Math.min(2, level + Math.sign(distance)));
      sheetTo(event.type === 'pointercancel' ? sheetLevels[level] :
        nearest === sheetLevels[level] && Math.abs(distance) >= 30 ? sheetLevels[step] : nearest);
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
        const viewport = window.visualViewport;
        if (viewport) {
          document.body.style.setProperty('--chat-viewport', viewport.height + 'px');
          document.body.style.setProperty('--chat-keyboard', Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) + 'px');
        }
        sheetTo(document.body.dataset.sheet || 'peek');
      });
    };
    window.addEventListener('resize', onResize, { passive: true });
    window.visualViewport?.addEventListener('resize', onResize, { passive: true });
    window.visualViewport?.addEventListener('scroll', onResize, { passive: true });
    sheetTo('peek');
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
    // Propunem instalarea abia la a doua vizită, când utilizatorul a revenit singur.
    const visits = store.get('visits', 0) + 1;
    store.set('visits', visits);
    const show = () => { if (!standalone && !dismissed && isMobile() && visits >= 2) $('#install-banner').classList.remove('hidden'); };
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
      const team = t.closest('[data-team-join], [data-team-leave], [data-team-delete], [data-team-report]');
      if (team) { ev.stopPropagation(); teamAction(team); return; }
      const rsvp = t.closest('[data-rsvp]');
      if (rsvp) { toggleRsvp(rsvp.dataset.rsvp); return; }
      const removeEvent = t.closest('[data-delete-event]');
      if (removeEvent) { deleteCommunityEvent(removeEvent.dataset.deleteEvent); return; }
      const reportEvent = t.closest('[data-report-event]');
      if (reportEvent) { reportCommunityEvent(reportEvent.dataset.reportEvent); return; }
      const msgAction = t.closest('[data-msg-delete], [data-msg-report]');
      if (msgAction) { moderateMessage(msgAction); return; }
      const locked = t.closest('[data-chat-locked]');
      if (locked) {
        toast('Apasă „Particip” ca să deblochezi discuția participanților.');
        $('#d-join [data-rsvp]')?.focus();
        return;
      }
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

    $$('.tab').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.tab)));
    $('#mobile-search').addEventListener('click', () => {
      switchTab('explore');
      sheetTo('full');
      $('#tab-explore').scrollTop = 0;
      $('#q').focus();
    });

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
    $('#origin-row').addEventListener('click', (ev) => {
      const button = ev.target.closest('[data-origin]');
      if (!button) return;
      state.origin = button.dataset.origin;
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
      state.origin = 'all';
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

    setupDetailHandle();
    $('#modal-close').addEventListener('click', closeModal);
    $('#modal').addEventListener('click', (ev) => { if (ev.target.id === 'modal') closeModal(); });
    $('#edit-interests').addEventListener('click', () => onboarding(2));
    $('#btn-prefs').addEventListener('click', () => onboarding(2));
    $('#btn-city').addEventListener('click', cityModal);
    $('#btn-night').addEventListener('click', () => {
      store.set('theme', document.body.dataset.theme === 'night' ? 'day' : 'night');
      applyTheme();
    });
    systemDark.addEventListener?.('change', applyTheme);
    $('#btn-login').addEventListener('click', () => loginModal());
    $('#btn-organizer').addEventListener('click', () => { pendingMeetup = null; meetupModal(); });
    $('#btn-create-inline').addEventListener('click', () => { pendingMeetup = null; meetupModal(); });
    $('#btn-account').addEventListener('click', accountMenu);
    $('#room-list').addEventListener('click', event => {
      const room = event.target.closest('[data-room]');
      if (room) openChat(room.dataset.room);
      if (event.target.closest('#messages-login')) loginModal();
    });
    $('#detail-body').addEventListener('click', event => {
      const button = event.target.closest('[data-event-chat]');
      if (button) openEventChat(button.dataset.eventChat);
    });
    $('#panel-close').addEventListener('click', () => setPanelHidden(true));
    $('#panel-open').addEventListener('click', () => setPanelHidden(false));
    social?.onChange(() => {
      renderSocial();
      const open = state.activeId && !activeRoom ? byId(state.activeId) : null;
      if (open) refreshEventSocial(open.id);
    });
    $('#btn-new-team').addEventListener('click', () => teamModal());
    $('#pick-cancel').addEventListener('click', () => { stopPicking(); meetupModal(pendingMeetup); });

    const mapOptions = $('#btn-map-options');
    const mapTools = $('.map-tools');
    const optionsOpen = () => mapOptions.getAttribute('aria-expanded') === 'true';
    const setOptionsOpen = (open) => mapOptions.setAttribute('aria-expanded', String(open));
    mapOptions.addEventListener('click', () => setOptionsOpen(!optionsOpen()));
    document.addEventListener('pointerdown', (event) => {
      if (optionsOpen() && !mapTools.contains(event.target)) setOptionsOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && optionsOpen() && isMobile()) {
        setOptionsOpen(false);
        mapOptions.focus();
      }
    });

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

  // ---------- API pentru modulele separate (ghidul de campus) ----------
  window.UniPulse = {
    get map() { return map; },
    ensureCity(key) { if (state.city !== key) setCity(key); },
    switchTab, sheetTo, toast, closeDetail, openModal, closeModal,
  };

  // ---------- Pornire ----------
  bindUI();
  renderSocial();
  setupSheet();
  applyTheme();
  setupPWA();
  updateCityPill();
  renderAll();
  set3D(is3D, false);
  openFromHash();
  loadMap();
  social?.load().then((account) => Promise.all([loadCommunityEvents(), loadCatalogEvents(), loadCounts(), loadTeams(), pullSync()]).then(() => {
    // Linkurile #ev-c-… spre evenimente ale comunității se deschid după încărcare.
    if (!state.activeId) openFromHash();
    if (account?.hasPassword && account.mustChange) passwordModal(true);
  }));
  let eventClock = '';
  let countsAt = Date.now();
  function refreshCalendar() {
    if (document.hidden) { stopTour(); return; }
    if (Date.now() - countsAt > 120000) { countsAt = Date.now(); Promise.all([loadCommunityEvents(), loadCatalogEvents()]).then(loadCounts); loadTeams(state.city, true); }
    const next = [today(), ...allEvents.map(event => Number(isLive(event)) + ':' + Number(event.endDate >= Date.now()))].join('|');
    if (next === eventClock) return;
    eventClock = next;
    rebuildEvents();
    if (state.activeId && !byId(state.activeId)) closeDetail();
    renderAll();
  }
  document.addEventListener('visibilitychange', refreshCalendar);
  // Revenit în aplicație cu chatul deschis: mesajele se cer imediat, nu după pauza de fundal.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !activeRoom) return;
    clearTimeout(chatTimer);
    chatDelay = 3000;
    pollChat(activeRoom);
  });
  setInterval(refreshCalendar, 60000);
})();
