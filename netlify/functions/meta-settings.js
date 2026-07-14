/**
 * meta-settings.js — save / read Meta (FB+IG) Graph API config (p1_1078).
 *
 *   GET   → connection STATUS only (never returns the access token).
 *           { connected, page_id, page_name, ig_user_id, business_id, has_token, token_updated_at }
 *   POST  → save config. Body: { page_id?, page_access_token?, ig_user_id?, business_id?, page_name? }
 *           Validates the token against Graph /me before saving; resolves page_name if page_id given.
 *
 * Gated by requireAuth (staff session). The token is write-only from the browser's POV:
 * it goes IN via POST but never comes back OUT via GET.
 *
 * Public URL: /.netlify/functions/meta-settings
 */
const { getMetaConfig, saveMetaConfig, graph } = require('./_meta');
const { requireAuth } = require('./_auth');

const APP_ID     = process.env.META_APP_ID || '2083582475704447';
const APP_SECRET = process.env.META_APP_SECRET || '';

// Turn a short-lived user token (from Graph API Explorer) into a NON-EXPIRING page token.
// Requires META_APP_SECRET in env. No Business-portfolio / System-User needed — works because
// the signed-in user is a Page admin. Returns { page_id, page_name, page_access_token } or throws.
async function exchangeUserTokenToPageToken(userToken, wantPageId) {
    if (!APP_SECRET) { const e = new Error('META_APP_SECRET not set in Netlify env'); e.code = 'no_secret'; throw e; }
    // 1) short-lived user token → long-lived user token (~60 days)
    const ll = await graph('/oauth/access_token', {
        query: { grant_type: 'fb_exchange_token', client_id: APP_ID, client_secret: APP_SECRET, fb_exchange_token: userToken }
    });
    const longUser = ll && ll.access_token;
    if (!longUser) throw new Error('exchange failed (no long-lived user token)');
    // 2) list pages the user manages → page token derived from a long-lived user token DOES NOT expire
    const accts = await graph('/me/accounts', { token: longUser, query: { fields: 'id,name,access_token' } });
    const pages = (accts && accts.data) || [];
    if (!pages.length) throw new Error('no pages found for this user');
    const chosen = wantPageId ? (pages.find(p => String(p.id) === String(wantPageId)) || pages[0]) : pages[0];
    return { page_id: chosen.id, page_name: chosen.name, page_access_token: chosen.access_token };
}

function json(code, obj) {
    return { statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj, null, 2) };
}

exports.handler = async (event) => {
    const auth = await requireAuth(event);
    if (!auth.ok) return auth.response;

    try {
        if (event.httpMethod === 'GET') {
            const cfg = await getMetaConfig();
            if (!cfg) return json(200, { connected: false, has_token: false });
            return json(200, {
                connected: !!cfg.page_access_token,
                has_token: !!cfg.page_access_token,
                page_id: cfg.page_id || null,
                page_name: cfg.page_name || null,
                ig_user_id: cfg.ig_user_id || null,
                business_id: cfg.business_id || null,
                token_updated_at: cfg.token_updated_at || null,
                updated_by: cfg.updated_by || null
            });
        }

        if (event.httpMethod === 'POST') {
            let body = {};
            try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'bad json' }); }

            // p1_1081 — exchange path: paste a short-lived USER token → server mints a non-expiring PAGE token.
            // Sidesteps the Business-portfolio / System-User flow entirely (works because signed-in user is Page admin).
            if (body.exchange_user_token) {
                const existing = await getMetaConfig();
                let got;
                try {
                    got = await exchangeUserTokenToPageToken(String(body.exchange_user_token).trim(), body.page_id || (existing && existing.page_id));
                } catch (e) {
                    return json(400, { error: e.code === 'no_secret' ? 'no_app_secret' : 'exchange_failed', detail: e.message || String(e) });
                }
                const saved = await saveMetaConfig({
                    page_id: got.page_id, page_name: got.page_name, page_access_token: got.page_access_token,
                    ig_user_id: body.ig_user_id || (existing && existing.ig_user_id) || null
                }, (auth.user && (auth.user.email || auth.user.id)) || 'staff');
                const row = Array.isArray(saved) ? saved[0] : saved;
                // Auto-subscribe the page to this app's webhook — /{page}/subscribed_apps starts EMPTY
                // for a new page/token pairing and nothing else in the setup creates it (9 Jul punca #1).
                let webhookSubscribed = false, webhookError = null;
                try {
                    const sub = await graph(`/${got.page_id}/subscribed_apps`, {
                        token: got.page_access_token, method: 'POST',
                        query: { subscribed_fields: 'messages,messaging_postbacks' }
                    });
                    webhookSubscribed = !!(sub && sub.success);
                } catch (e) { webhookError = e.message || String(e); }
                return json(200, { ok: true, connected: true, permanent: true, page_id: row && row.page_id, page_name: row && row.page_name, webhook_subscribed: webhookSubscribed, webhook_error: webhookError });
            }

            const patch = {};
            ['page_id', 'ig_user_id', 'business_id', 'page_name'].forEach(k => {
                if (body[k] != null && String(body[k]).trim() !== '') patch[k] = String(body[k]).trim();
            });

            const token = body.page_access_token != null ? String(body.page_access_token).trim() : '';
            if (token) {
                // Validate before saving so we never store a dead token.
                let me;
                try {
                    me = await graph('/me', { token, query: { fields: 'id,name' } });
                } catch (e) {
                    return json(400, { error: 'token_invalid', detail: e.message || String(e) });
                }
                patch.page_access_token = token;
                // If caller didn't pass a page name but /me returned one (page token → page identity), keep it.
                if (!patch.page_name && me && me.name) patch.page_name = me.name;
                if (!patch.page_id && me && me.id) patch.page_id = me.id;
            }

            if (!Object.keys(patch).length) return json(400, { error: 'nothing to save' });

            const saved = await saveMetaConfig(patch, (auth.user && (auth.user.email || auth.user.id)) || 'staff');
            const row = Array.isArray(saved) ? saved[0] : saved;
            return json(200, {
                ok: true,
                connected: !!(row && row.page_access_token),
                page_id: row && row.page_id || null,
                page_name: row && row.page_name || null,
                ig_user_id: row && row.ig_user_id || null
            });
        }

        return json(405, { error: 'method not allowed' });
    } catch (e) {
        return json(500, { error: String(e && e.message || e) });
    }
};
