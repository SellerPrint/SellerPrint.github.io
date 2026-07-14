/**
 * scripts/lib/resolve-candidate.js
 *
 * Prend un simple ID produit AliExpress et tente d'en faire une entrée
 * products.js complète et validée : vérifie que le produit est en ligne,
 * auto-détecte nom/image (og:title/og:image), vérifie que l'image charge
 * et que le lien affilié redirige bien vers ce produit.
 *
 * Utilisé par :
 *   - scripts/add-product.js      (un seul produit, fourni par l'utilisateur)
 *   - scripts/discover-products.js (plusieurs candidats trouvés par scraping)
 *
 * Ne retourne JAMAIS un produit dont un check a échoué (BROKEN). Un check
 * UNCERTAIN est accepté par défaut pour ne pas bloquer indéfiniment sur un
 * simple blocage réseau ponctuel — passe `strict:true` pour l'exiger OK.
 */
const config = require("./config");
const { getFetchImpl } = require("./proxy");
const { browserHeaders } = require("./http-headers");
const {
  checkAliExpressProductLive,
  checkImageReachable,
  checkAffiliateLinkResolves,
  looksLikeAntiBot,
} = require("./checks");

function extractMeta(html, property) {
  const re = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i");
  const m = html.match(re);
  if (m) return m[1];
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i");
  const m2 = html.match(re2);
  return m2 ? m2[1] : null;
}

async function fetchProductPage(url, referer) {
  const { fetchFn, dispatcher } = getFetchImpl();
  const res = await fetchFn(url, {
    headers: browserHeaders(referer ? { Referer: referer } : {}),
    dispatcher,
  });
  return { status: res.status, body: await res.text() };
}

/**
 * @param {string} productId
 * @param {object} overrides { cat, name, desc, badge, img }
 * @param {object} opts { strict?: boolean }
 * @returns {Promise<{ok:true, product:object} | {ok:false, reason:string, checks:object}>}
 */
async function resolveCandidate(productId, overrides = {}, opts = {}) {
  const strict = !!opts.strict;
  const checks = {};

  checks.aliexpress = await checkAliExpressProductLive(productId, config);
  if (checks.aliexpress.status === "BROKEN") {
    return { ok: false, reason: `AliExpress: ${checks.aliexpress.detail}`, checks };
  }
  if (checks.aliexpress.status === "UNCERTAIN" && strict) {
    return { ok: false, reason: `AliExpress non confirmé: ${checks.aliexpress.detail}`, checks };
  }

  let name = overrides.name;
  let img = overrides.img;
  let productPageBlocked = false;
  if (!name || !img) {
    try {
      const { body } = await fetchProductPage(config.buildAliUrl(productId), opts.referer);
      if (looksLikeAntiBot(body.toLowerCase())) {
        productPageBlocked = true;
      } else {
        if (!name) name = extractMeta(body, "og:title");
        if (!img) img = extractMeta(body, "og:image");
      }
    } catch (_) {
      // laisse name/img tels quels ; erreurs gérées ci-dessous
    }
  }
  if (!name || !img) {
    const reason = productPageBlocked
      ? "Page produit bloquée par anti-bot (og:title/og:image inaccessibles, pas forcément un vrai problème produit)"
      : "Nom ou image introuvable (og:title/og:image absents)";
    return { ok: false, reason, checks };
  }

  checks.image = await checkImageReachable(img);
  if (checks.image.status === "BROKEN") {
    return { ok: false, reason: `Image: ${checks.image.detail}`, checks };
  }
  if (checks.image.status === "UNCERTAIN" && strict) {
    return { ok: false, reason: `Image non confirmée: ${checks.image.detail}`, checks };
  }

  checks.affiliate = await checkAffiliateLinkResolves(productId, config);
  if (checks.affiliate.status === "BROKEN") {
    return { ok: false, reason: `Lien affilié: ${checks.affiliate.detail}`, checks };
  }
  if (checks.affiliate.status === "UNCERTAIN" && strict) {
    return { ok: false, reason: `Lien affilié non confirmé: ${checks.affiliate.detail}`, checks };
  }

  const product = {
    id: productId,
    name,
    desc: overrides.desc || "Description à compléter.",
    badge: overrides.badge || "",
    cat: overrides.cat || "accessoire",
    img,
  };

  return { ok: true, product, checks };
}

module.exports = { resolveCandidate, extractMeta, fetchProductPage };
