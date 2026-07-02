/**
 * winback.js — Win-Back / Retention email engine (p1_1009, marketing P1 #1).
 *
 * Re-engage LAPSED customers (bought before, have email, not opted out, not recently mailed,
 * last order older than N days) with a branded email that funnels them to Shopee / TikTok / WhatsApp
 * (10 CAMP has no web checkout — buying happens on those channels).
 *
 * Staff-gated (requireAuth). Modes:
 *   GET /api/winback?mode=preview&days=90        -> { count, sample[8], sample_html }
 *   GET /api/winback?mode=send&days=90&dryrun=1  -> { dryrun, count, would_send[10] }  (default: dry-run)
 *   GET /api/winback?mode=send&days=90&dryrun=0&cap=500 -> LIVE send via Resend (throttled, logged, opt-out link)
 *
 * Never blasts on its own — live send needs an explicit dryrun=0 from a staff click.
 */
const crypto = require('crypto');
const { requireAuth } = require('./_auth');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://asehjdnfzoypbwfeazra.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const RESEND_KEY   = process.env.RESEND_API_KEY || '';
const FROM_ADDR    = process.env.WINBACK_FROM || process.env.RECEIPT_FROM || '10 CAMP <admin@10camp.com>';
const SITE         = 'https://www.10camp.com';
const HMAC_KEY     = process.env.INTERNAL_FN_SECRET || 'winback_fallback_key';
const STORE = { whatsapp: '601133109547', shopee: 'https://shopee.com.my/10camp.os', tiktok: 'https://vt.tiktok.com/ZSxoAXDhd/' };

const json = (c, o) => ({ statusCode: c, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(o) });
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function sb(path, opts) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${path}`, Object.assign({}, opts, {
    headers: Object.assign({ apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }, (opts && opts.headers) || {})
  }));
  const t = await r.text();
  if (!r.ok) throw new Error(`sb ${r.status}: ${t.slice(0, 150)}`);
  return t ? JSON.parse(t) : null;
}

function unsubToken(email) {
  const e = Buffer.from(String(email).toLowerCase()).toString('base64url');
  const sig = crypto.createHmac('sha256', HMAC_KEY).update(String(email).toLowerCase()).digest('base64url').slice(0, 16);
  return e + '.' + sig;
}

function buildHtml(cust) {
  const name = esc((cust.name || '').trim().split(' ')[0] || 'kawan');
  const pts = Number(cust.points) || 0;
  const unsub = `${SITE}/.netlify/functions/winback-unsub?t=${unsubToken(cust.email)}`;
  const ptsLine = pts > 0
    ? `<p style="margin:0 0 14px;font-size:15px;color:#374151;">Anda ada <b style="color:#A5611F;">${pts} mata ganjaran</b> menunggu untuk digunakan.</p>`
    : `<p style="margin:0 0 14px;font-size:15px;color:#374151;">Ada koleksi gear baru yang mungkin awak suka.</p>`;
  return `<!doctype html><html><body style="margin:0;background:#FAF6EF;font-family:-apple-system,Segoe UI,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6EF;padding:26px 12px;"><tr><td align="center">
  <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border:1px solid #E9DECF;border-radius:16px;overflow:hidden;">
    <tr><td style="background:#101010;padding:22px 28px;"><span style="color:#CD7C32;font-weight:800;font-size:20px;letter-spacing:1px;">10 CAMP</span></td></tr>
    <tr><td style="padding:28px;">
      <h1 style="margin:0 0 12px;font-size:22px;color:#101010;">Hai ${name}, dah lama tak jumpa!</h1>
      ${ptsLine}
      <p style="margin:0 0 20px;font-size:14.5px;color:#4A4238;line-height:1.6;">Jom singgah semula dan lengkapkan gear camping outdoor awak. Beli mudah di mana-mana channel bawah:</p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;"><tr>
        <td style="padding:5px;"><a href="${STORE.shopee}" style="display:block;background:#CD7C32;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px;">Shopee</a></td>
        <td style="padding:5px;"><a href="${STORE.tiktok}" style="display:block;background:#101010;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px;">TikTok Shop</a></td>
        <td style="padding:5px;"><a href="https://wa.me/${STORE.whatsapp}" style="display:block;background:#fff;border:1.5px solid #CD7C32;color:#A5611F;text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:10px;">WhatsApp</a></td>
      </tr></table>
      <p style="margin:16px 0 0;font-size:12.5px;color:#9CA3AF;">Atau layari katalog penuh di <a href="${SITE}" style="color:#A5611F;">www.10camp.com</a></p>
    </td></tr>
    <tr><td style="padding:16px 28px;background:#F9F5EE;border-top:1px solid #EEE4D6;font-size:11px;color:#9CA3AF;line-height:1.5;">
      Anda terima email ni sebab pernah membeli di 10 CAMP. <a href="${unsub}" style="color:#9CA3AF;">Berhenti melanggan</a> · 10 CAMP · admin@10camp.com
    </td></tr>
  </table></td></tr></table></body></html>`;
}

exports.handler = async (event) => {
  const a = await requireAuth(event); if (!a.ok) return a.response;
  if (!SERVICE_KEY) return json(500, { error: 'SUPABASE_SERVICE_KEY not set' });
  const p = event.queryStringParameters || {};
  const mode = p.mode || 'preview';
  const days = Math.max(1, parseInt(p.days, 10) || 90);

  let seg;
  try { seg = await sb('/rpc/winback_segment', { method: 'POST', body: JSON.stringify({ p_days: days }) }) || []; }
  catch (e) { return json(502, { error: 'segment_failed', detail: String(e).slice(0, 160) }); }

  if (mode === 'preview') {
    const sample = seg.slice(0, 8).map(c => ({ name: c.name, email: c.email, points: c.points, total_spent: c.total_spent, last_order: c.last_order }));
    const sample_html = buildHtml(seg[0] || { name: 'Ali Bin Abu', email: 'contoh@email.com', points: 12 });
    return json(200, { ok: true, count: seg.length, days, sample, sample_html });
  }

  if (mode === 'send') {
    const dryrun = p.dryrun !== '0';
    if (dryrun) return json(200, { ok: true, dryrun: true, count: seg.length, days, would_send: seg.slice(0, 10).map(c => c.email) });
    if (!RESEND_KEY) return json(200, { skipped: true, reason: 'RESEND_API_KEY tak set dalam Netlify env' });
    const cap = Math.min(seg.length, Math.max(1, parseInt(p.cap, 10) || 300)); // cap per run — throttle
    let sent = 0, failed = 0;
    for (let i = 0; i < cap; i++) {
      const c = seg[i]; if (!c || !c.email) { continue; }
      try {
        const r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: FROM_ADDR, to: c.email, subject: `Kami rindu awak${(Number(c.points) > 0) ? ` — ${c.points} mata menunggu` : ''}`, html: buildHtml(c) })
        });
        if (r.ok) { sent++; try { await sb('/winback_sends', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify([{ email: c.email, campaign: 'winback', status: 'sent' }]) }); } catch (_) {} }
        else { failed++; }
      } catch (e) { failed++; }
    }
    return json(200, { ok: true, sent, failed, cap, total_segment: seg.length, remaining: Math.max(0, seg.length - cap) });
  }

  return json(400, { error: 'unknown mode' });
};
