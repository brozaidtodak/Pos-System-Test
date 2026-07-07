/**
 * meta-post.js — auto-post from POS to FB Page (+ IG, + Threads when connected) (p1_1083).
 *
 *   POST { caption, link?, image_url?, targets:['fb','ig','threads'], product_sku? }
 *     → posts to each requested target, logs to marketing_content, returns per-target result.
 *
 * FB Page   : works now (page token has pages_manage_posts).
 * Instagram : needs cfg.ig_user_id (IG business account linked to the Page) + image_url.
 * Threads   : needs cfg.threads_access_token + cfg.threads_user_id (separate Threads auth).
 *
 * Gated by requireAuth. Public URL: /.netlify/functions/meta-post
 */
const { sb, getMetaConfig, graph } = require('./_meta');
const { requireAuth } = require('./_auth');

function json(code, obj) {
    return { statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj, null, 2) };
}

// --- FB Page ---
async function postFacebook(cfg, { caption, link, image_url }) {
    if (!cfg.page_access_token || !cfg.page_id) return { error: 'FB page not connected' };
    const token = cfg.page_access_token, pid = encodeURIComponent(cfg.page_id);
    try {
        if (image_url) {
            const r = await graph(`/${pid}/photos`, { token, method: 'POST', body: { url: image_url, caption: caption || '', published: true } });
            return { ok: true, id: r.post_id || r.id };
        }
        const body = { message: caption || '' };
        if (link) body.link = link;
        const r = await graph(`/${pid}/feed`, { token, method: 'POST', body });
        return { ok: true, id: r.id };
    } catch (e) { return { error: e.message || String(e) }; }
}

// --- Instagram (2-step: create container → publish). Requires image_url. ---
async function postInstagram(cfg, { caption, image_url }) {
    if (!cfg.ig_user_id) return { error: 'Instagram belum dilink ke Page (set ig_user_id)' };
    if (!cfg.page_access_token) return { error: 'token tiada' };
    if (!image_url) return { error: 'IG perlu gambar (image_url)' };
    const token = cfg.page_access_token, ig = encodeURIComponent(cfg.ig_user_id);
    try {
        const c = await graph(`/${ig}/media`, { token, method: 'POST', body: { image_url, caption: caption || '' } });
        if (!c || !c.id) return { error: 'gagal cipta media IG' };
        const pub = await graph(`/${ig}/media_publish`, { token, method: 'POST', body: { creation_id: c.id } });
        return { ok: true, id: pub.id };
    } catch (e) { return { error: e.message || String(e) }; }
}

// --- Threads (2-step, separate token) ---
async function postThreads(cfg, { caption, image_url }) {
    if (!cfg.threads_access_token || !cfg.threads_user_id) return { error: 'Threads belum disambung (perlu token Threads)' };
    const token = cfg.threads_access_token, tu = encodeURIComponent(cfg.threads_user_id);
    try {
        const body = image_url
            ? { media_type: 'IMAGE', image_url, text: caption || '' }
            : { media_type: 'TEXT', text: caption || '' };
        // Threads uses graph.threads.net; graph() points at graph.facebook.com, so call directly here.
        const base = 'https://graph.threads.net/v1.0';
        const q = new URLSearchParams(Object.assign({ access_token: token }, body));
        const cr = await fetch(`${base}/${tu}/threads?${q.toString()}`, { method: 'POST' }).then(r => r.json());
        if (!cr || !cr.id) return { error: (cr && cr.error && cr.error.message) || 'gagal cipta Threads' };
        const pub = await fetch(`${base}/${tu}/threads_publish?creation_id=${cr.id}&access_token=${encodeURIComponent(token)}`, { method: 'POST' }).then(r => r.json());
        return pub && pub.id ? { ok: true, id: pub.id } : { error: (pub && pub.error && pub.error.message) || 'gagal publish Threads' };
    } catch (e) { return { error: e.message || String(e) }; }
}

exports.handler = async (event) => {
    const auth = await requireAuth(event);
    if (!auth.ok) return auth.response;
    if (event.httpMethod !== 'POST') return json(405, { error: 'method not allowed' });

    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'bad json' }); }
    const caption = String(body.caption || '').trim();
    const link = body.link ? String(body.link).trim() : '';
    const image_url = body.image_url ? String(body.image_url).trim() : '';
    const targets = Array.isArray(body.targets) && body.targets.length ? body.targets : ['fb'];
    if (!caption && !image_url) return json(400, { error: 'caption atau gambar diperlukan' });

    const cfg = await getMetaConfig();
    if (!cfg) return json(400, { error: 'meta not connected' });

    const results = {};
    if (targets.includes('fb')) results.fb = await postFacebook(cfg, { caption, link, image_url });
    if (targets.includes('ig')) results.ig = await postInstagram(cfg, { caption, image_url });
    if (targets.includes('threads')) results.threads = await postThreads(cfg, { caption, image_url });

    const anyOk = Object.values(results).some(r => r && r.ok);

    // Log to marketing_content (best-effort).
    try {
        const who = (auth.user && (auth.user.email || auth.user.id)) || 'staff';
        await sb('POST', '/marketing_content', {
            title: caption.slice(0, 80) || '(gambar)',
            caption, link: link || null,
            platforms: targets.join(','),
            content_type: image_url ? 'photo' : 'post',
            status: anyOk ? 'posted' : 'failed',
            product_sku: body.product_sku || null,
            posted_at: anyOk ? new Date().toISOString() : null,
            created_by: who,
            post_refs: results
        }, { Prefer: 'return=minimal' });
    } catch (e) { /* logging is non-fatal */ }

    return json(200, { ok: anyOk, results });
};
