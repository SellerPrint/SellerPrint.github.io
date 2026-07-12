/**
 * smart-ads.js — Publicités ciblées SANS API, 100% navigateur
 * SellerPrint — github.io
 *
 * INSTALLATION :
 *   1. Charger products.js AVANT ce fichier (ce module lit window.products)
 *   2. Dans chaque page HTML, ajouter avant </body> :
 *        <script src="products.js"></script>
 *        <script src="affiliate-config.js"></script>
 *        <div id="smart-ads-zone"></div>
 *        <script src="smart-ads.js"></script>
 *
 * Les publicités s'affichent TOUJOURS, quel que soit le choix cookies.
 *
 * CORRECTIF (voir audit) :
 * Ce fichier contenait auparavant son PROPRE catalogue de 21 produits
 * fictifs (le commentaire disait littéralement "Remplace les `id` par de
 * vrais IDs AliExpress" — jamais fait), avec un lien affilié construit
 * SANS encodeURIComponent (format non conforme, à risque de ne pas être
 * suivi par Admitad). Ce catalogue séparé pouvait diverger silencieusement
 * du vrai catalogue affiché sur la page (products.js) et n'affichait
 * d'ailleurs aucune vraie image produit (juste un emoji).
 * Il utilise maintenant EXACTEMENT le même catalogue que le reste du site
 * (window.products) et la même construction d'URL affiliée que index.html.
 */

(function () {
  "use strict";

  /* ─────────────────────────────────────────────
   * CONFIGURATION
   * ───────────────────────────────────────────── */
  var CONFIG = {
    ADS_COUNT: 4,
    CONTAINER_ID: "smart-ads-zone",
    CACHE_TTL: 900, // 15 min
  };

  // Source unique de vérité : window.SP_AFFILIATE_CONFIG (affiliate-config.js).
  // Fallback identique à la valeur de affiliate-config.json si le fichier
  // n'est pas chargé sur la page (mieux vaut une valeur cohérente que rien).
  var AFFILIATE_CONFIG = window.SP_AFFILIATE_CONFIG || {
    admitadBase: "https://rzekl.com/c/1e8d114494ffc29cecab16525dc3e8/?ulp=",
    aliexpressBase: "https://www.aliexpress.com/item/",
  };

  function buildAffiliateUrl(productId) {
    var aliUrl = AFFILIATE_CONFIG.aliexpressBase + productId + ".html";
    return AFFILIATE_CONFIG.admitadBase + encodeURIComponent(aliUrl);
  }

  var CAT_LABELS = { textile: "Textile", deco: "Déco", accessoire: "Accessoires" };
  var CAT_COLORS = { textile: "#D4537E", deco: "#BA7517", accessoire: "#7F77DD" };

  /* ─────────────────────────────────────────────
   * ALGORITHME DE SCORING LOCAL (sans API)
   * Mêmes 3 catégories que le reste du site (textile/deco/accessoire),
   * pour rester cohérent avec la personnalisation déjà faite dans index.html.
   * ───────────────────────────────────────────── */
  function computeScores() {
    var scores = { textile: 3, deco: 3, accessoire: 3 };

    var ref = (document.referrer || "").toLowerCase();
    if (ref.includes("tiktok") || ref.includes("instagram")) { scores.textile += 2; scores.accessoire += 1; }
    if (ref.includes("pinterest")) { scores.deco += 3; }
    if (ref.includes("google"))    { scores.deco += 1; scores.accessoire += 1; }

    var h = new Date().getHours();
    if (h >= 18 && h < 23) scores.textile += 1;
    if (h >= 9 && h < 18) scores.accessoire += 1;
    if (h >= 23 || h < 7) scores.deco += 1;

    var mobile = /Mobi|Android/i.test(navigator.userAgent);
    if (mobile) scores.textile += 1; else scores.deco += 1;

    // Historique de clics partagé avec index.html ("sp_history")
    try {
      var hist = JSON.parse(localStorage.getItem("sp_history") || "[]");
      var map = { impression: "accessoire", mode: "textile", tech: "accessoire", maison: "deco", sport: "accessoire", beaute: "textile" };
      hist.forEach(function (c) {
        var mapped = map[c] || c;
        if (scores[mapped] !== undefined) scores[mapped] += 2;
      });
    } catch (_) {}

    return scores;
  }

  /* ─────────────────────────────────────────────
   * SÉLECTION DES PRODUITS — depuis window.products (catalogue réel)
   * ───────────────────────────────────────────── */
  function selectProducts(scores, count) {
    var pool = (window.products || []).slice();
    if (!pool.length) return [];

    var sorted = pool.slice().sort(function (a, b) {
      return (scores[b.cat] || 0) - (scores[a.cat] || 0);
    });
    return sorted.slice(0, count);
  }

  /* ─────────────────────────────────────────────
   * CACHE localStorage
   * ───────────────────────────────────────────── */
  function getCached() {
    try {
      var raw = localStorage.getItem("sp_ads_cache");
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (Date.now() / 1000 - obj.ts > CONFIG.CACHE_TTL) return null;
      return obj.ids
        .map(function (id) { return (window.products || []).find(function (p) { return p.id === id; }); })
        .filter(Boolean);
    } catch (_) { return null; }
  }

  function setCache(products) {
    try {
      localStorage.setItem("sp_ads_cache", JSON.stringify({
        ts: Math.floor(Date.now() / 1000), ids: products.map(function (p) { return p.id; }),
      }));
    } catch (_) {}
  }

  /* ─────────────────────────────────────────────
   * STYLES CSS
   * ───────────────────────────────────────────── */
  function injectStyles() {
    if (document.getElementById("sp-smart-ads-css")) return;
    var s = document.createElement("style");
    s.id = "sp-smart-ads-css";
    s.textContent =
      ".sp-ads-wrap{margin:1.8rem 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}" +
      ".sp-ads-label{font-size:10.5px;color:#aaa;text-transform:uppercase;letter-spacing:.08em;margin-bottom:10px}" +
      ".sp-ads-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:11px}" +
      ".sp-ad{display:block;text-decoration:none;background:#fff;border:1px solid #eee;border-radius:10px;overflow:hidden;transition:transform .15s,box-shadow .15s,border-color .15s}" +
      ".sp-ad:hover{transform:translateY(-2px);box-shadow:0 5px 18px rgba(0,0,0,.09)}" +
      ".sp-ad-img{height:125px;background:#f6f6f6;position:relative;overflow:hidden}" +
      ".sp-ad-img img{width:100%;height:100%;object-fit:cover;display:block}" +
      ".sp-ad-badge{position:absolute;top:7px;left:7px;font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px}" +
      ".sp-ad-body{padding:9px 11px 11px}" +
      ".sp-ad-name{font-size:12.5px;font-weight:600;color:#111;line-height:1.35;margin-bottom:3px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}" +
      ".sp-ad-desc{font-size:11px;color:#999;margin-bottom:7px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical}" +
      ".sp-ad-cta{font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:3px}" +
      "@media(max-width:480px){.sp-ads-grid{grid-template-columns:repeat(2,1fr)}}";
    document.head.appendChild(s);
  }

  /* ─────────────────────────────────────────────
   * RENDU HTML
   * ───────────────────────────────────────────── */
  function renderAds(products) {
    var container = document.getElementById(CONFIG.CONTAINER_ID);
    if (!container) return;
    if (!products.length) { container.innerHTML = ""; return; }
    injectStyles();

    var html = '<div class="sp-ads-wrap"><div class="sp-ads-label">Produits recommandés pour vous</div><div class="sp-ads-grid">';

    products.forEach(function (p) {
      var color = CAT_COLORS[p.cat] || "#555";
      var label = CAT_LABELS[p.cat] || p.cat;
      var href = buildAffiliateUrl(p.id);

      html += '<a class="sp-ad" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer sponsored"'
            + ' style="border-color:' + color + '22"'
            + ' onmouseover="this.style.borderColor=\'' + color + '\'"'
            + ' onmouseout="this.style.borderColor=\'' + color + '22\'"'
            + ' onclick="spAdClick(\'' + esc(p.cat) + '\')">'
            + '<div class="sp-ad-img">'
            + '<img src="' + esc(p.img) + '" alt="' + esc(p.name) + '" loading="lazy" onerror="this.closest(\'.sp-ad\').remove()">'
            + '<span class="sp-ad-badge" style="background:' + color + '22;color:' + color + '">' + esc(label) + '</span>'
            + '</div>'
            + '<div class="sp-ad-body">'
            + '<div class="sp-ad-name">' + esc(p.name) + '</div>'
            + '<div class="sp-ad-desc">' + esc(p.desc) + '</div>'
            + '<span class="sp-ad-cta" style="color:' + color + '">Voir l\'offre ↗</span>'
            + '</div></a>';
    });

    html += '</div></div>';
    container.innerHTML = html;
  }

  function esc(str) {
    return String(str)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  /* ─────────────────────────────────────────────
   * TRACKER DE CLICS (améliore le ciblage futur)
   * ───────────────────────────────────────────── */
  window.spAdClick = function (cat) {
    try {
      var hist = JSON.parse(localStorage.getItem("sp_history") || "[]");
      hist.push(cat);
      localStorage.setItem("sp_history", JSON.stringify(hist.slice(-30)));
      localStorage.removeItem("sp_ads_cache");
    } catch (_) {}
  };

  /* ─────────────────────────────────────────────
   * INIT — s'exécute immédiatement, sans condition
   * ───────────────────────────────────────────── */
  function init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
      return;
    }
    if (!window.products || !window.products.length) {
      // products.js pas chargé sur cette page : on ne peut rien afficher
      // de fiable, mieux vaut ne rien afficher que d'inventer des produits.
      return;
    }
    var cached = getCached();
    if (cached && cached.length) { renderAds(cached); return; }
    var scores   = computeScores();
    var products = selectProducts(scores, CONFIG.ADS_COUNT);
    setCache(products);
    renderAds(products);
  }

  /* API publique (optionnelle, pour usage futur) */
  window.SmartAds = {
    refresh: function () {
      localStorage.removeItem("sp_ads_cache");
      init();
    },
  };

  init();
})();
