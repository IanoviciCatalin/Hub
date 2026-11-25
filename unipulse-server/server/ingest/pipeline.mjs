// Pipeline-ul comun: descărcare → extragere → normalizare → geocodare → clasificare → validare.
// Potrivirea cu catalogul și scrierea se fac apoi atomic, în Durable Object (UniPulseCatalog.commit).
import { tntm } from './connectors/tntm.mjs';
import { fingerprint, officialUrl, shorten, slug } from './text.mjs';
import { endOfLocalDay, toLocalISO } from './time.mjs';
import { resolveLocation } from './geo.mjs';
import { classify, validateImported } from './classify.mjs';

// Sursele cunoscute. O sursă nouă = un conector nou aici; pipeline-ul rămâne același.
export const SOURCES = [tntm];
export const sourceById = (id) => SOURCES.find((s) => s.id === id) || null;

export class SourceError extends Error {
  constructor(code, detail = '', { temporary = true } = {}) {
    super(code);
    this.detail = String(detail).slice(0, 200);
    this.temporary = temporary;
  }
}

const LIMITS = { timeoutMs: 15000, maxBytes: 2 * 1024 * 1024, backoffMs: [2000, 8000, 32000], maxRetryAfterMs: 60000 };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readLimited(response, maxBytes) {
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel(); throw new SourceError('TOO_LARGE', `${total} bytes`, { temporary: false }); }
    chunks.push(value);
  }
  const all = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.length; }
  return new TextDecoder().decode(all);
}

// Descarcă feedul sursei: doar host-urile permise, timeout, limită de mărime și retry cu backoff exponențial
// pentru erori temporare (rețea, 429, 5xx). 401/403 opresc sursa: nu încercăm să ocolim blocări.
export async function fetchSource(source, { fetchImpl = fetch, wait = sleep, userAgent } = {}) {
  const url = new URL(source.url);
  if (!source.allowedHosts.includes(url.hostname)) throw new SourceError('HOST_NOT_ALLOWED', url.hostname, { temporary: false });
  let lastError = null;
  for (let attempt = 0; attempt <= LIMITS.backoffMs.length; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LIMITS.timeoutMs);
    try {
      const response = await fetchImpl(url.href, {
        signal: controller.signal, redirect: 'follow',
        headers: { 'User-Agent': userAgent || 'UniPulseEventImport/1.0', Accept: 'text/calendar, application/json;q=0.9, */*;q=0.5' },
      });
      const finalHost = new URL(response.url || url.href).hostname;
      if (!source.allowedHosts.includes(finalHost)) throw new SourceError('REDIRECT_NOT_ALLOWED', finalHost, { temporary: false });
      if (response.status === 401 || response.status === 403) throw new SourceError('BLOCKED', `HTTP ${response.status}`, { temporary: false });
      if (response.status === 429 || response.status >= 500) {
        const after = Number(response.headers.get('Retry-After')) * 1000;
        lastError = new SourceError('HTTP_' + response.status);
        if (attempt < LIMITS.backoffMs.length) await wait(Math.min(Number.isFinite(after) && after > 0 ? after : LIMITS.backoffMs[attempt], LIMITS.maxRetryAfterMs));
        continue;
      }
      if (!response.ok) throw new SourceError('HTTP_' + response.status, '', { temporary: false });
      return await readLimited(response, LIMITS.maxBytes);
    } catch (error) {
      if (error instanceof SourceError && !error.temporary) throw error;
      lastError = error instanceof SourceError ? error : new SourceError(error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK', error?.message);
      if (attempt < LIMITS.backoffMs.length) await wait(LIMITS.backoffMs[attempt]);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new SourceError('UNAVAILABLE');
}

// Eveniment brut → forma standard UniPulse (câmpurile lipsă rămân null) + problemele de validare.
export async function prepare(raw, source, { now = Date.now(), geocode } = {}) {
  const city = source.city;
  const place = await resolveLocation(raw, city, { geocode });
  const url = officialUrl(raw.url, source.allowedHosts);
  const { category, confidence } = classify(raw, source);
  const startAt = Number.isFinite(raw.startAt) ? raw.startAt : null;
  let endAt = Number.isFinite(raw.endAt) ? raw.endAt : null;
  // Fără oră de sfârșit anunțată: pentru filtre și arhivare folosim sfârșitul zilei (doar dată) sau +3 h.
  if (startAt !== null && endAt === null) endAt = raw.dateOnly ? endOfLocalDay(startAt) : startAt + 3 * 3600000;
  const event = {
    externalId: raw.externalId,
    sourceId: source.id,
    sourceName: source.name,
    url,
    title: raw.title,
    description: raw.description ? shorten(raw.description, 200) : null,
    category, categoryConfidence: confidence,
    tags: (raw.tags || []).slice(0, 6),
    city,
    startAt, endAt,
    endKnown: !!raw.endKnown || !!raw.dateOnly,
    dateOnly: !!raw.dateOnly,
    locationName: raw.locationName || null,
    address: raw.address || null,
    lat: place.lat, lng: place.lng, geoSource: place.geoSource, venueKey: place.venueKey,
    organizer: raw.organizer || null,
    price: Number.isFinite(raw.price) ? raw.price : null,
    priceInfo: raw.priceInfo || null,
    audience: raw.audience || null,
    imageUrl: null, // reutilizarea imaginilor cere permisiune: păstrăm doar linkul către pagina oficială
    status: ['scheduled', 'postponed', 'rescheduled', 'cancelled'].includes(raw.status) ? raw.status : 'scheduled',
    attendance: raw.attendance === 'online' ? 'online' : raw.attendance === 'mixed' ? 'mixed' : 'offline',
  };
  const problems = validateImported(event, source, now);
  // Evenimentele deja încheiate nu se importă (nu sunt erori, doar istorie).
  const past = Number.isFinite(endAt) && endAt < now;
  return { event, problems, past, hash: fingerprint({ ...event, tags: event.tags.join('|') }) };
}

// ID permanent în catalog: x-<sursă>-<id extern>. Respectă EVENT_ID din chat ([a-z0-9][a-z0-9-]{2,79}).
export const catalogId = (sourceId, externalId) => `x-${slug(sourceId, 12)}-${slug(externalId, 60)}`.slice(0, 80).replace(/-+$/, '');

// Forma afișată de frontend (aceeași ca obiectele din EVENTS, cu câmpuri în plus pentru import).
export function publicView(row) {
  return {
    id: row.event_id, title: row.title, category: row.category, city: row.city,
    venueName: row.location_name || undefined, address: row.address || '',
    lat: row.latitude, lng: row.longitude,
    organizer: row.organizer || undefined,
    startISO: toLocalISO(row.start_at),
    ...(row.end_known ? { endISO: toLocalISO(row.end_at) } : {}),
    ...(row.date_only ? { dateOnly: true } : row.end_known ? {} : { startOnly: true }),
    ...(row.price_min !== null && row.price_min !== undefined ? { price: row.price_min } : {}),
    ...(row.price_info ? { priceInfo: row.price_info } : {}),
    description: row.description_short || '',
    tags: JSON.parse(row.tags || '[]'),
    url: row.primary_url,
    imported: true, sourceName: row.source_name, eventStatus: row.event_status,
    lastChecked: row.last_checked,
  };
}
