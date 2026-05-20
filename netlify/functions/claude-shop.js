/**
 * Claude Shop AI — Netlify Function (p1_85).
 *
 * Customer-facing shopping assistant on the 10 CAMP landing page.
 * Different system prompt from claude-ask (internal staff tool) —
 * never expose sales numbers, customer lists, or internal data.
 *
 * Receives POST { question, catalog_summary, history }
 * - question: customer's question (string)
 * - catalog_summary: optional summary of products on the page (array of {sku,name,brand,price,category})
 * - history: optional last 4 turns of conversation [{role, content}]
 *
 * Public URL: https://pos-system-test.netlify.app/.netlify/functions/claude-shop
 * Friendly:   https://pos-system-test.netlify.app/api/shop-ai
 *
 * ENV (Netlify dashboard):
 *   ANTHROPIC_API_KEY = sk-ant-... (shared with claude-ask)
 */

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `You are a friendly shopping advisor for "10 CAMP", a Malaysian outdoor/camping retail shop.

# What you help with
- Product recommendations ("cadang tent untuk 4 orang", "beg backpack hiking 1 minggu")
- Sizing, specs, materials, weight, weather suitability
- Brand questions (Naturehike, Blackdog, Aclus, Aotu, Mountain Hardwear, Decathlon, MAGT, etc.)
- Store hours, location, contact
- Shipping & return policy
- General camping/outdoor tips (kena permit ke, suitable kawasan, dll.)

# Reply rules
- Match the customer's language: Bahasa Melayu, English, or mix (Manglish) — whatever they use.
- Keep answers short (2–4 sentences typical), skimmable, friendly.
- When recommending products, reference SKU/name from the <catalog> block when relevant. Don't invent products.
- Use RM for currency.
- For technical specs, ELI5 — pelanggan bukan expert outdoor.
- End with a gentle nudge ("nak tengok detail?", "mahu visit kedai?", "ada soalan lain?") when appropriate.

# Hard guardrails — NEVER do these
- DO NOT expose internal data: no sales numbers, profit margins, customer lists, exact stock counts, staff names, or operations data.
- For stock checks: just say "boleh check kedai atau WhatsApp untuk verify availability" — don't give specific numbers.
- For order tracking / refund issues / complaints: redirect to WhatsApp or visit kedai. Tell them: "Untuk track order atau refund, sila WhatsApp staff kami atau visit kedai Cyberjaya."
- DO NOT promise pricing, stock, or delivery time you don't have data for. Say "biasanya..." with caveat.
- DO NOT discuss other businesses, politics, religion, or unrelated topics. Politely redirect: "Aku boleh tolong soalan camping/outdoor je. Untuk yang lain, hubungi kami terus."

# Store info (static facts)
- Lokasi: Cyberjaya, Selangor
- Hours: Isnin–Sabtu, 10am–9pm. Ahad tutup.
- Website: 10camp.com
- WhatsApp: cek butang di laman web
- Categories: Tents, Sleeping bags, Backpacks, Cookware, Apparel, Lights, Accessories
- Shipping: Klang Valley same-day kalau order awal pagi · West Malaysia 2-3 hari · East Malaysia 5-7 hari · RM 8-15 typical
- Returns: 7 hari unopened. Warranty cases handled per brand (Naturehike 1-2 tahun, brand lain varies).

Tone: ramah macam kawan yang biasa outdoor. Bukan robot, bukan salesman pushy.`;

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
                service: 'claude-shop',
                model: MODEL,
                api_key_configured: !!ANTHROPIC_KEY,
                ts: new Date().toISOString()
            })
        };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    if (!ANTHROPIC_KEY) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured in Netlify env vars.' })
        };
    }

    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch (e) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Invalid JSON body.' })
        };
    }

    const question = (body.question || '').trim();
    if (!question) {
        return {
            statusCode: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Missing "question" field.' })
        };
    }

    // Build catalog context (small — top products from landing page state)
    let catalogBlock = '';
    if (Array.isArray(body.catalog_summary) && body.catalog_summary.length) {
        const top = body.catalog_summary.slice(0, 30);
        catalogBlock = '<catalog>\n' + top.map(p =>
            `- [${p.sku || '-'}] ${p.name || '-'} · ${p.brand || '-'} · ${p.category || '-'} · RM ${p.price || '-'}`
        ).join('\n') + '\n</catalog>\n\n';
    }

    // Build messages array — include short history if provided
    const messages = [];
    if (Array.isArray(body.history) && body.history.length) {
        // Take last 4 turns (8 messages max)
        const hist = body.history.slice(-8).filter(m => m && m.role && m.content);
        hist.forEach(m => {
            messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: String(m.content).slice(0, 2000) });
        });
    }
    messages.push({ role: 'user', content: catalogBlock + question });

    try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: 500,
                system: SYSTEM_PROMPT,
                messages
            })
        });

        const data = await resp.json();
        if (!resp.ok) {
            return {
                statusCode: resp.status,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: data.error?.message || 'Claude API error', detail: data })
            };
        }

        const answer = (data.content && data.content[0] && data.content[0].text) || '';
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({
                answer,
                model: MODEL,
                usage: data.usage || null
            })
        };
    } catch (err) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Fetch failed: ' + (err.message || String(err)) })
        };
    }
};
