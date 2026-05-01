#!/usr/bin/env node
/**
 * One-off backfill: translate existing venue comments into the language
 * that's still null. Walks every row that has a comment in one language
 * but not the other, calls the deployed translate function, writes the
 * missing column back via the Supabase REST API.
 *
 * Run from the project root:
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   TRANSLATE_URL=https://<your-site>.netlify.app/.netlify/functions/translate \
 *   node scripts/backfill-translations.js
 *
 * - SERVICE_ROLE_KEY is needed because anon can only SELECT. Get it from
 *   Supabase Dashboard → Settings → API → service_role (Reveal).
 *   ⚠ Don't paste it anywhere; the value is in your shell's process env
 *   only. Run `unset SUPABASE_SERVICE_ROLE_KEY` after you're done.
 * - TRANSLATE_URL defaults to the production Netlify URL. If you want to
 *   test against a local `npm run dev:netlify` instance, pass
 *   http://localhost:8888/.netlify/functions/translate
 *
 * The script is idempotent — re-running skips rows that are already
 * complete in both languages.
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
  // Pull every row that has at least one of the two comment columns set.
  const url = new URL(`${SUPABASE_URL}/rest/v1/venues`);
  url.searchParams.set('select', 'id,name,comment_de,comment_en');
  url.searchParams.set('or', '(comment_de.not.is.null,comment_en.not.is.null)');
  const res = await fetch(url, { headers: sbHeaders });
  if (!res.ok) {
    throw new Error(`venues fetch ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function translate(text, targetLang) {
  const res = await fetch(TRANSLATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLang }),
  });
  if (!res.ok) {
    throw new Error(`translate ${res.status}: ${await res.text()}`);
  }
  const { translation } = await res.json();
  if (!translation) throw new Error('empty translation');
  return translation;
}

async function patch(id, field, value) {
  const url = `${SUPABASE_URL}/rest/v1/venues?id=eq.${id}`;
  const res = await fetch(url, {
    method:  'PATCH',
    headers: { ...sbHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body:    JSON.stringify({ [field]: value }),
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
    const needsEn = !!v.comment_de && !v.comment_en;
    const needsDe = !!v.comment_en && !v.comment_de;
    if (!needsEn && !needsDe) { skipped++; continue; }

    const sourceText = needsEn ? v.comment_de : v.comment_en;
    const targetLang = needsEn ? 'en' : 'de';
    const targetCol  = needsEn ? 'comment_en' : 'comment_de';

    process.stdout.write(`[${v.name}] → ${targetLang} … `);
    try {
      const translation = await translate(sourceText, targetLang);
      await patch(v.id, targetCol, translation);
      console.log(`✓  ${preview(translation)}`);
      updated++;
    } catch (err) {
      console.log(`✕  ${err.message}`);
      failed++;
    }

    // Brief pause between requests so we don't hammer the API or burn
    // through a Netlify function rate limit.
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }

  console.log(`\nDone — ${updated} updated, ${skipped} already complete, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => { console.error('\nFATAL:', err.message); process.exit(1); });
