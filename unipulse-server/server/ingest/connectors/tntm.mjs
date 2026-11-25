// Teatrul Național „Mihai Eminescu” Timișoara: calendarul iCal public al site-ului (plugin Events Manager).
// Verificat 25.11.2026: robots.txt „Allow: /”; feedul conține UID, URL, LOCATION și GEO pentru fiecare spectacol.
import { parseIcal } from '../ical.mjs';
import { parseIcalDate, durationMinutes } from '../time.mjs';
import { plainText, tidyTitle } from '../text.mjs';

const DATE_TAIL = /\s+-\s+\d{1,2}\s+\p{L}+\.?\s+\d{2,4}\s+\d{1,2}:\d{2}\s*$/u;

// „ABSURDINIA - Studio "UTU Strugari" - 25 nov. 26 19:00” → „Absurdinia”.
export function showTitle(summary, location) {
  let title = plainText(summary, 300).replace(DATE_TAIL, '');
  const room = plainText(location).split(',')[0];
  if (room && title.endsWith(' - ' + room)) title = title.slice(0, -(' - ' + room).length);
  return tidyTitle(title);
}

// „Studio "UTU Strugari", Mărășești 2, et.V, Timișoara, 300086, Romania” → sală + adresă.
export function splitLocation(location) {
  const parts = plainText(location).split(/\s*,\s*/).filter(Boolean);
  const room = parts.shift() || '';
  const address = parts.filter((p) => !/^(romania|românia|\d{6}|timi[sș]oara)$/i.test(p)).join(', ');
  return { room, address };
}

const AUDIENCE = { 'pt.copii': 'Copii', 'generală': 'Toate vârstele', 'generala': 'Toate vârstele' };

export const tntm = {
  id: 'tntm',
  name: 'Teatrul Național Timișoara',
  kind: 'ical',
  url: 'https://www.tntm.ro/?ical=1',
  allowedHosts: ['www.tntm.ro', 'tntm.ro'],
  city: 'timisoara',
  organizer: 'Teatrul Național „Mihai Eminescu” Timișoara',
  defaultCategory: 'cultura',
  minIntervalMinutes: 60,
  fullFeed: true, // feedul conține toate spectacolele viitoare: lipsa repetată e un semnal
  terms: 'robots.txt permite tot; fără termeni de utilizare publicați. Afișăm doar fapte și linkul oficial.',

  // Text iCal → evenimente brute. Nu inventează: câmpurile lipsă rămân null.
  parse(text) {
    return parseIcal(text).map((item) => {
      const value = (name) => item[name]?.value ?? '';
      const start = parseIcalDate(value('DTSTART'), item.DTSTART?.params);
      const end = parseIcalDate(value('DTEND'), item.DTEND?.params);
      const minutes = durationMinutes(value('DESCRIPTION'));
      const [lat, lng] = value('GEO').split(';').map(Number);
      const { room, address } = splitLocation(value('LOCATION'));
      const audience = plainText(value('CATEGORIES'));
      const summary = value('SUMMARY');
      const status = String(value('STATUS')).toUpperCase();
      const flags = summary.toUpperCase();
      return {
        externalId: plainText(value('UID'), 120),
        url: value('URL').trim(),
        title: showTitle(summary, value('LOCATION')),
        locationName: room ? `Teatrul Național – ${room.replace(/"([^"]+)"/, '„$1”')}` : 'Teatrul Național',
        address,
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,
        startAt: start?.ms ?? null,
        // Feedul repetă ora de început ca DTEND; durata reală vine din descriere când e anunțată.
        endAt: minutes ? start.ms + minutes * 60000 : end && start && end.ms > start.ms ? end.ms : null,
        endKnown: !!minutes || !!(end && start && end.ms > start.ms),
        dateOnly: !!start?.dateOnly,
        organizer: this.organizer,
        price: null,
        priceInfo: null,
        audience: AUDIENCE[audience.toLowerCase()] || (audience ? `Recomandat ${audience}` : null),
        tags: ['Teatru', ...(audience.toLowerCase() === 'pt.copii' ? ['Copii'] : [])],
        // Descriere proprie, scurtă: nu copiem textul teatrului.
        description: `Spectacol al Teatrului Național Timișoara${audience ? ` (${AUDIENCE[audience.toLowerCase()] || audience})` : ''}. Programul, biletele și regulamentul sunt pe pagina oficială.`,
        status: status === 'CANCELLED' || /\bANULAT/.test(flags) ? 'cancelled' : /\bAM[AÂ]NAT/.test(flags) ? 'postponed' : 'scheduled',
        attendance: 'offline',
      };
    });
  },
};
