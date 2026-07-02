/**
 * winback-unsub.js — public unsubscribe for Win-Back / marketing emails (p1_1009).
 * Customer clicks the link in the email. Token = base64url(email) + '.' + HMAC(email) so a
 * random visitor can't opt-out arbitrary addresses. Writes to marketing_optout (service key).
 * PUBLIC (no requireAuth) — low-stakes, HMAC-verified.
 */
const crypto = require('crypto');
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://asehjdnfzoypbwfeazra.supabase.co';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY || '';
const HMAC_KEY     = process.env.INTERNAL_FN_SECRET || 'winback_fallback_key';

function verify(t) {
  const parts = String(t || '').split('.');
  if (parts.length !== 2) return null;
  let email;
  try { email = Buffer.from(parts[0], 'base64url').toString('utf8'); } catch (_) { return null; }
  const good = crypto.createHmac('sha256', HMAC_KEY).update(email.toLowerCase()).digest('base64url').slice(0, 16);
  return parts[1] === good ? email.toLowerCase() : null;
}

function page(msg) {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: `<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>10 CAMP</title></head><body style="margin:0;font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#FAF6EF;color:#101010;text-align:center;padding:64px 20px;"><div style="max-width:440px;margin:auto;background:#fff;border:1px solid #E9DECF;border-radius:16px;padding:36px 28px;"><div style="font-weight:800;color:#CD7C32;font-size:22px;letter-spacing:1px;margin-bottom:16px;">10 CAMP</div>${msg}</div></body></html>`
  };
}

exports.handler = async (event) => {
  const email = verify((event.queryStringParameters || {}).t);
  if (!email) return page('<p style="font-size:15px;color:#374151;">Pautan tidak sah atau tamat tempoh.</p>');
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/marketing_optout`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ email, reason: 'unsubscribe' }])
    });
  } catch (e) { /* best-effort */ }
  return page('<p style="font-size:15px;color:#374151;line-height:1.6;">Anda telah <b>berhenti melanggan</b> email promosi 10 CAMP.<br>Maaf mengganggu — jumpa lagi!</p>');
};
