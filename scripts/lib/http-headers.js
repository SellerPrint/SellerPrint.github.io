/**
 * scripts/lib/http-headers.js
 *
 * En-têtes de requête centralisés. Les runs réels (voir l'issue "produits
 * jamais ajoutés") montrent qu'AliExpress sert une page anti-bot/captcha
 * spécifiquement pour les pages produit individuelles (/item/ID.html)
 * depuis les IPs de datacenter GitHub Actions, alors que les pages de
 * catégorie (/w/wholesale-*.html) passent sans problème. Un jeu d'en-têtes
 * plus complet (proche d'un vrai Chrome) peut réduire ce taux de blocage
 * — sans garantie totale, un blocage par IP/fingerprint TLS ne se résout
 * pas uniquement avec des en-têtes. Si ça ne suffit pas, voir
 * scripts/lib/proxy.js.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function browserHeaders(extra = {}) {
  return {
    "User-Agent": UA,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    "Upgrade-Insecure-Requests": "1",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    ...extra,
  };
}

module.exports = { browserHeaders, UA };
