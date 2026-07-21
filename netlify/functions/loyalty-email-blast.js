// p1_1131 — KEMPEN E-MEL MATA (Zaid 20 Jul: "hantar email terus dari admin@10camp.com,
// staf mesti tengok preview sebelum confirm"). Dipanggil dari modal "Kempen E-mel Mata"
// dlm page Points & Membership (app.js __mbOpen). Preview dibuat CLIENT-side; function ni
// hanya terima senarai akhir yang staf dah sahkan.
//
// POST (staf JWT via requireStaff):
//   { subject, body, recipients:[{email,name,mata,tier,kadar}] }
//   body = template teks dgn token {name} {mata} {tier} {kadar} — dirender per penerima,
//   dibalut template HTML berjenama SAMA dgn email OTP (konsisten rupa).
// Hantar via Resend /emails/batch (max 100/panggilan) dari admin@10camp.com.
// Rekod: audit_logs (action_type 'loyalty_email_blast') + app_settings 'mata_blast_last'.
//
// Env: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY (semua dah set utk loyalty-otp).

const { requireStaff } = require('./_auth');
const crypto = require('crypto');

const CONSENT_SECRET = process.env.INTERNAL_FN_SECRET || ''; // p1_1156 — tandatangan link consent
const RESEND_KEY = process.env.RESEND_API_KEY || '';
const FROM_ADDR = process.env.LOYALTY_FROM || process.env.RECEIPT_FROM || '10 CAMP Rewards <admin@10camp.com>';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://asehjdnfzoypbwfeazra.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const MAX_RECIPIENTS = 500;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

async function sb(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...(opts.headers || {}) }
  });
  if (!res.ok) throw new Error(`sb ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

function isEmail(e) { return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// p1_1133 — poster kempen dlm email (Zaid: "letak poster tu semasa email customer").
// Di-hos di site (email perlu URL awam); poster-4 A4 versi 800px. SYNC dgn pratonton app.js.
const POSTER_URL = 'https://www.10camp.com/assets/promo/poster-claim-point-2026.png';

// Render body template → HTML berjenama (gaya sama email OTP loyalty-otp.js).
// Token per penerima: {name} {mata} {tier} {kadar}. Baris kosong = perenggan.
function renderEmail(bodyTpl, r, withPoster) {
  const firstName = String(r.name || 'kawan').split(' ')[0];
  const filled = String(bodyTpl || '')
    .replace(/\{name\}/g, firstName)
    .replace(/\{mata\}/g, String(r.mata != null ? r.mata : ''))
    .replace(/\{tier\}/g, String(r.tier || ''))
    .replace(/\{kadar\}/g, r.kadar != null ? ('RM ' + Number(r.kadar).toFixed(2)) : '');
  const paras = esc(filled).split(/\n\s*\n/).map(p => `<p style="font-size:14px; color:#374151; line-height:1.7; margin:0 0 14px;">${p.replace(/\n/g, '<br>')}</p>`).join('');
  const posterHtml = withPoster
    ? `<a href="https://www.10camp.com/loyalty.html" style="display:block; margin:18px 0;"><img src="${POSTER_URL}" alt="Claim point anda sebelum 31 Disember 2026 — 10 CAMP Rewards" style="width:100%; display:block; border-radius:8px; border:1px solid #E5E7EB;"></a>`
    : '';
  // p1_1156 — blok pengesahan consent satu-klik (Zaid: blast semua + tanya consent dlm email).
  // Link bertandatangan HMAC → loyalty-consent.js update accepts_email_marketing terus.
  let consentHtml = '';
  if (CONSENT_SECRET && r.email) {
    const e64 = Buffer.from(String(r.email), 'utf8').toString('base64url');
    const s = crypto.createHmac('sha256', CONSENT_SECRET).update('consent|' + r.email).digest('hex');
    const base = `https://www.10camp.com/.netlify/functions/loyalty-consent?e=${e64}&s=${s}`;
    consentHtml = `<div style="margin:22px 0 4px; padding:16px; background:#FAF6EF; border:1px solid #F0C896; border-radius:12px; text-align:center;">
      <p style="font-size:13px; color:#374151; margin:0 0 12px; font-weight:600;">Nak terus terima berita, tawaran &amp; info mata dari 10 CAMP?</p>
      <a href="${base}&a=yes" style="display:inline-block; background:#168C50; color:#FFFFFF; font-weight:800; font-size:13px; text-decoration:none; padding:10px 20px; border-radius:8px; margin:0 4px;">✅ Ya, teruskan</a>
      <a href="${base}&a=no" style="display:inline-block; background:#FFFFFF; color:#6B7280; font-weight:700; font-size:13px; text-decoration:none; padding:10px 20px; border-radius:8px; border:1px solid #D1D5DB; margin:0 4px;">Berhenti</a>
      <p style="font-size:10.5px; color:#9CA3AF; margin:10px 0 0;">Satu klik sahaja — pilihan anda disimpan serta-merta.</p>
    </div>`;
  }
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif; max-width:480px; margin:0 auto; padding:24px;">
    <div style="text-align:center; font-weight:800; font-size:20px; color:#CD7C32; letter-spacing:1px;">10 CAMP REWARDS</div>
    <div style="margin-top:18px;">${paras}</div>
    ${posterHtml}
    <div style="text-align:center; margin:20px 0;">
      <a href="https://www.10camp.com/loyalty.html" style="display:inline-block; background:#CD7C32; color:#101010; font-weight:800; font-size:14px; text-decoration:none; padding:12px 26px; border-radius:10px;">Semak Mata &amp; Barang Boleh Tebus</a>
    </div>
    ${consentHtml}
    <p style="font-size:11px; color:#9CA3AF; margin-top:18px; line-height:1.6;">10 CAMP &middot; Cyberjaya &middot; admin@10camp.com<br>Anda terima email ini kerana anda pelanggan berdaftar 10 CAMP. Guna butang di atas untuk urus langganan.</p>
  </div>`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'POST only' }) };

  const auth = await requireStaff(event);
  if (!auth.ok) return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'unauthorized' }) };
  if (!RESEND_KEY) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'RESEND_API_KEY tak set' }) };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Body tak valid' }) }; }

  const subject = String(body.subject || '').trim().slice(0, 150);
  const bodyTpl = String(body.body || '').trim().slice(0, 5000);
  if (!subject || !bodyTpl) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Subject & body wajib' }) };

  // Bersih + dedupe penerima
  const seen = new Set();
  const recipients = (Array.isArray(body.recipients) ? body.recipients : []).filter(r => {
    const e = String(r && r.email || '').trim().toLowerCase();
    if (!isEmail(e) || seen.has(e)) return false;
    seen.add(e); r.email = e; return true;
  }).slice(0, MAX_RECIPIENTS);
  if (!recipients.length) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Tiada penerima sah' }) };

  // Hantar batch 100-100 (had Resend /emails/batch)
  let sent = 0; const failures = [];
  for (let i = 0; i < recipients.length; i += 100) {
    const chunk = recipients.slice(i, i + 100).map(r => ({
      from: FROM_ADDR, to: r.email, subject: subject, html: renderEmail(bodyTpl, r, body.with_poster !== false)
    }));
    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk)
      });
      const rd = await res.json().catch(() => ({}));
      if (res.ok) sent += chunk.length;
      else failures.push(`batch ${i / 100 + 1}: ${rd.message || res.status}`);
    } catch (e) { failures.push(`batch ${i / 100 + 1}: ${String(e.message || e).slice(0, 120)}`); }
    if (i + 100 < recipients.length) await new Promise(r => setTimeout(r, 600)); // hormat rate limit
  }

  // Rekod (best-effort — kegagalan log JANGAN gagalkan penghantaran yang dah jadi)
  const staffEmail = (auth.user && auth.user.email) || 'unknown';
  try {
    await sb('/audit_logs', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify([{ action_type: 'loyalty_email_blast', actor_name: staffEmail, details: JSON.stringify({ subject, sent, failed: failures.length, total: recipients.length }), created_at: new Date().toISOString() }]) });
  } catch (_) {}
  try {
    await sb('/app_settings?on_conflict=key', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ key: 'mata_blast_last', value: { at: new Date().toISOString(), by: staffEmail, subject, sent, total: recipients.length } }]) });
  } catch (_) {}

  return { statusCode: failures.length && !sent ? 502 : 200, headers: cors, body: JSON.stringify({ ok: sent > 0, sent, total: recipients.length, failures }) };
};
