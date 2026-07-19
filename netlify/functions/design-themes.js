/**
 * design-themes.js — API Makmal Design (p1_1120).
 *
 * POST { pin, mode, ...payload }
 *   mode=save     { slug, name, tokens, note }  → simpan sebagai VERSI BARU (draf)
 *   mode=publish  { slug, version }             → jadikan aktif (semua lain → bukan-aktif)
 *   mode=archive  { slug }                      → tanda arkib (versi terkini)
 *   mode=restore  { slug, version }             → salin versi lama jadi versi baru (draf)
 *
 * Auth: PIN pengurusan disahkan SERVER-side lawan app_settings security.confidential_pin
 * (fallback '1999'). Baca senarai TIDAK perlu fungsi ni — table design_themes boleh
 * SELECT terus dengan anon key (token bukan rahsia).
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://asehjdnfzoypbwfeazra.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

async function sb(method, path, body, headers) {
    const res = await fetch(SUPABASE_URL + '/rest/v1' + path, {
        method,
        headers: Object.assign({
            apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY,
            'Content-Type': 'application/json'
        }, headers || {}),
        body: body ? JSON.stringify(body) : undefined
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(method + ' ' + path + ' -> ' + res.status + ' ' + txt.slice(0, 160));
    return txt ? JSON.parse(txt) : null;
}

async function pinOk(pin) {
    if (!pin || String(pin).length < 4) return false;
    try {
        const rows = await sb('GET', '/app_settings?key=eq.security&select=value');
        const dbPin = rows && rows[0] && rows[0].value && rows[0].value.confidential_pin;
        return String(pin) === String(dbPin || '1999');
    } catch (e) {
        return String(pin) === '1999';
    }
}

function j(code, obj) {
    return { statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj) };
}

const OK_TOKEN_KEYS = ['bg','surface','text','muted','accent','accentText','line','fontDisplay','fontBody','fontMono','radiusBtn','radiusCard','devices'];

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return j(405, { error: 'POST only' });
    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (_) {}
    if (!(await pinOk(body.pin))) return j(401, { error: 'PIN salah' });

    const mode = body.mode;
    const by = String(body.by || 'Makmal').slice(0, 40);
    try {
        if (mode === 'save') {
            const slug = String(body.slug || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
            const name = String(body.name || '').slice(0, 80);
            if (!slug || !name) return j(400, { error: 'slug/nama tak sah' });
            const tokens = {};
            OK_TOKEN_KEYS.forEach(k => { if (body.tokens && body.tokens[k] !== undefined) tokens[k] = body.tokens[k]; });
            if (!tokens.bg || !tokens.accent) return j(400, { error: 'token tak lengkap (perlu bg + accent)' });
            const cur = await sb('GET', `/design_themes?slug=eq.${slug}&select=version&order=version.desc&limit=1`);
            const version = (cur && cur[0] ? cur[0].version : 0) + 1;
            await sb('POST', '/design_themes', [{
                slug, name, version, tokens,
                status: 'draf',
                note: String(body.note || '').slice(0, 300) || null,
                updated_by: by
            }], { Prefer: 'return=minimal' });
            return j(200, { ok: true, slug, version });
        }

        if (mode === 'publish') {
            const slug = String(body.slug || '');
            const version = parseInt(body.version, 10);
            if (!slug || !version) return j(400, { error: 'slug/version perlu' });
            const rows = await sb('GET', `/design_themes?slug=eq.${encodeURIComponent(slug)}&version=eq.${version}&select=id`);
            if (!rows || !rows.length) return j(404, { error: 'tema tak jumpa' });
            // satu sahaja aktif pada satu masa
            await sb('PATCH', '/design_themes?status=eq.aktif', { status: 'arkib' }, { Prefer: 'return=minimal' });
            await sb('PATCH', `/design_themes?id=eq.${rows[0].id}`, { status: 'aktif', updated_by: by }, { Prefer: 'return=minimal' });
            return j(200, { ok: true, aktif: slug + ' v' + version });
        }

        if (mode === 'archive') {
            const slug = String(body.slug || '');
            await sb('PATCH', `/design_themes?slug=eq.${encodeURIComponent(slug)}&status=neq.aktif`, { status: 'arkib' }, { Prefer: 'return=minimal' });
            return j(200, { ok: true });
        }

        if (mode === 'restore') {
            const slug = String(body.slug || '');
            const version = parseInt(body.version, 10);
            const rows = await sb('GET', `/design_themes?slug=eq.${encodeURIComponent(slug)}&version=eq.${version}&select=name,tokens,note`);
            if (!rows || !rows.length) return j(404, { error: 'versi tak jumpa' });
            const cur = await sb('GET', `/design_themes?slug=eq.${encodeURIComponent(slug)}&select=version&order=version.desc&limit=1`);
            const newVer = (cur && cur[0] ? cur[0].version : 0) + 1;
            await sb('POST', '/design_themes', [{
                slug, name: rows[0].name, version: newVer, tokens: rows[0].tokens,
                status: 'draf', note: 'Dipulihkan dari v' + version, updated_by: by
            }], { Prefer: 'return=minimal' });
            return j(200, { ok: true, slug, version: newVer });
        }

        return j(400, { error: 'mode tak dikenali' });
    } catch (e) {
        return j(500, { error: String(e.message || e).slice(0, 200) });
    }
};
