#!/usr/bin/env node
/**
 * One-off: walk every venue with a comment and ensure both comment_de
 * and comment_en are filled with the right text in the right column.
 *
 * The translate function does language detection internally, so even
 * legacy rows where the migration parked an English comment in
 * comment_de get straightened out — the original text moves to its
 * correct column, the translation lands in the other.
 *
 * Run from the project root:
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   TRANSLATE_URL=https://<your-site>.netlify.app/.netlify/functions/translate \
 *   node scripts/backfill-translations.js
 *
 * Idempotent — rows where both columns are already populated and the
 * detected source matches the column it's in are skipped untouched.
 */

const SUPABASE_URL          = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TRANSLATE_URL         = process.env.TRANSLATE_URL
  || 'https://espresso-atlas.netlify.app/.netlify/functions/translate';
const REQUEST_DELAY_MS      = 400;

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
  url.searchParams.set('select', 'id,name,comment_de,comment_en');
  url.searchParams.set('or', '(comment_de.not.is.null,comment_en.not.is.null)');
  const res = await fetch(url, { headers: sbHeaders });
  if (!res.ok) {
    throw new Error(`venues fetch ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function detectAndTranslate(text) {
  const res = await fetch(TRANSLATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`translate ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.sourceLang !== 'de' && json.sourceLang !== 'en') {
    throw new Error('bad sourceLang: ' + JSON.stringify(json));
  }
  if (typeof json.translation !== 'string' || !json.translation.trim()) {
    throw new Error('empty translation');
  }
  return json;
}

async function patch(id, fields) {
  const url = `${SUPABASE_URL}/rest/v1/venues?id=eq.${id}`;
  const res = await fetch(url, {
    method:  'PATCH',
    headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body:    JSON.stringify(fields),
  });
  if (!res.ok) {
    throw new Error(`patch ${res.status}: ${await res.text()}`);
  }
}

function preview(text) {
  const t = (text || '').replace(/\s+/g, ' ');
  return t.length > 70 ? t.slice(0, 70) + '…' : t;
}

async function main() {
  const venues = await fetchVenues();
  console.log(`Found ${venues.length} venues with at least one comment.\n`);

  let updated = 0, skipped = 0, failed = 0;

  for (const v of venues) {
    // Decide which existing text to send for detection. Prefer comment_de
    // if both are populated; either way Claude will tell us what it is.
    const sourceText = v.comment_de || v.comment_en;
    if (!sourceText) { skipped++; continue; }

    process.stdout.write(`[${v.name}] … `);
    try {
      const { sourceLang, translation } = await detectAndTranslate(sourceText);
      const targetLang = sourceLang === 'de' ? 'en' : 'de';
      const originalCol    = `comment_${sourceLang}`;
      const translationCol = `comment_${targetLang}`;

      // Decide whether anything actually needs writing.
      const correctOriginal    = v[originalCol]    === sourceText;
      const correctTranslation = !!v[translationCol] && v[translationCol].trim() !== '';
      if (correctOriginal && correctTranslation) {
        console.log(`already complete (${sourceLang} → ${targetLang})`);
        skipped++;
        continue;
      }

      // Always patch both columns to canonical values. If the original
      // was sitting in the wrong column (legacy migration), this swap
      // fixes it.
      const fields = {
        [originalCol]:    sourceText,
        [translationCol]: translation,
      };
      await patch(v.id, fields);
      console.log(`✓  ${sourceLang} → ${targetLang}: ${preview(translation)}`);
      updated++;
    } catch (err) {
      console.log(`✕  ${err.message}`);
      failed++;
    }

    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }

  console.log(`\nDone — ${updated} updated, ${skipped} already complete, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error('\nFATAL:', err.message); process.exit(1); });
