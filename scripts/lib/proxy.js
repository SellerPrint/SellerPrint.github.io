/**
 * scripts/lib/proxy.js
 *
 * Support proxy HTTP optionnel pour toutes les requêtes sortantes
 * (AliExpress, images, rzekl.com). Désactivé par défaut — n'a aucun effet
 * tant que la variable d'environnement SCRAPER_PROXY_URL n'est pas définie.
 *
 * Pourquoi : les runners GitHub Actions partagés utilisent des IPs de
 * datacenter (Azure) largement connues et bloquées par les systèmes
 * anti-bot. Si le scraping/la validation renvoient systématiquement des
 * pages de blocage depuis GitHub Actions (voir les avertissements
 * affichés par scripts/discover-products.js et scripts/validate-products.js),
 * la solution qui évite de changer d'hébergement est de faire passer ces
 * requêtes par un proxy résidentiel/rotatif (ex: Bright Data, Smartproxy,
 * ScraperAPI...). Une fois un tel service souscrit :
 *
 *   1. `npm install` (installe le paquet `undici`, nécessaire uniquement
 *      pour cette fonctionnalité)
 *   2. Ajoute un secret de dépôt nommé SCRAPER_PROXY_URL, au format
 *      http://user:password@proxy-host:port
 *   3. Rien d'autre à changer — tous les scripts l'utilisent
 *      automatiquement dès que la variable d'environnement est présente.
 *
 * Sans ce secret, tout continue de fonctionner exactement comme avant, en
 * utilisant le fetch natif de Node (aucune dépendance requise).
 *
 * ⚠️ Détail technique important : le `fetch` global de Node embarque SA
 * PROPRE version interne d'undici. Lui passer un ProxyAgent construit à
 * partir du paquet `undici` installé via npm plante (incompatibilité de
 * version entre les deux copies internes d'undici) — d'où le fait qu'on
 * utilise ici le `fetch` EXPORTÉ PAR CE MÊME PAQUET quand un proxy est
 * actif, plutôt que le fetch global. Testé et confirmé nécessaire.
 */
let undici = null;
let cachedAgent = null;

function loadUndici() {
  if (undici) return undici;
  try {
    undici = require("undici");
    return undici;
  } catch (err) {
    console.error(
      "SCRAPER_PROXY_URL est défini mais le paquet 'undici' n'est pas installé. " +
        "Lance `npm install` (voir package.json) pour activer le support proxy."
    );
    return null;
  }
}

/**
 * @returns {{ fetchFn: typeof fetch, dispatcher: import("undici").Dispatcher|undefined }}
 * fetchFn/dispatcher à utiliser pour CETTE requête. Sans proxy configuré,
 * fetchFn est le fetch natif de Node et dispatcher est undefined (aucune
 * dépendance requise, comportement strictement identique à avant).
 */
function getFetchImpl() {
  const proxyUrl = process.env.SCRAPER_PROXY_URL;
  if (!proxyUrl) return { fetchFn: fetch, dispatcher: undefined };

  const lib = loadUndici();
  if (!lib) return { fetchFn: fetch, dispatcher: undefined };

  if (!cachedAgent) cachedAgent = new lib.ProxyAgent(proxyUrl);
  return { fetchFn: lib.fetch, dispatcher: cachedAgent };
}

module.exports = { getFetchImpl };

