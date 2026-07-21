// p1_1156 — CONSENT SATU-KLIK DARI EMAIL KEMPEN (Zaid: "bypass jugak yang tak bagi consent,
// dan tanya customer terus... tanya consent confirmation sekali lagi dekat email").
// Email blast kini disertakan 2 butang: "Ya, teruskan" / "Berhenti" — link GET ke function ni
// dengan tandatangan HMAC (INTERNAL_FN_SECRET, pattern sama sesi portal loyalty-otp):
//   ?e=<base64url email>&a=yes|no&s=<hmac('consent|'+email)>
// Sah → update customers.accepts_email_marketing → papar halaman pengesahan berjenama.
// Tanpa tandatangan sah, tiada apa boleh diubah (orang tak boleh flip consent orang lain).

const crypto = require('crypto');
const SECRET = process.env.INTERNAL_FN_SECRET || '';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://asehjdnfzoypbwfeazra.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const sig = (email) => crypto.createHmac('sha256', SECRET).update('consent|' + email).digest('hex');

function page(title, body, ok) {
  return `<!DOCTYPE html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — 10 CAMP</title></head>
<body style="margin:0;background:#101010;color:#FAF6EF;font-family:-apple-system,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;">
<div style="max-width:420px;text-align:center;background:#1a1714;border:1px solid #2c2620;border-radius:18px;padding:36px 28px;">
<div style="font-weight:800;font-size:20px;letter-spacing:1px;color:#CD7C32;margin-bottom:18px;">10 CAMP REWARDS</div>
<div style="font-size:44px;margin-bottom:12px;">${ok ? '✅' : '👋'}</div>
<h1 style="font-size:19px;margin:0 0 10px;">${title}</h1>
<p style="font-size:13.5px;color:#A8A29A;line-height:1.6;margin:0;">${body}</p>
<a href="https://www.10camp.com/loyalty.html" style="display:inline-block;margin-top:22px;background:#CD7C32;color:#101010;font-weight:800;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:10px;">Buka Loyalty Portal</a>
</div></body></html>`;
}

exports.handler = async (event) => {
  const html = (code, body) => ({ statusCode: code, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body });
  try {
    if (!SECRET || !SERVICE_KEY) return html(500, page('Ralat konfigurasi', 'Sistem belum diset. Hubungi kedai.', false));
    const q = event.queryStringParameters || {};
    let email = '';
    try { email = Buffer.from(String(q.e || ''), 'base64url').toString('utf8').trim().toLowerCase(); } catch (_) {}
    const action = q.a === 'yes' ? 'yes' : q.a === 'no' ? 'no' : null;
    const given = String(q.s || '');
    if (!email || !action || !given) return html(400, page('Link tak lengkap', 'Link ni tak sah. Guna butang dalam email asal.', false));
    const want = sig(email);
    if (want.length !== given.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(given))) {
      return html(403, page('Link tak sah', 'Tandatangan link tak padan. Guna butang dalam email asal.', false));
    }
    const consent = action === 'yes';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/customers?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ accepts_email_marketing: consent })
    });
    const rows = await res.json().catch(() => []);
    if (!res.ok || !Array.isArray(rows) || !rows.length) return html(404, page('Akaun tak dijumpai', 'Email ni tiada dalam rekod kami.', false));
    // audit best-effort (target_staff NOT NULL — guna 'system')
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
        method: 'POST',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify([{ action_type: 'email_consent_update', actor_name: 'Customer (link email)', target_staff: 'system', details: JSON.stringify({ email, consent }), created_at: new Date().toISOString() }])
      });
    } catch (_) {}
    return consent
      ? html(200, page('Terima kasih!', 'Anda akan terus terima berita, tawaran & info mata ganjaran dari 10 CAMP. Jumpa di kedai!', true))
      : html(200, page('Pilihan disimpan', 'Anda takkan terima email pemasaran dari kami lagi. Resit & kod login portal masih dihantar seperti biasa.', false));
  } catch (e) {
    return html(500, page('Ralat', 'Sesuatu tak kena. Cuba lagi sebentar.', false));
  }
};
