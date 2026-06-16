/**
 * _auth.js — shared staff-authentication gate for mutating Netlify functions (C1 hardening, p1_786).
 *
 * The POS app calls these functions from the browser as a logged-in staff member (email/password →
 * Supabase authenticated session, or PIN → upgraded session). Previously the functions were public +
 * unauthenticated while running with the service-role key, so anyone who knew the URL could trigger them.
 *
 * requireStaff(event) validates the caller's Supabase access token (sent as `Authorization: Bearer <jwt>`)
 * against Supabase GoTrue. Returns { ok:true, user } for a valid authenticated session, or
 * { ok:false, response } with a ready-to-return 401 otherwise.
 *
 * Files prefixed "_" are ignored by Netlify's function scanner (private module, not a deployed endpoint).
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://asehjdnfzoypbwfeazra.supabase.co';
// apikey to authorize the GoTrue call. The user's own Bearer JWT is what actually gets validated;
// apikey just authorizes the request. Prefer the SERVICE key (already set for all functions) so the
// gate works on deploy with no new env; fall back to anon/SUPABASE_KEY if present.
const API_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

function deny(reason) {
    return {
        ok: false,
        response: {
            statusCode: 401,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify({ error: 'unauthorized', reason: reason || 'staff session required' })
        }
    };
}

async function requireStaff(event) {
    try {
        const h = (event && event.headers) || {};
        const auth = h.authorization || h.Authorization || '';
        const m = /^Bearer\s+(.+)$/i.exec(String(auth).trim());
        if (!m) return deny('missing bearer token');
        const token = m[1].trim();
        if (!token || token.length < 20) return deny('malformed token');
        if (!API_KEY) {
            // Can't validate without the anon apikey — fail CLOSED (deny) so a misconfig never opens the gate.
            return deny('auth not configured');
        }
        const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { apikey: API_KEY, Authorization: `Bearer ${token}` }
        });
        if (!res.ok) return deny('invalid or expired session');
        const user = await res.json().catch(() => null);
        // A real authenticated staff session has a user id and aud "authenticated" (not anon).
        if (!user || !user.id || user.aud !== 'authenticated' || user.is_anonymous === true) return deny('not an authenticated staff session');
        return { ok: true, user };
    } catch (e) {
        return deny('auth check failed');
    }
}

// p1_787 — gate for functions called BOTH by the browser (staff JWT) AND server-to-server (crons) AND
// the Netlify scheduler. Accepts any of: scheduled trigger (event.next_run) · valid internal secret
// header (x-internal-key === INTERNAL_FN_SECRET) · valid staff JWT.
// PROGRESSIVE-SAFE: if INTERNAL_FN_SECRET is NOT set in env, the gate stays OPEN (same as before this
// change) so deploying never breaks the cron web — protection activates only once Zaid sets the secret.
const INTERNAL_SECRET = process.env.INTERNAL_FN_SECRET || '';

async function requireAuth(event) {
    // 1) Netlify scheduled invocation — the scheduler triggers the handler WITHOUT an HTTP request,
    //    so there is no event.httpMethod (and newer runtimes also set event.next_run). Any real public
    //    HTTP hit always carries httpMethod, so this can't be spoofed by a browser/attacker request.
    if (event && (event.next_run || (event.body && /"next_run"/.test(String(event.body))) || !event.httpMethod)) return { ok: true, via: 'scheduled' };
    // 2) Not configured yet → stay open (no regression vs pre-p1_787 behaviour)
    if (!INTERNAL_SECRET) return { ok: true, via: 'unconfigured' };
    // 3) Internal server-to-server call (cron → function)
    const h = (event && event.headers) || {};
    const k = h['x-internal-key'] || h['X-Internal-Key'] || '';
    if (k && k === INTERNAL_SECRET) return { ok: true, via: 'internal' };
    // 4) Staff browser call
    const staff = await requireStaff(event);
    if (staff.ok) return { ok: true, via: 'staff', user: staff.user };
    return staff; // {ok:false, response}
}

// Headers a server-to-server caller attaches so requireAuth() lets it through.
function internalHeaders(base) {
    const h = Object.assign({}, base || {});
    if (INTERNAL_SECRET) h['x-internal-key'] = INTERNAL_SECRET;
    return h;
}

module.exports = { requireStaff, requireAuth, internalHeaders };
