// Parser iCalendar (RFC 5545) minimal: VEVENT-uri cu proprietăți și parametri.
// Nu execută nimic din fișier; tot ce iese de aici e text care trece apoi prin validare.

const unescapeText = (value) => value.replace(/\\([\\;,nN])/g, (_, c) => (c === 'n' || c === 'N' ? '\n' : c));

// Rândurile „pliate” (care încep cu spațiu sau tab) se lipesc de rândul anterior.
export function unfold(text) {
  return String(text ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

// Împarte „NAME;P1=a;P2="b:c":valoare” respectând ghilimelele din parametri.
function splitLine(line) {
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') quoted = !quoted;
    else if (c === ':' && !quoted) {
      const head = line.slice(0, i), value = line.slice(i + 1);
      const [name, ...rawParams] = head.split(';');
      const params = {};
      for (const p of rawParams) {
        const eq = p.indexOf('=');
        if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
      }
      return { name: name.toUpperCase(), params, value };
    }
  }
  return null;
}

// → [{ UID: {value, params}, SUMMARY: {...}, ... }]. Proprietățile repetate rămân prima apariție.
export function parseIcal(text, { maxEvents = 2000 } = {}) {
  const events = [];
  let current = null;
  for (const line of unfold(text)) {
    if (!line) continue;
    if (line === 'BEGIN:VEVENT') { current = {}; continue; }
    if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
      if (events.length >= maxEvents) break;
      continue;
    }
    if (!current) continue;
    const prop = splitLine(line);
    if (!prop || current[prop.name]) continue;
    const textual = !['DTSTART', 'DTEND', 'DTSTAMP', 'LAST-MODIFIED', 'GEO', 'URL', 'ATTACH'].includes(prop.name);
    current[prop.name] = { value: textual ? unescapeText(prop.value) : prop.value, params: prop.params };
  }
  return events;
}
