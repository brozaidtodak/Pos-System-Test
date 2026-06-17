/**
 * translate.js — on-the-fly content translation (p1_630). Used to auto-translate
 * user-written content (e.g. memo title/body) when staff switch UI to English.
 * Server-side so OPENAI_API_KEY stays hidden. Client caches results (localStorage)
 * so each unique string is translated once.
 *
 * POST { texts: string[], target: 'en'|'bm' } -> { translations: string[] }
 * Public URL: /api/translate (redirect in netlify.toml).
 */
function json(code, obj) {
    return { statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
    try {
        const { texts, target } = JSON.parse(event.body || '{}');
        if (!Array.isArray(texts) || !texts.length) return json(400, { error: 'no texts' });
        if (texts.length > 60) return json(400, { error: 'too many texts (max 60)' });
        const key = process.env.OPENAI_API_KEY;
        if (!key) return json(500, { error: 'OPENAI_API_KEY not set' });

        const targetLang = target === 'bm' ? 'Malay (Bahasa Melayu)' : 'English';
        // p1_823 — domain context so retail/inventory/finance terms translate correctly (was mistranslating
        // e.g. "barang/jualan" → "meals"). 10 CAMP = camping & outdoor GEAR retailer, never food.
        const sys = `You translate UI text from a Malaysian CAMPING & OUTDOOR GEAR retail point-of-sale, inventory, marketing and finance system (brand: 10 CAMP) to ${targetLang}. The input is a JSON array of strings. Translate retail/inventory/sales/marketing/finance terms accurately and literally — e.g. "barang"/"produk"/"jualan" = goods/products/sales (this business sells camping equipment; NEVER translate them as food, meals, or dishes). Preserve EXACTLY: SKUs/product codes (e.g. BD152), dates, numbers, percentages, currencies (RM), URLs, proper names, brand/platform names (Shopee, TikTok, WhatsApp, Naturehike, Blackdog, etc.) and line breaks. Keep tone neutral/professional, concise. Do not add notes. Respond ONLY with a JSON object {"translations": [...]} of the SAME length and order as the input.`;

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'gpt-4o-mini', temperature: 0,
                response_format: { type: 'json_object' },
                messages: [
                    { role: 'system', content: sys },
                    { role: 'user', content: JSON.stringify(texts) }
                ]
            })
        });
        const j = await res.json();
        if (!res.ok) return json(502, { error: (j.error && j.error.message) || 'openai error' });
        let out = [];
        try { out = JSON.parse(j.choices[0].message.content).translations; } catch (e) { /* fall through */ }
        if (!Array.isArray(out) || out.length !== texts.length) out = texts; // safe fallback = originals
        return json(200, { translations: out });
    } catch (e) {
        return json(500, { error: String(e) });
    }
};
