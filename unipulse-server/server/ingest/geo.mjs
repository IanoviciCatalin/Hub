// Locații: coordonate din sursă → locații cunoscute → cache → geocodor autorizat (opțional).
// Coordonatele acceptate trebuie să cadă în zona orașului, ca pinul să apară pe hartă.
import { CITY_BOUNDS } from '../unipulse-events.mjs';
import { foldKey } from './text.mjs';

// Locații cunoscute (aceleași coordonate ca VENUES din public/unipulse/js). Cheile se potrivesc pe text.
export const KNOWN_VENUES = [
  { key: 'tntm-sala-mare', city: 'timisoara', name: 'Teatrul Național – Sala Mare', address: 'Str. Mărășești 2', lat: 45.756068, lng: 21.225809, match: ['sala mare marasesti 2', 'teatrul national sala mare'] },
  { key: 'tntm-studio', city: 'timisoara', name: 'Teatrul Național – Studio „Uțu Strugari”', address: 'Str. Mărășești 2, et. V', lat: 45.755069, lng: 21.225713, match: ['utu strugari'] },
  { key: 'opera', city: 'timisoara', name: 'Opera Națională Română Timișoara', address: 'Str. Mărășești 2', lat: 45.7548, lng: 21.2259, match: ['opera nationala romana timisoara'] },
];

export function inCity(city, lat, lng) {
  const bounds = CITY_BOUNDS[city];
  if (!bounds || !Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const [[west, south], [east, north]] = bounds;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

// Distanța în metri (haversine).
export function distanceM(a, b) {
  const R = 6371000, rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function knownVenue(city, ...texts) {
  const haystack = foldKey(texts.filter(Boolean).join(' '));
  if (!haystack) return null;
  return KNOWN_VENUES.find((v) => v.city === city && v.match.some((m) => haystack.includes(m))) || null;
}

// Rezolvă coordonatele unui eveniment. geocode(adresă, oraș) e opțional și întoarce { lat, lng } sau null.
export async function resolveLocation(raw, city, { geocode } = {}) {
  const venue = knownVenue(city, raw.locationName, raw.address);
  if (inCity(city, raw.lat, raw.lng)) {
    return { lat: round(raw.lat), lng: round(raw.lng), geoSource: 'source', venueKey: venue?.key || null };
  }
  if (venue) return { lat: venue.lat, lng: venue.lng, geoSource: 'venues', venueKey: venue.key };
  if (geocode && (raw.address || raw.locationName)) {
    const found = await geocode([raw.locationName, raw.address].filter(Boolean).join(', '), city);
    if (found && inCity(city, found.lat, found.lng)) return { lat: round(found.lat), lng: round(found.lng), geoSource: 'geocoder', venueKey: null };
  }
  return { lat: null, lng: null, geoSource: null, venueKey: null };
}
const round = (x) => Math.round(Number(x) * 1e6) / 1e6;

// Geocodor Nominatim (OpenStreetMap), folosit doar dacă GEOCODER_CONTACT e configurat.
// Politica Nominatim: cel mult 1 cerere pe secundă, User-Agent cu contact, rezultate păstrate în cache.
export function nominatimGeocoder({ fetchImpl = fetch, contact, cache, wait = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  let last = 0;
  return async (query, city) => {
    const key = foldKey(`${city} ${query}`);
    const hit = cache?.get(key);
    if (hit !== undefined) return hit;
    const gap = Date.now() - last;
    if (gap < 1100) await wait(1100 - gap);
    last = Date.now();
    const [[west, south], [east, north]] = CITY_BOUNDS[city];
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ro&bounded=1&viewbox=${west},${north},${east},${south}&q=${encodeURIComponent(query)}`;
    let result = null;
    try {
      const response = await fetchImpl(url, { headers: { 'User-Agent': `UniPulse event import (${contact})`, Accept: 'application/json' } });
      if (response.ok) {
        const [first] = await response.json();
        if (first) result = { lat: Number(first.lat), lng: Number(first.lon) };
      }
    } catch { /* fără rezultat: evenimentul merge la revizuire */ }
    cache?.set(key, result);
    return result;
  };
}
