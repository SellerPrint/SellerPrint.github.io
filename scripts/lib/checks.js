/**
 * scripts/lib/checks.js
 *
 * Vérifications réseau réelles. Ce module ne fonctionne QUE côté Node
 * (jamais dans le navigateur) car il a besoin de lire le vrai code HTTP
 * et le corps de la réponse — chose impossible en JS navigateur pour un
 * domaine tiers (CORS bloque la lecture, `mode:"no-cors"` masque tout,
 * ce qui est exactement le bug qui rendait affiliate-validator.js inutile :
 * son fetch en no-cors renvoyait "valid:true" pour absolument tout, y
 * compris un produit supprimé).
 *
 * Trois statuts possibles pour chaque vérification :
 *   OK        -> tout va bien
 *   BROKEN    -> confirmé cassé, à corriger/retirer
 *   UNCERTAIN -> impossible de conclure (ex: AliExpress a répondu avec une
 *                page anti-bot/captcha). On ne supprime JAMAIS un produit
 *                sur la seule foi d'un statut UNCERTAIN, pour éviter les
 *                faux positifs (un produit valide supprimé par erreur).
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const TIMEOUT_MS = 12000;

const { getFetchImpl } = require("./proxy");

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const { fetchFn, dispatcher } = getFetchImpl();
  try {
    return await fetchFn(url, {
      redirect: "follow",
      signal: controller.signal,
      dispatcher,
      headers: { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" },
      ...options,
    });
  } finally {
    clearTimeout(timer);
  }
}

function looksLikeAntiBot(bodyLower) {
  return (
    bodyLower.includes("captcha") ||
    bodyLower.includes("verify you") ||
    bodyLower.includes("punish") ||
    bodyLower.includes("access denied") ||
    bodyLower.includes("unusual traffic") ||
    bodyLower.includes("just a moment") || // Cloudflare
    bodyLower.includes("checking your browser") ||
    bodyLower.includes("checking if the site connection is secure") ||
    bodyLower.includes("enable javascript and cookies") ||
    bodyLower.includes("ddos protection") ||
    bodyLower.includes("cf-browser-verification") || // Cloudflare
    bodyLower.includes("perimeterx") ||
    bodyLower.includes("datadome") ||
    bodyLower.includes("please wait while we verify")
  );
}

function looksLikeNotFound(bodyLower) {
  return (
    bodyLower.includes("cette page est introuvable") || // FR AliExpress 404
    bodyLower.includes("page you requested was not found") ||
    bodyLower.includes("sorry, this page") ||
    bodyLower.includes("page not found") ||
    bodyLower.includes("404")
  );
}

/**
 * Vérifie qu'un produit AliExpress est toujours en ligne.
 * @returns {Promise<{status:'OK'|'BROKEN'|'UNCERTAIN', detail:string}>}
 */
async function checkAliExpressProductLive(productId, config) {
  const url = config.buildAliUrl(productId);
  const expectedHost = new URL(config.aliexpressBase).hostname;
  try {
    const res = await fetchWithTimeout(url);

    if (res.status === 404 || res.status === 410) {
      return { status: "BROKEN", detail: `HTTP ${res.status}` };
    }
    if (res.status >= 500) {
      return { status: "UNCERTAIN", detail: `HTTP ${res.status} (erreur serveur, réessayer plus tard)` };
    }

    const finalUrl = res.url || url;
    const body = (await res.text()).toLowerCase();

    if (looksLikeAntiBot(body)) {
      return { status: "UNCERTAIN", detail: "Page anti-bot/captcha renvoyée, impossible de conclure" };
    }

    // Tout ce qui n'est pas un succès franc (2xx) est incertain par
    // défaut plutôt qu'assumé "OK" — un 403 peut venir d'un blocage
    // anti-bot, d'une restriction géographique, ou du proxy réseau lui
    // même, aucun de ces cas ne prouve que le produit est mort OU vivant.
    if (res.status < 200 || res.status >= 300) {
      return { status: "UNCERTAIN", detail: `HTTP ${res.status} (statut inattendu, ni confirmé cassé ni confirmé vivant)` };
    }

    if (!finalUrl.includes(expectedHost) || !finalUrl.includes(String(productId))) {
      return { status: "BROKEN", detail: `Redirigé hors de la fiche produit vers ${finalUrl}` };
    }
    if (looksLikeNotFound(body)) {
      return { status: "BROKEN", detail: "Page produit introuvable (contenu de type 404)" };
    }
    return { status: "OK", detail: `HTTP ${res.status}` };
  } catch (err) {
    return { status: "UNCERTAIN", detail: `Erreur réseau: ${err.message}` };
  }
}

/**
 * Vérifie qu'une image produit est bien accessible et est une vraie image.
 */
async function checkImageReachable(imgUrl) {
  try {
    let res = await fetchWithTimeout(imgUrl, { method: "HEAD" });
    // Certains CDN refusent HEAD (405) : on retente en GET minimal (Range).
    if (res.status === 405 || res.status === 501) {
      res = await fetchWithTimeout(imgUrl, {
        method: "GET",
        headers: { Range: "bytes=0-1024" },
      });
    }
    const contentType = res.headers.get("content-type") || "";
    if (res.status >= 200 && res.status < 300 && contentType.startsWith("image/")) {
      return { status: "OK", detail: contentType };
    }
    if (res.status === 404) {
      return { status: "BROKEN", detail: `HTTP ${res.status}` };
    }
    // 403 notamment est ambigu : de nombreux CDN (dont celui d'AliExpress)
    // renvoient 403 à une requête automatisée sans les en-têtes d'un vrai
    // navigateur (protection anti-hotlink), alors que l'image se charge
    // très bien pour un vrai visiteur. On ne peut pas conclure "cassée"
    // sur ce seul signal — seul un 404 franc l'est de manière fiable.
    return { status: "UNCERTAIN", detail: `HTTP ${res.status}, content-type: ${contentType || "inconnu"}` };
  } catch (err) {
    return { status: "UNCERTAIN", detail: `Erreur réseau: ${err.message}` };
  }
}

/**
 * Suit le lien affilié (rzekl.com/Admitad) et vérifie qu'il atterrit bien
 * sur la fiche AliExpress attendue. Si le programme Admitad ne reconnaît pas
 * le vendeur/produit, le lien redirige en général vers une page générique
 * (accueil AliExpress, page d'erreur Admitad) au lieu du produit -> c'est
 * exactement le cas d'incompatibilité avec le programme d'affiliation.
 */
async function checkAffiliateLinkResolves(productId, config) {
  const affiliateUrl = config.buildAffiliateUrl(productId);
  const expectedHost = new URL(config.aliexpressBase).hostname;
  try {
    const res = await fetchWithTimeout(affiliateUrl);
    const body = (await res.text()).toLowerCase();

    if (looksLikeAntiBot(body)) {
      return { status: "UNCERTAIN", detail: "Page anti-bot/captcha renvoyée, impossible de conclure" };
    }

    // Un lien affilié valide DOIT effectivement rediriger (Location suivie).
    // Si ce n'est pas le cas, on reste TOUJOURS incertain plutôt que de
    // conclure "cassé" — de nombreux systèmes anti-bot (Cloudflare,
    // PerimeterX, DataDome...) répondent avec un code 200 "vérification en
    // cours" au lieu d'un 403 franc, précisément pour ne pas se trahir.
    // Un tel blocage n'a RIEN à voir avec la validité réelle du lien, et le
    // classer "cassé" à tort revenait à rejeter systématiquement de bons
    // candidats dès qu'un run automatisé se heurtait à ce genre de page.
    if (!res.redirected) {
      return {
        status: "UNCERTAIN",
        detail: `Le lien affilié n'a pas redirigé (HTTP ${res.status}) — à vérifier manuellement, peut être un blocage anti-bot plutôt qu'un vrai problème`,
      };
    }

    let finalUrl;
    try {
      finalUrl = new URL(res.url);
    } catch (_) {
      finalUrl = null;
    }

    if (!finalUrl || finalUrl.hostname !== expectedHost) {
      return {
        status: "BROKEN",
        detail: `Le lien affilié ne redirige pas vers ${expectedHost} (arrivée: ${res.url || "inconnue"}) — probablement incompatible avec le programme Admitad`,
      };
    }
    if (!finalUrl.pathname.includes(String(productId))) {
      return {
        status: "BROKEN",
        detail: `Le lien affilié redirige vers ${expectedHost} mais pas vers ce produit (arrivée: ${res.url}) — le vendeur/produit est peut-être sorti du programme Admitad`,
      };
    }
    return { status: "OK", detail: "Redirection correcte vers le produit" };
  } catch (err) {
    return { status: "UNCERTAIN", detail: `Erreur réseau: ${err.message}` };
  }
}

module.exports = {
  checkAliExpressProductLive,
  checkImageReachable,
  checkAffiliateLinkResolves,
};
