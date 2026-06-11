/**
 * token-watchdog-background.js — Integration hardening #5 (p1_638).
 *
 * Marketplace tokens die silently: TikTok/Shopee access tokens auto-refresh, but if
 * the refresh ever FAILS (revoked auth, API error, crons stopped) the sync goes dark
 * with no warning. Worse — Shopee's refresh token only lives 30 days (rolling); if syncs
 * stop for a month it expires and needs a full manual re-login.
 *
 * This watchdog actively loads each platform token (getValidToken auto-refreshes when
 * near expiry, so a successful call both PROVES the refresh path works AND keeps it warm),
 * then classifies health into ok | warn | critical | dead and writes token_health.
 * Read by the in-POS integration alert card (#3), daily email (#3), and health dashboard (#4).
 *
 * ?mode=peek returns the computed statuses without writing.
 *
 * Status meaning:
 *   dead     — token unloadable, refresh token already expired, or access expired & not refreshing → SYNC IS DOWN
 *   critical — refresh token < 3 days left → must re-authorize NOW (Shopee class)
 *   warn     — refresh token < 7 days, or access expired but recently touched (transient)
 *   ok       — healthy
 */
const tt = require('./_tiktok');
const sp = require('./_shopee');

const HR = 3600 * 1000, DAY = 86400 * 1000;
const round1 = (n) => Math.round(Number(n) * 10) / 10;
const json = (code, obj) => ({ statusCode: code, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj, null, 2) });

// Classify one token. `row` = latest token row (post getValidToken refresh); `loadErr` = error if getValidToken threw.
function classify(platform, row, loadErr, needsReauth) {
    const now = Date.now();
    const accExp = row && row.access_token_expire_at ? new Date(row.access_token_expire_at).getTime() : null;
    const refExp = row && row.refresh_token_expire_at ? new Date(row.refresh_token_expire_at).getTime() : null;
    const updated = row && row.updated_at ? new Date(row.updated_at).getTime() : null;
    const accessHrs = accExp != null ? round1((accExp - now) / HR) : null;
    const refreshDays = refExp != null ? round1((refExp - now) / DAY) : null;
    const updatedHrsAgo = updated != null ? round1((now - updated) / HR) : null;

    let status = 'ok', message;
    if (loadErr) {
        status = 'dead';
        message = `Token tak boleh dimuatkan: ${String(loadErr).slice(0, 120)} — sync ${platform} TERHENTI, kena authorize semula.`;
    } else if (!row) {
        status = 'dead';
        message = `Tiada token ${platform} langsung — kena authorize.`;
    } else if (refExp != null && refExp <= now) {
        status = 'dead';
        message = `Refresh token ${platform} DAH LUPUT — wajib login semula di ${needsReauth}.`;
    } else if (accExp != null && (accExp - now) < -2 * HR && (updatedHrsAgo == null || updatedHrsAgo > 6)) {
        status = 'dead';
        message = `Access token ${platform} expired${updatedHrsAgo != null ? ` & tak refresh sejak ${updatedHrsAgo}j` : ''} — auto-refresh ROSAK, sync mungkin dah mati.`;
    } else if (refreshDays != null && refreshDays < 3) {
        status = 'critical';
        message = `Refresh token ${platform} tinggal ${refreshDays} hari — LOGIN SEMULA di ${needsReauth} sebelum luput, kalau tak sync mati.`;
    } else if (refreshDays != null && refreshDays < 7) {
        status = 'warn';
        message = `Refresh token ${platform} tinggal ${refreshDays} hari — rancang login semula.`;
    } else if (accExp != null && (accExp - now) < -2 * HR) {
        status = 'warn';
        message = `Access token ${platform} expired (${Math.abs(accessHrs)}j lalu) tapi baru di-update ${updatedHrsAgo}j — tunggu cron refresh.`;
    } else {
        const refTxt = (refreshDays != null && refreshDays < 3650) ? `, refresh ${refreshDays} hari` : '';
        message = `Sihat — access ${accessHrs != null ? accessHrs + 'j' : '?'}${refTxt}.`;
    }
    return { platform, status, access_expire_at: row ? row.access_token_expire_at : null, refresh_expire_at: row ? row.refresh_token_expire_at : null, access_hrs_left: accessHrs, refresh_days_left: refreshDays, message };
}

async function checkTiktok() {
    let loadErr = null;
    try { await tt.getValidToken(); } catch (e) { loadErr = e && e.message ? e.message : String(e); }
    const rows = await tt.sb('GET', '/tiktok_tokens?order=created_at.desc&limit=1');
    return classify('TikTok', rows && rows[0], loadErr, 'TikTok Seller Center');
}

async function checkShopee() {
    let loadErr = null;
    try { await sp.getValidToken(); } catch (e) { loadErr = e && e.message ? e.message : String(e); }
    // Only the LIVE token matters in production; ignore sandbox.
    const rows = await tt.sb('GET', "/shopee_tokens?environment=eq.live&order=created_at.desc&limit=1");
    return classify('Shopee', rows && rows[0], loadErr, 'Shopee Open Platform');
}

async function writeHealth(results, now) {
    const rows = results.map(r => Object.assign({}, r, { checked_at: now }));
    // upsert by platform
    await tt.sb('POST', '/token_health?on_conflict=platform', rows, { Prefer: 'resolution=merge-duplicates,return=minimal' });
}

exports.handler = async (event) => {
    const mode = (event && event.queryStringParameters && event.queryStringParameters.mode) || 'sync';
    const now = new Date().toISOString();
    const results = [];
    for (const fn of [checkTiktok, checkShopee]) {
        try { results.push(await fn()); }
        catch (e) { results.push({ platform: fn === checkTiktok ? 'TikTok' : 'Shopee', status: 'dead', message: `Watchdog error: ${String(e).slice(0, 120)}`, access_hrs_left: null, refresh_days_left: null, access_expire_at: null, refresh_expire_at: null }); }
    }
    if (mode === 'peek') return json(200, { mode, checked_at: now, results });
    await writeHealth(results, now);
    return json(200, { checked_at: now, results: results.map(r => ({ platform: r.platform, status: r.status, message: r.message })) });
};
