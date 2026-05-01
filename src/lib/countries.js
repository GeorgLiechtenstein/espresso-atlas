// Bidirectional DE ↔ EN mapping for country names. Looking up either
// language returns the canonical { de, en } pair. Used at save time to
// keep the venues.country (DE) / country_en columns consistent regardless
// of which language the user had Nominatim respond in.

const PAIRS = [
  ['Deutschland',              'Germany'],
  ['Italien',                  'Italy'],
  ['Schweiz',                  'Switzerland'],
  ['Frankreich',               'France'],
  ['Österreich',               'Austria'],
  ['Spanien',                  'Spain'],
  ['Portugal',                 'Portugal'],
  ['Niederlande',              'Netherlands'],
  ['Belgien',                  'Belgium'],
  ['Türkei',                   'Turkey'],
  ['Vereinigtes Königreich',   'United Kingdom'],
  ['Irland',                   'Ireland'],
  ['Tschechien',               'Czechia'],
  ['Polen',                    'Poland'],
  ['Griechenland',             'Greece'],
  ['Schweden',                 'Sweden'],
  ['Norwegen',                 'Norway'],
  ['Dänemark',                 'Denmark'],
  ['Vereinigte Staaten',       'United States'],
];

const BY_NAME = new Map();
for (const [de, en] of PAIRS) {
  const pair = { de, en };
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
 * Normalize any country input to a canonical { de, en } pair.
 * Falls back to the trimmed input as both DE and EN if unknown.
 *
 * @param {string|null|undefined} input
 * @returns {{ de: string, en: string } | null}
 */
export function normalizeCountry(input) {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;
  const hit = BY_NAME.get(trimmed.toLowerCase());
  if (hit) return hit;
  return { de: trimmed, en: trimmed };
}
