/**
 * Claude API proxy — Netlify Function.
 *
 * "Tanya 10 CAMP" NL query (p8_3).
 *
 * Receives POST { question, context_summary } from the dashboard,
 * forwards to Claude API with a system prompt that frames the model
 * as a 10 CAMP business analyst. Uses claude-haiku-4-5-20251001 for
 * cost-efficient responses.
 *
 * Public URL: https://pos-system-test.netlify.app/.netlify/functions/claude-ask
 * Friendly:   https://pos-system-test.netlify.app/api/ask
 *
 * ENV (Netlify dashboard):
 *   ANTHROPIC_API_KEY = sk-ant-...
 */

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You are a friendly, concise business analyst for "10 CAMP", a Malaysian outdoor/camping retail shop.

Reply rules:
- Match the user's language: Bahasa Melayu, English, or mix (Manglish) — whatever they use.
- Keep answers short and skimmable (use bullet lists when useful).
- Reference numbers from the provided <data> block — never invent figures.
- If the data doesn't contain what they asked, say so honestly and suggest what filter or report would have it.
- Never expose customer phone numbers or PII in the response unless explicitly requested by the owner.
- Use RM (Ringgit Malaysia) for currency.

Tone: helpful, owner-friendly, ELI5 explanations when terms are jargon.`;

exports.handler = async function (event) {
    // CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: ''
        };
    }

    // Health-check
    if (event.httpMethod === 'GET') {
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                ok: true,
                service: 'claude-ask',
                model: MODEL,
                api_key_configured: !!ANTHROPIC_KEY,
                ts: new Date().toISOString()
            })
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    if (!ANTHROPIC_KEY) {
        return {
            statusCode: 503,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                ok: false,
                error: 'ANTHROPIC_API_KEY not configured. Add it in Netlify env vars.'
            })
        };
    }

    let payload;
    try { payload = JSON.parse(event.body || '{}'); }
    catch (e) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ ok: false, error: 'bad_json' })
        };
    }

    const question = (payload.question || '').toString().trim();
    const ctx = (payload.context_summary || '').toString().slice(0, 8000);

    if (!question) {
        return {
            statusCode: 400,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ ok: false, error: 'no question' })
        };
    }

    const userMessage = ctx
        ? `<data>\n${ctx}\n</data>\n\nQuestion: ${question}`
        : `Question: ${question}\n\n(No live data summary attached.)`;

    try {
        const r = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: 600,
                system: SYSTEM_PROMPT,
                messages: [
                    { role: 'user', content: userMessage }
                ]
            })
        });

        const text = await r.text();
        if (!r.ok) {
            return {
                statusCode: r.status,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ ok: false, error: 'anthropic_error', detail: text.slice(0, 400) })
            };
        }

        const data = JSON.parse(text);
        const answer = data.content && data.content[0] && data.content[0].text || '';
        const usage = data.usage || {};

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                ok: true,
                answer,
                model: data.model,
                usage_input: usage.input_tokens,
                usage_output: usage.output_tokens,
                stop_reason: data.stop_reason
            })
        };
    } catch (e) {
        return {
            statusCode: 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ ok: false, error: 'fetch_failed', detail: (e.message || '').slice(0, 200) })
        };
    }
};
