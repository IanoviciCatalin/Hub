// Date și ore în fusul Europe/Bucharest, fără biblioteci externe (Intl e disponibil în Workers și Node).
export const ZONE = 'Europe/Bucharest';

const partsFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});

function zoneParts(ms) {
  const out = {};
  for (const { type, value } of partsFormat.formatToParts(new Date(ms))) out[type] = value;
  return out;
}

// Diferența fusului față de UTC, în minute, la momentul dat (120 iarna, 180 vara).
export function zoneOffset(ms) {
  const p = zoneParts(ms);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

// Ora „de perete” din București → milisecunde UTC. Corect și în jurul schimbării orei.
export function localToUtc(year, month, day, hour = 0, minute = 0, second = 0) {
  const guess = Date.UTC(year, month - 1, day, hour, minute, second);
  let ms = guess - zoneOffset(guess) * 60000;
  ms = guess - zoneOffset(ms) * 60000;
  return ms;
}

// ISO cu offset local, ca în catalogul static: 2026-11-25T19:00:00+02:00.
export function toLocalISO(ms) {
  const p = zoneParts(ms);
  const offset = zoneOffset(ms);
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0'), mm = String(abs % 60).padStart(2, '0');
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${sign}${hh}:${mm}`;
}

// Valoare iCal: 20261125T170000Z (UTC), 20261125T190000 (+TZID sau oră locală), 20261125 (doar dată).
export function parseIcalDate(value, params = {}) {
  const text = String(value ?? '').trim();
  const m = text.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  if (h === undefined || params.VALUE === 'DATE') return { ms: localToUtc(+y, +mo, +d), dateOnly: true };
  if (z) return { ms: Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0)), dateOnly: false };
  const tz = params.TZID;
  if (tz && tz !== ZONE && !/bucharest/i.test(tz)) return null; // alt fus: nu ghicim
  return { ms: localToUtc(+y, +mo, +d, +h, +mi, +(s || 0)), dateOnly: false };
}

// Data ISO 8601 din JSON-LD sau REST: cu offset, cu Z, sau „locală” (interpretată în București).
export function parseIsoDate(value) {
  const text = String(value ?? '').trim();
  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return { ms: localToUtc(+m[1], +m[2], +m[3]), dateOnly: true };
  m = text.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/);
  if (!m) return null;
  if (m[7]) {
    const ms = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || '00'}${m[7].length === 5 ? m[7].slice(0, 3) + ':' + m[7].slice(3) : m[7]}`);
    return Number.isFinite(ms) ? { ms, dateOnly: false } : null;
  }
  return { ms: localToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] || 0)), dateOnly: false };
}

// Sfârșitul zilei locale (23:59:59) pentru evenimentele „doar dată”.
export function endOfLocalDay(ms) {
  const p = zoneParts(ms);
  return localToUtc(+p.year, +p.month, +p.day, 23, 59, 59);
}

// „durata spectacolului: 1h 5” / „2h 20” / „1h” / „90 min” → minute.
export function durationMinutes(text) {
  const value = String(text ?? '').toLowerCase();
  let m = value.match(/durat[aă][^:\n]{0,30}:\s*(\d{1,2})\s*h(?:\s*(\d{1,2}))?/);
  if (m) return Number(m[1]) * 60 + Number(m[2] || 0);
  m = value.match(/durat[aă][^:\n]{0,30}:\s*(\d{2,3})\s*min/);
  return m ? Number(m[1]) : null;
}
