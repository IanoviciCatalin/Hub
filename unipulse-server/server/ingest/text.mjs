// Curățarea textelor externe, chei de comparare și URL-uri normalizate.
// Funcții pure: rulează la fel în Worker și în testele Node.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…' };

// Text simplu dintr-un fragment HTML / WordPress: fără tag-uri, shortcode-uri ([DKB ...]),
// entități sau litere „decorative” Unicode (𝗔 → A), cu spațiile comprimate.
export function plainText(value, max = 2000) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[şŞţŢ]/g, (c) => ({ 'ş': 'ș', 'Ş': 'Ș', 'ţ': 'ț', 'Ţ': 'Ț' })[c])
    .replace(/\[\/?[a-z][^\]]*\]/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);?/gi, (match, code) => {
      if (code[0] === '#') {
        const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
        return Number.isFinite(n) && n > 31 && n < 0x110000 ? String.fromCodePoint(n) : ' ';
      }
      return ENTITIES[code.toLowerCase()] ?? match;
    })
    .replace(/[\p{Cc}\p{Cf}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

// Scurtează la ultima limită de cuvânt înainte de max.
export function shorten(text, max) {
  const value = plainText(text, max * 2);
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).replace(/[\s,;:.–-]+$/, '') + '…';
}

// Cheie pentru comparații: litere mici, fără diacritice și punctuație.
export function foldKey(value) {
  return plainText(value).toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

const SMALL_WORDS = new Set(['a', 'al', 'ale', 'cu', 'de', 'din', 'si', 'și', 'in', 'în', 'la', 'o', 'pe', 'pentru', 'sau', 'un', 'o', 'the', 'of', 'and']);
// Titlurile scrise numai cu majuscule („ANNA KARENINA”) devin „Anna Karenina”.
export function tidyTitle(value, max = 80) {
  const title = plainText(value, 300).replace(/\s+/g, ' ');
  const letters = title.replace(/[^\p{L}]/gu, '');
  const shouting = letters.length > 3 && letters === letters.toUpperCase();
  const words = shouting
    ? title.toLowerCase().split(' ').map((word, i) => (i > 0 && SMALL_WORDS.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    : title.split(' ');
  return words.join(' ').slice(0, max).trim();
}

const TRACKING = /^(utm_|fbclid$|gclid$|mc_|ref$|_ga$)/i;
// URL comparabil: https, host fără „www.”, fără parametri de urmărire, ancoră sau slash final.
export function normalizeUrl(value) {
  try {
    const url = new URL(String(value ?? '').trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    url.protocol = 'https:';
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (TRACKING.test(key)) url.searchParams.delete(key);
    url.searchParams.sort();
    const path = url.pathname.replace(/\/+$/, '');
    return `https://${url.host}${path}${url.search}`;
  } catch {
    return '';
  }
}

// Linkul oficial păstrat: https, pe unul dintre host-urile permise ale sursei.
export function officialUrl(value, allowedHosts) {
  try {
    const url = new URL(String(value ?? '').trim());
    if (url.protocol !== 'https:') return '';
    if (allowedHosts && !allowedHosts.includes(url.hostname.toLowerCase())) return '';
    return url.href.slice(0, 300);
  } catch {
    return '';
  }
}

// Identificator sigur pentru ID-uri UniPulse: [a-z0-9-].
export function slug(value, max = 40) {
  return foldKey(value).replace(/\s+/g, '-').slice(0, max).replace(/-+$/, '') || 'x';
}

// Similaritate Dice pe trigrame (0..1), după eliminarea cuvintelor comune din anunțuri.
const NOISE = new Set(['bilete', 'bilet', 'concert', 'spectacol', 'eveniment', 'editia', 'live', 'timisoara', 'tm', 'la', 'de', 'si', 'in', 'cu', 'the']);
export function titleKey(value) {
  return foldKey(value).split(' ').filter((w) => w && !NOISE.has(w) && !/^(19|20)\d\d$/.test(w)).join(' ');
}
function trigrams(text) {
  const padded = `  ${text} `;
  const grams = new Map();
  for (let i = 0; i < padded.length - 2; i += 1) {
    const g = padded.slice(i, i + 3);
    grams.set(g, (grams.get(g) || 0) + 1);
  }
  return grams;
}
export function textSimilarity(a, b) {
  const x = titleKey(a), y = titleKey(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const ga = trigrams(x), gb = trigrams(y);
  let common = 0, total = 0;
  for (const [g, n] of ga) { common += Math.min(n, gb.get(g) || 0); total += n; }
  for (const n of gb.values()) total += n;
  return total ? (2 * common) / total : 0;
}

// Amprentă stabilă a unui obiect (pentru „neschimbat de la ultima rulare”). FNV-1a pe 32 de biți, hex.
export function fingerprint(value) {
  const text = JSON.stringify(value, Object.keys(value).sort());
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
