// Bidirectional DE ↔ EN mapping for country names. Looking up either
// language returns the canonical { de, en } pair. Used at save time to
// keep the venues.country (DE) / country_en columns consistent regardless
// of which language the user had Nominatim respond in.

const PAIRS = [
  ['Deutschland',              'Germany',        'DE'],
  ['Italien',                  'Italy',          'IT'],
  ['Schweiz',                  'Switzerland',    'CH'],
  ['Frankreich',               'France',         'FR'],
  ['Österreich',               'Austria',        'AT'],
  ['Spanien',                  'Spain',          'ES'],
  ['Portugal',                 'Portugal',       'PT'],
  ['Niederlande',              'Netherlands',    'NL'],
  ['Belgien',                  'Belgium',        'BE'],
  ['Türkei',                   'Turkey',         'TR'],
  ['Vereinigtes Königreich',   'United Kingdom', 'GB'],
  ['Irland',                   'Ireland',        'IE'],
  ['Tschechien',               'Czechia',        'CZ'],
  ['Polen',                    'Poland',         'PL'],
  ['Griechenland',             'Greece',         'GR'],
  ['Schweden',                 'Sweden',         'SE'],
  ['Norwegen',                 'Norway',         'NO'],
  ['Dänemark',                 'Denmark',        'DK'],
  ['Vereinigte Staaten',       'United States',  'US'],
];

const BY_NAME = new Map();
for (const [de, en, iso] of PAIRS) {
  const pair = { de, en, iso };
  BY_NAME.set(de.toLowerCase(), pair);
  BY_NAME.set(en.toLowerCase(), pair);
}

// Aliases — alternative English spellings users / APIs sometimes return.
const ALIASES = {
  'usa':                       'United States',
  'united states of america':  'United States',
  'czech republic':            'Czechia',
};
for (const [alias, en] of Object.entries(ALIASES)) {
  const pair = BY_NAME.get(en.toLowerCase());
  if (pair) BY_NAME.set(alias.toLowerCase(), pair);
}

/**
 * Normalize any country input to a canonical { de, en, iso } triple.
 * iso is the ISO 3166-1 alpha-2 code; null when the country is unknown.
 * Falls back to the trimmed input as both DE and EN with iso = null.
 *
 * @param {string|null|undefined} input
 * @returns {{ de: string, en: string, iso: string|null } | null}
 */
export function normalizeCountry(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;
  const hit = BY_NAME.get(trimmed.toLowerCase());
  if (hit) return hit;
  return { de: trimmed, en: trimmed, iso: null };
}

/**
 * Convert an ISO 3166-1 alpha-2 code to the corresponding emoji flag
 * (regional-indicator letter pair). Returns an empty string for invalid
 * input.
 */
export function flagFromIso(iso) {
  if (!iso || iso.length !== 2) return '';
  const A = 0x1F1E6;
  const code = iso.toUpperCase();
  return String.fromCodePoint(
    A + code.charCodeAt(0) - 65,
    A + code.charCodeAt(1) - 65,
  );
}
