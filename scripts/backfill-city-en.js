#!/usr/bin/env node
/**
 * One-off: walk every venue with lat/lng and ensure city_en + country_en
 * are populated. Uses Nominatim reverse-geocoding with Accept-Language: en
 * — Nominatim returns the official English variant for both fields, so a
 * single call per venue is enough.
 *
 * Rate limit: Nominatim's usage policy is 1 request per second. We sleep
 * 1.1s between calls and identify the script via a User-Agent header.
 *
 * Run from the project root:
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   node scripts/backfill-city-en.js
 *
 * Idempotent — re-running only touches venues where city_en or
 * country_en is still null. Existing values are never overwritten.
 */

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_AGENT       = 'EspressoAtlas/1.0 backfill-city-en';
const REQUEST_DELAY_MS = 1100;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const sbHeaders = {
  apikey:        SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
};

async function fetchVenues() {
  const url = new URL(`${SUPABASE_URL}/rest/v1/venues`);
  url.searchParams.set('select', 'id,name,city,city_en,country,country_en,lat,lng');
  url.searchParams.set('or', '(city_en.is.null,country_en.is.null)');
  const res = await fetch(url, { headers: sbHeaders });
  if (!res.ok) throw new Error(`venues fetch ${res.status}: ${await res.text()}`);
  return res.json();
}

async function reverseEN(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
  const res = await fetch(url, {
    headers: { 'Accept-Language': 'en', 'User-Agent': USER_AGENT },
  });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  const data = await res.json();
  const addr = data.address || {};
  return {
    city:    addr.city || addr.town || addr.village || addr.municipality || '',
    country: addr.country || '',
  };
}

async function patch(id, fields) {
  const url = `${SUPABASE_URL}/rest/v1/venues?id=eq.${id}`;
  const res = await fetch(url, {
    method:  'PATCH',
    headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body:    JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(`patch ${res.status}: ${await res.text()}`);
}

async function main() {
  const venues = await fetchVenues();
  console.log(`Found ${venues.length} venues with city_en or country_en missing.\n`);

  let updated = 0, skipped = 0, failed = 0;

  for (const v of venues) {
    process.stdout.write(`[${v.name || v.id}] … `);

    const lat = parseFloat(v.lat);
    const lng = parseFloat(v.lng);
    if (!isFinite(lat) || !isFinite(lng)) {
      console.log('no coords — skipped');
      skipped++;
      continue;
    }

    try {
      const { city, country } = await reverseEN(lat, lng);
      const fields = {};
      if (!v.city_en    && city)    fields.city_en    = city;
      if (!v.country_en && country) fields.country_en = country;

      if (Object.keys(fields).length === 0) {
        console.log('nominatim returned no usable values — skipped');
        skipped++;
      } else {
        await patch(v.id, fields);
        const parts = [];
        if (fields.city_en)    parts.push(`city_en="${fields.city_en}"`);
        if (fields.country_en) parts.push(`country_en="${fields.country_en}"`);
        console.log(`✓  ${parts.join(', ')}`);
        updated++;
      }
    } catch (err) {
      console.log(`✕  ${err.message}`);
      failed++;
    }

    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }

  console.log(`\nDone — ${updated} updated, ${skipped} skipped, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error('\nFATAL:', err.message); process.exit(1); });
