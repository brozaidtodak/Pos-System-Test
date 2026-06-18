/* 10 CAMP — landing analytics (p1_838)
   Config-driven + GATED to public landing visitors only (skip staff back office).
   Isi ID dalam window.__ANALYTICS (index.html). Kosong = OFF (tiada pixel dimuat).
   Loads: GA4 + Meta Pixel + TikTok Pixel. Adds UTM + click events on outbound
   marketplace/WhatsApp links so we can attribute landing -> Shopee/TikTok/walk-in. */
(function () {
  var A = window.__ANALYTICS || {};

  // --- Gate: public landing only -------------------------------------------
  // Staff back office = #staff deep-link / body.pos-app-scoped / #posAppLayout shown / currentUser set.
  function isPublicLanding() {
    try {
      if ((location.hash || '').toLowerCase().indexOf('staff') !== -1) return false;
      if (document.body && document.body.classList.contains('pos-app-scoped')) return false;
      if (window.currentUser) return false;
      var pos = document.getElementById('posAppLayout');
      if (pos) {
        var disp = pos.style.display || (window.getComputedStyle ? getComputedStyle(pos).display : '');
        if (disp && disp !== 'none') return false;
      }
      return true;
    } catch (e) { return true; }
  }
  if (!isPublicLanding()) return;

  // --- GA4 ------------------------------------------------------------------
  if (A.ga4) {
    var g = document.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtag/js?id=' + A.ga4;
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', A.ga4);
  }

  // --- Meta (Facebook) Pixel ------------------------------------------------
  if (A.metaPixel) {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', A.metaPixel);
    fbq('track', 'PageView');
  }

  // --- TikTok Pixel ---------------------------------------------------------
  if (A.tiktokPixel) {
    !function (w, d, t) {
      w.TiktokAnalyticsObject = t; var ttq = w[t] = w[t] || [];
      ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie'];
      ttq.setAndDefer = function (e, n) { e[n] = function () { e.push([n].concat(Array.prototype.slice.call(arguments, 0))); }; };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (e) { for (var n = ttq._i[e] || [], i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(n, ttq.methods[i]); return n; };
      ttq.load = function (e, n) {
        var r = 'https://analytics.tiktok.com/i18n/pixel/events.js'; ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r;
        ttq._t = ttq._t || {}; ttq._t[e] = +new Date(); ttq._o = ttq._o || {}; ttq._o[e] = n || {};
        var o = d.createElement('script'); o.type = 'text/javascript'; o.async = !0; o.src = r + '?sdkid=' + e + '&lib=' + t;
        var a = d.getElementsByTagName('script')[0]; a.parentNode.insertBefore(o, a);
      };
      ttq.load(A.tiktokPixel); ttq.page();
    }(window, document, 'ttq');
  }

  // --- Unified event helper -------------------------------------------------
  window.__track = function (name, params) {
    params = params || {};
    try { if (window.gtag) gtag('event', name, params); } catch (e) {}
    try { if (window.fbq) fbq('trackCustom', name, params); } catch (e) {}
    try { if (window.ttq) ttq.track(name, params); } catch (e) {}
  };

  // --- Outbound attribution: UTM + click events -----------------------------
  // Catch every outbound marketplace/WhatsApp link (static or app-generated),
  // tag it with UTM just-in-time, and fire a conversion-intent event.
  document.addEventListener('click', function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href') || '';
    var dest = /shopee\./i.test(href) ? 'shopee'
             : /tiktok\./i.test(href) ? 'tiktok'
             : /(wa\.me|api\.whatsapp|whatsapp\.com)/i.test(href) ? 'whatsapp'
             : null;
    if (!dest) return;
    if (/^https?:/i.test(href) && href.indexOf('utm_source=') === -1) {
      var sep = href.indexOf('?') === -1 ? '?' : '&';
      a.setAttribute('href', href + sep + 'utm_source=10camp.com&utm_medium=landing&utm_campaign=site&utm_content=' + dest);
    }
    if (window.__track) window.__track('outbound_' + dest, { destination: dest, link_url: a.href });
  }, true);
})();
