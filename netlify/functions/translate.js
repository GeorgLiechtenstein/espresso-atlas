// Translate an espresso review comment.
//
// POST /.netlify/functions/translate
// body: { text: string }
// returns: { sourceLang: 'de'|'en', translation: string }
//
// One call to Anthropic does both detection and translation. The model
// returns strict JSON. We tolerate code fences / preamble defensively.

const SYSTEM_PROMPT = (
  'You translate espresso review comments between German and English. ' +
  "First identify the source language — must be exactly 'de' or 'en'. " +
  'Then translate to the other language. Keep the tone personal and ' +
  'opinionated. Preserve proper nouns (café names). ' +
  'Return ONLY a JSON object with this exact shape: ' +
  '{"sourceLang":"de"|"en","translation":"..."}. ' +
  'No code fences, no preamble, no commentary.'
);

function extractJson(text) {
  if (!text) return null;
  // Direct parse
  try { return JSON.parse(text); } catch {}
  // Strip ```json ... ``` fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }
  // First top-level { ... } block
  const m = text.match(/\{[\s\S]+\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch {}
  }
  return null;
}

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const text = (body.text || '').trim();
  if (!text) return { statusCode: 400, body: 'Missing text' };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: 'ANTHROPIC_API_KEY not configured' };
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { statusCode: 502, body: 'Anthropic ' + res.status + ': ' + errBody };
    }

    const data = await res.json();
    const raw = (data.content || []).map((p) => p.text || '').join('').trim();
    const parsed = extractJson(raw);

    if (!parsed
        || (parsed.sourceLang !== 'de' && parsed.sourceLang !== 'en')
        || typeof parsed.translation !== 'string'
        || !parsed.translation.trim()) {
      return { statusCode: 502, body: 'Invalid model response: ' + raw.slice(0, 200) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceLang:  parsed.sourceLang,
        translation: parsed.translation.trim(),
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: 'Internal: ' + (err && err.message ? err.message : String(err)) };
  }
}
