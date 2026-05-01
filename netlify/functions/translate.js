// Server-side proxy for Anthropic translations. The API key lives in
// Netlify's env (ANTHROPIC_API_KEY) and never reaches the client bundle.
//
// POST /.netlify/functions/translate
// body: { text: string, targetLang: 'de' | 'en' }
// returns: { translation: string }
//
// On any error returns 5xx — the caller treats failures as 'leave the
// other-language column null' and the save still succeeds.

const SYSTEM_PROMPT = (
  "Translate the following espresso review comment. Keep the tone " +
  "personal and opinionated. Preserve proper nouns (café names like " +
  "'Café Franco' or 'W Hotel') exactly as written. Only return the " +
  "translation, nothing else."
);

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: 'Invalid JSON' }; }

  const text       = (body.text || '').trim();
  const targetLang = body.targetLang;
  if (!text)                                return { statusCode: 400, body: 'Missing text' };
  if (targetLang !== 'de' && targetLang !== 'en') {
    return { statusCode: 400, body: "targetLang must be 'de' or 'en'" };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: 'ANTHROPIC_API_KEY not configured' };
  }

  const targetName = targetLang === 'de' ? 'German' : 'English';

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
        system: SYSTEM_PROMPT + ' Translate to ' + targetName + '.',
        messages: [{ role: 'user', content: text }],
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { statusCode: 502, body: 'Anthropic ' + res.status + ': ' + errBody };
    }

    const data = await res.json();
    const translation = (data.content || []).map((p) => p.text || '').join('').trim();
    if (!translation) return { statusCode: 502, body: 'Empty translation' };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ translation }),
    };
  } catch (err) {
    return { statusCode: 500, body: 'Internal: ' + (err && err.message ? err.message : String(err)) };
  }
}
