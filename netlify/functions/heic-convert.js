/**
 * HEIC → JPEG Conversion — Netlify on-demand function (p1_256).
 *
 * Triggered untuk convert HEIC payment proofs (dari iPhone) ke JPEG yang
 * browser boleh render inline. Chrome/Safari tak support HEIC inline as
 * <img src>, jadi staff nampak broken image.
 *
 * Two modes:
 *   1. Single: POST {sale_id: 4981}  — convert satu sale
 *   2. Batch:  POST {batch: true}    — convert SEMUA HEIC dalam sales_history
 *                                      (max 20 per invocation, dipanggil
 *                                       berulang sampai habis)
 *
 * Env vars:
 *   SUPABASE_URL         — POS project URL
 *   SUPABASE_SERVICE_KEY — service role key
 *
 * Side effects:
 *   - Download HEIC bytes dari storage
 *   - heic-convert decode → JPEG buffer (quality 0.85)
 *   - Upload JPEG ke storage dengan filename baru (_converted.jpg suffix)
 *   - UPDATE sales_history.payment_proof_url ke URL JPEG baru
 *   - OLD HEIC kekal dalam storage (tak delete untuk safety; manual cleanup
 *     boleh kemudian)
 *   - INSERT audit log
 */

const heicConvert = require('heic-convert');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://asehjdnfzoypbwfeazra.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const BATCH_MAX = 20;

async function sb(path, opts = {}) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
        ...opts,
        headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: opts.method === 'PATCH' ? 'return=minimal' : 'return=representation',
            ...(opts.headers || {})
        }
    });
    if(!res.ok) {
        const txt = await res.text();
        throw new Error(`Supabase ${res.status}: ${txt.slice(0, 200)}`);
    }
    return res.json().catch(() => null);
}

async function storageUpload(bucket, path, buffer, contentType) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
        method: 'POST',
        headers: {
            apikey: SERVICE_KEY,
            Authorization: `Bearer ${SERVICE_KEY}`,
            'Content-Type': contentType,
            'Cache-Control': '3600',
            'x-upsert': 'true'
        },
        body: buffer
    });
    if(!res.ok) {
        const txt = await res.text();
        throw new Error(`Storage upload ${res.status}: ${txt.slice(0, 200)}`);
    }
    return res.json().catch(() => null);
}

async function convertSale(sale) {
    const oldUrl = sale.payment_proof_url;
    if(!oldUrl || !/\.heic$|\.heif$/i.test(oldUrl)) {
        return { sale_id: sale.id, skipped: true, reason: 'Not HEIC' };
    }

    // 1. Fetch HEIC bytes
    const heicRes = await fetch(oldUrl);
    if(!heicRes.ok) throw new Error(`Fetch HEIC failed ${heicRes.status}`);
    const heicBuf = Buffer.from(await heicRes.arrayBuffer());

    // 2. Convert to JPEG (quality 0.85 — balanced size + quality)
    const jpegBuf = await heicConvert({
        buffer: heicBuf,
        format: 'JPEG',
        quality: 0.85
    });

    // 3. Build new filename — replace .heic/.heif extension with _converted.jpg
    // OLD URL: https://xxx/storage/v1/object/public/payment-proofs/pending_XX.heic
    // Extract path after `payment-proofs/`
    const m = oldUrl.match(/\/payment-proofs\/(.+)$/);
    if(!m) throw new Error('Could not parse old URL path');
    const oldFilename = m[1];
    const newFilename = oldFilename.replace(/\.heic$|\.heif$/i, '_converted.jpg');

    // 4. Upload JPEG
    await storageUpload('payment-proofs', newFilename, jpegBuf, 'image/jpeg');
    const newUrl = `${SUPABASE_URL}/storage/v1/object/public/payment-proofs/${newFilename}`;

    // 5. Update sales_history
    await sb(`/sales_history?id=eq.${sale.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ payment_proof_url: newUrl })
    });

    // 6. Audit log
    try {
        await sb('/audit_logs', {
            method: 'POST',
            body: JSON.stringify({
                action_type: 'heic_convert',
                actor_name: 'System (Netlify function)',
                details: JSON.stringify({
                    sale_id: sale.id,
                    old_url: oldUrl,
                    new_url: newUrl,
                    bytes_in: heicBuf.length,
                    bytes_out: jpegBuf.length
                }),
                created_at: new Date().toISOString()
            })
        });
    } catch(_){}

    return {
        sale_id: sale.id,
        converted: true,
        old_url: oldUrl,
        new_url: newUrl,
        bytes_in: heicBuf.length,
        bytes_out: jpegBuf.length,
        reduction_pct: ((1 - jpegBuf.length / heicBuf.length) * 100).toFixed(1)
    };
}

exports.handler = async (event) => {
    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };
    if(event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
    if(event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'POST only' }) };

    if(!SERVICE_KEY) return { statusCode: 200, headers: cors, body: JSON.stringify({ skipped: true, reason: 'SUPABASE_SERVICE_KEY not set' }) };

    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch(e) { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

    try {
        // Single sale mode
        if(body.sale_id) {
            const rows = await sb(`/sales_history?id=eq.${body.sale_id}&select=id,payment_proof_url`);
            const sale = rows && rows[0];
            if(!sale) return { statusCode: 404, headers: cors, body: JSON.stringify({ error: 'sale not found' }) };
            const result = await convertSale(sale);
            return { statusCode: 200, headers: cors, body: JSON.stringify(result) };
        }

        // Batch mode
        if(body.batch) {
            // Find all HEIC entries (not yet converted)
            const rows = await sb(`/sales_history?select=id,payment_proof_url&or=(payment_proof_url.like.*.heic,payment_proof_url.like.*.heif)&limit=${BATCH_MAX}`);
            if(!rows || !rows.length) {
                return { statusCode: 200, headers: cors, body: JSON.stringify({ done: true, message: 'No HEIC entries remaining' }) };
            }
            const results = [];
            for(const sale of rows) {
                try {
                    results.push(await convertSale(sale));
                } catch(e) {
                    results.push({ sale_id: sale.id, error: e.message });
                }
            }
            return { statusCode: 200, headers: cors, body: JSON.stringify({ batch: true, processed: results.length, results }) };
        }

        return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'sale_id atau batch:true diperlukan' }) };
    } catch(e) {
        console.error('heic-convert error:', e);
        return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message, stack: e.stack }) };
    }
};
