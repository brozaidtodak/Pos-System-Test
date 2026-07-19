/**
 * landing-theme.js — pemuat tema landing dari Makmal Design (p1_1121, Fasa 3).
 *
 * Aliran:
 *  1. Baca cache localStorage (lpTheme_v1) SEGERA — elak kelip (flash) tema.
 *  2. Fetch tema AKTIF dari design_themes (anon, baca sahaja) di latar; simpan cache.
 *  3. slug 'klasik-bronze' = rupa asal → TIADA var diset (fallback CSS pegang).
 *  4. Jaring keselamatan: nisbah kontras teks/bg < 3 → JANGAN apply, kekal default.
 *
 * Skop: hanya var --lp-* pada .lp-root (landing + Preview Mode — DOM sama).
 * POS (data-theme) tidak disentuh.
 */
(function () {
  var REST = 'https://asehjdnfzoypbwfeazra.supabase.co/rest/v1/design_themes';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzZWhqZG5mem95cGJ3ZmVhenJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2MjE2NjMsImV4cCI6MjA5MTE5NzY2M30.34nAhmcNO_xN73OdsyxayKl_jipIk-M8DIBgibAOdaI';
  var KEY = 'lpTheme_v1';

  function lum(hex) {
    try {
      var h = hex.replace('#', '');
      var r = parseInt(h.substr(0, 2), 16) / 255, g = parseInt(h.substr(2, 2), 16) / 255, b = parseInt(h.substr(4, 2), 16) / 255;
      var f = function (c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    } catch (e) { return null; }
  }
  function contrast(a, b) {
    var la = lum(a), lb = lum(b);
    if (la == null || lb == null) return 21;
    var hi = Math.max(la, lb), lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  }

  // p1_1122 — campur 2 warna hex (utk jana skala primary POS dari satu aksen)
  function mix(hex, hex2, w) {
    try {
      var a = hex.replace('#', ''), b = hex2.replace('#', '');
      var out = '#';
      for (var i = 0; i < 3; i++) {
        var ca = parseInt(a.substr(i * 2, 2), 16), cb = parseInt(b.substr(i * 2, 2), 16);
        out += ('0' + Math.round(ca * (1 - w) + cb * w).toString(16)).slice(-2);
      }
      return out;
    } catch (e) { return hex; }
  }
  function rgb(hex) {
    var h = hex.replace('#', '');
    return parseInt(h.substr(0, 2), 16) + ',' + parseInt(h.substr(2, 2), 16) + ',' + parseInt(h.substr(4, 2), 16);
  }

  function apply(theme) {
    var root = document.documentElement;
    var VARS = ['--lp-accent', '--lp-accent-2', '--lp-accent-text', '--lp-ink', '--lp-ink-2', '--lp-bg', '--lp-bg-warm', '--lp-surface', '--lp-muted', '--lp-muted-2', '--lp-line', '--lp-font-display', '--lp-font-body', '--lp-radius-btn', '--lp-radius-card'];
    // p1_1122 — POS + app ikut Makmal: skala primary penuh + font-main
    var POSV = ['--primary-50', '--primary-100', '--primary-200', '--primary-300', '--primary-400', '--primary-500', '--primary-600', '--primary-700', '--primary-800', '--primary-900', '--primary-rgb', '--primary', '--font-main'];
    if (!theme || theme.slug === 'klasik-bronze') {
      VARS.forEach(function (v) { root.style.removeProperty(v); });
      POSV.forEach(function (v) { root.style.removeProperty(v); });
      return;
    }
    var t = theme.tokens || {};
    // Jaring: teks mesti boleh baca atas latar & atas permukaan
    if (contrast(t.text, t.bg) < 3 || contrast(t.text, t.surface || t.bg) < 3) {
      try { console.warn('[landing-theme] kontras gagal — kekal tema asal'); } catch (e) {}
      return;
    }
    var set = function (k, v) { if (v) root.style.setProperty(k, v); };
    set('--lp-accent', t.accent);
    set('--lp-accent-2', t.accent);
    set('--lp-accent-text', t.accentText);
    set('--lp-ink', t.text);
    set('--lp-ink-2', t.text);
    set('--lp-bg', t.bg);
    set('--lp-bg-warm', t.bg);
    set('--lp-surface', t.surface);
    set('--lp-muted', t.muted);
    set('--lp-muted-2', t.muted);
    set('--lp-line', t.line);
    if (t.fontDisplay) set('--lp-font-display', "'" + t.fontDisplay + "', sans-serif");
    if (t.fontBody) set('--lp-font-body', "'" + t.fontBody + "', sans-serif");
    if (t.radiusBtn != null) set('--lp-radius-btn', (t.radiusBtn >= 999 ? '999px' : t.radiusBtn + 'px'));
    if (t.radiusCard != null) set('--lp-radius-card', t.radiusCard + 'px');
    // p1_1122 — POS (back office) + app mobile ikut tema Makmal:
    // skala --primary-* dijana dari aksen (inline pada <html> menang atas data-theme).
    if (t.accent) {
      set('--primary-500', t.accent);
      set('--primary-600', mix(t.accent, '#000000', 0.12));
      set('--primary-700', mix(t.accent, '#000000', 0.24));
      set('--primary-800', mix(t.accent, '#000000', 0.42));
      set('--primary-900', mix(t.accent, '#000000', 0.58));
      set('--primary-400', mix(t.accent, '#FFFFFF', 0.18));
      set('--primary-300', mix(t.accent, '#FFFFFF', 0.38));
      set('--primary-200', mix(t.accent, '#FFFFFF', 0.62));
      set('--primary-100', mix(t.accent, '#FFFFFF', 0.80));
      set('--primary-50', mix(t.accent, '#FFFFFF', 0.92));
      set('--primary-rgb', rgb(t.accent));
      set('--primary', t.accent);
    }
    if (t.fontBody) set('--font-main', "'" + t.fontBody + "'");
    // muat font Google kalau bukan font sedia ada
    var need = [t.fontDisplay, t.fontBody].filter(function (f) { return f && f !== 'Poppins' && f !== 'inherit'; });
    if (need.length && !document.getElementById('lpThemeFonts')) {
      var link = document.createElement('link');
      link.id = 'lpThemeFonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?' + need.map(function (f) {
        return 'family=' + encodeURIComponent(f).replace(/%20/g, '+') + ':wght@400;600;700;800';
      }).join('&') + '&display=swap';
      document.head.appendChild(link);
    }
  }

  // 1. Cache dulu (tiada kelip)
  var cached = null;
  try { cached = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (cached) apply(cached);

  // 2. Fetch aktif di latar
  try {
    fetch(REST + '?status=eq.aktif&select=slug,tokens,version&order=version.desc&limit=1', {
      headers: { apikey: ANON, Authorization: 'Bearer ' + ANON }
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (rows) {
      var t = rows && rows[0] ? rows[0] : null;
      if (!t) return;
      try { localStorage.setItem(KEY, JSON.stringify(t)); } catch (e) {}
      if (!cached || cached.slug !== t.slug || cached.version !== t.version) apply(t);
    }).catch(function () { /* offline → kekal cache/default */ });
  } catch (e) {}
})();
