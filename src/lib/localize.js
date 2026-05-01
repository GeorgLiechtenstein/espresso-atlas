// Pick the right-language city / country off a venue row, with a
// fallback to whatever's filled in on the other side. Existing data may
// only have `city` / `country` populated; new saves write both columns.

export function venueCity(venue, lang) {
  if (!venue) return '';
  if (lang === 'en') return venue.city_en || venue.city || '';
  return venue.city || venue.city_en || '';
}

export function venueCountry(venue, lang) {
  if (!venue) return '';
  if (lang === 'en') return venue.country_en || venue.country || '';
  return venue.country || venue.country_en || '';
}

// Same shape, but for raw string pairs (e.g. when picking the dropdown
// label for an aggregated city / country list).
export function pickLocalized(canonicalDe, valueEn, lang) {
  if (lang === 'en') return valueEn || canonicalDe || '';
  return canonicalDe || valueEn || '';
}
