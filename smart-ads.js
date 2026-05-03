/**
 * smart-ads.js — Publicités ciblées SANS API, 100% navigateur
 * SellerPrint — github.io
 *
 * INSTALLATION :
 *   1. Copier ce fichier à la racine du projet
 *   2. Dans chaque page HTML, ajouter avant </body> :
 *        <div id="smart-ads-zone"></div>
 *        <script src="smart-ads.js"></script>
 *
 * Les publicités s'affichent TOUJOURS, quel que soit le choix cookies.
 */

(function () {
  "use strict";

  /* ─────────────────────────────────────────────
   * CONFIGURATION
   * ───────────────────────────────────────────── */
  var CONFIG = {
    AFFILIATE_BASE:
      "https://rzekl.com/g/1e8d114494ffc29cecab16525dc3e8/?ulp=https://www.aliexpress.com/item/",
    ADS_COUNT: 4,
    CONTAINER_ID: "smart-ads-zone",
    CACHE_TTL: 900, // 15 min
  };

  /* ─────────────────────────────────────────────
   * CATALOGUE PRODUITS ALIEXPRESS
   * Remplace les `id` par de vrais IDs AliExpress
   * ───────────────────────────────────────────── */
  var PRODUCTS = {
    impression: [
      { id: "1005006304718293", name: "Mug personnalisé photo",     desc: "Sublimation HD, 350ml" },
      { id: "1005005829374610", name: "Tote bag canvas custom",     desc: "Coton naturel, éco-print" },
      { id: "1005006147392850", name: "Stickers vinyle waterproof", desc: "Découpe précise, pack 50" },
      { id: "1005006512837490", name: "Coussin photo personnalisé", desc: "Housse lavable 45x45cm" },
    ],
    mode: [
      { id: "1005006527382910", name: "T-shirt oversize brodé",   desc: "100% coton premium" },
      { id: "1005005918374628", name: "Hoodie personnalisable",    desc: "Unisexe, impression DTG" },
      { id: "1005006312847591", name: "Casquette snapback custom", desc: "Broderie 3D réglable" },
    ],
    tech: [
      { id: "1005006234781923", name: "Écouteurs TWS sans fil", desc: "ANC, 30h autonomie" },
      { id: "1005005847291034", name: "Montre connectée sport", desc: "GPS, IP68, cardiaque" },
      { id: "1005006198374650", name: "Chargeur rapide 65W",    desc: "Compatible tous appareils" },
    ],
    maison: [
      { id: "1005006123894756", name: "Lampe LED RGB ambiance",       desc: "Contrôle vocal, dimmable" },
      { id: "1005005736182947", name: "Organisateur bureau bois",     desc: "Minimaliste, métal+bois" },
      { id: "1005006047382916", name: "Tableau déco imprimé canvas",  desc: "HD, cadre inclus" },
    ],
    sport: [
      { id: "1005006389274651", name: "Kit résistance fitness",    desc: "5 niveaux, anti-glisse" },
      { id: "1005005624739182", name: "Gourde isotherme 1L",       desc: "Inox 316, froid 24h" },
      { id: "1005006271839450", name: "Tapis yoga antidérapant",   desc: "6mm, TPE écologique" },
    ],
    beaute: [
      { id: "1005006478293016", name: "Sérum vitamine C 30ml",    desc: "Anti-âge, tous types peau" },
      { id: "1005005913826470", name: "Set pinceaux maquillage",   desc: "12 pinceaux pro, vegan" },
    ],
  };

  var CAT_LABELS = {
    impression: "Impression", mode: "Mode", tech: "Tech",
    maison: "Maison", sport: "Sport", beaute: "Beauté",
  };
  var CAT_COLORS = {
    impression: "#7F77DD", mode: "#D4537E", tech: "#378ADD",
    maison: "#BA7517", sport: "#639922", beaute: "#1D9E75",
  };
  var CAT_ICONS = {
    impression: "🖨", mode: "👕", tech: "🎧",
    maison: "🏠", sport: "🏃", beaute: "💄",
  };

  /* ─────────────────────────────────────────────
   * ALGORITHME DE SCORING LOCAL (sans API)
   * ───────────────────────────────────────────── */
  function computeScores() {
    var scores = { impression: 5, mode: 3, tech: 3, maison: 2, sport: 2, beaute: 2 };

    // Référent
    var ref = (document.referrer || "").toLowerCase();
    if (ref.includes("google"))     { scores.impression += 3; scores.mode += 1; }
    if (ref.includes("instagram") || ref.includes("tiktok") || ref.includes("pinterest")) {
      scores.mode += 3; scores.beaute += 2;
    }
    if (ref.includes("youtube"))    { scores.tech += 2; scores.sport += 1; }
    if (ref.includes("facebook"))   { scores.maison += 2; scores.impression += 1; }

    // Heure
    var h = new Date().getHours();
    if (h >= 7  && h < 9)  scores.sport += 2;
    if (h >= 12 && h < 14) scores.maison += 1;
    if (h >= 18 && h < 22) scores.mode += 2;
    if (h >= 22 || h < 1)  scores.tech += 2;

    // Jour (0=dim, 6=sam)
    var day = new Date().getDay();
    if (day === 0 || day === 6) { scores.maison += 2; scores.sport += 1; }
    else                        { scores.tech += 1;   scores.impression += 1; }

    // Langue
    var lang = (navigator.language || "fr").toLowerCase();
    if (lang.startsWith("fr")) scores.impression += 1;
    if (lang.startsWith("en")) scores.tech += 1;

    // Appareil
    var mobile = /Mobi|Android/i.test(navigator.userAgent);
    if (mobile) { scores.mode += 1; scores.beaute += 1; }
    else        { scores.tech += 1; }

    // Historique de clics (apprentissage sans cookies)
    try {
      var hist = JSON.parse(localStorage.getItem("sp_history") || "[]");
      hist.forEach(function (cat) {
        if (scores[cat] !== undefined) scores[cat] += 2;
      });
    } catch (_) {}

    // Page actuelle
    var path = window.location.pathname.toLowerCase();
    if (path.includes("produit") || path.includes("product")) scores.impression += 2;
    if (path.includes("mode")    || path.includes("vetement"))scores.mode += 3;
    if (path.includes("tech"))                                 scores.tech += 3;

    // Indices dans les noms de cookies (lecture non bloquée par le refus RGPD)
    try {
      var ck = document.cookie;
      if (ck.includes("cart") || ck.includes("panier")) scores.impression += 2;
      if (ck.includes("viewed"))                         scores.impression += 1;
    } catch (_) {}

    return scores;
  }

  /* ─────────────────────────────────────────────
   * SÉLECTION DES PRODUITS
   * ───────────────────────────────────────────── */
  function selectProducts(scores, count) {
    var sorted = Object.keys(scores).sort(function (a, b) { return scores[b] - scores[a]; });
    var selected = [], used = {};

    for (var i = 0; i < sorted.length && selected.length < count; i++) {
      var cat = sorted[i], pool = PRODUCTS[cat] || [];
      for (var j = 0; j < pool.length; j++) {
        if (!used[pool[j].id]) {
          selected.push({ cat: cat, id: pool[j].id, name: pool[j].name, desc: pool[j].desc });
          used[pool[j].id] = true;
          break;
        }
      }
    }
    for (var c in PRODUCTS) {
      if (selected.length >= count) break;
      for (var k = 0; k < PRODUCTS[c].length; k++) {
        if (!used[PRODUCTS[c][k].id]) {
          selected.push({ cat: c, id: PRODUCTS[c][k].id, name: PRODUCTS[c][k].name, desc: PRODUCTS[c][k].desc });
          used[PRODUCTS[c][k].id] = true;
          break;
        }
      }
    }
    return selected.slice(0, count);
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
      return obj.products;
    } catch (_) { return null; }
  }

  function setCache(products) {
    try {
      localStorage.setItem("sp_ads_cache", JSON.stringify({
        ts: Math.floor(Date.now() / 1000), products: products,
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
      ".sp-ad-img{height:125px;background:#f6f6f6;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;font-size:38px}" +
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
    injectStyles();

    var html = '<div class="sp-ads-wrap"><div class="sp-ads-label">Produits recommandés pour vous</div><div class="sp-ads-grid">';

    products.forEach(function (p) {
      var color = CAT_COLORS[p.cat] || "#555";
      var label = CAT_LABELS[p.cat] || p.cat;
      var icon  = CAT_ICONS[p.cat]  || "🛍";
      var href  = CONFIG.AFFILIATE_BASE + p.id + ".html";

      html += '<a class="sp-ad" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer sponsored"'
            + ' style="border-color:' + color + '22"'
            + ' onmouseover="this.style.borderColor=\'' + color + '\'"'
            + ' onmouseout="this.style.borderColor=\'' + color + '22\'"'
            + ' onclick="spAdClick(\'' + esc(p.cat) + '\')">'
            + '<div class="sp-ad-img">' + icon
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
    var cached = getCached();
    if (cached) { renderAds(cached); return; }
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
