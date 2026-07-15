/**
 * scripts/lib/config.js
 *
 * Source UNIQUE de vérité pour les URLs d'affiliation, côté Node.
 * Lit directement affiliate-config.json (déjà présent à la racine du projet)
 * pour que les scripts de validation/ajout de produits utilisent exactement
 * la même base Admitad/AliExpress que le site (index.html + affiliate-config.js).
 *
 * Pourquoi ce fichier existe :
 * Avant cette correction, la base Admitad ("https://rzekl.com/c/.../?ulp=")
 * était recopiée à la main dans 4 endroits différents (index.html,
 * smart-ads.js, affiliate-loader.js, affiliate-validator.js) et avait déjà
 * divergé dans au moins un fichier (affiliate-validator.js attendait
 * "ad.admitad.com" au lieu de "rzekl.com"). Un seul point de lecture évite
 * que ça se reproduise.
 */
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "..", "affiliate-config.json");

function loadRawConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  return JSON.parse(raw);
}

const raw = loadRawConfig();

const config = {
  admitadBase: raw.admitad.baseUrl,
  aliexpressBase: raw.aliexpress.baseUrl,
  // Origine réelle du site déployé. Utilisée comme Referer lors de la
  // vérification des images (voir checks.js) pour reproduire fidèlement
  // ce qu'un vrai navigateur envoie en chargeant une balise <img> sur une
  // page du site — c'est justement ce Referer tiers qui déclenche la
  // protection anti-hotlink de certains CDN.
  siteOrigin: raw.site.origin,

  /** URL AliExpress "brute" du produit (sans wrapper affilié) */
  buildAliUrl(productId) {
    return this.aliexpressBase + productId + ".html";
  },

  /** URL affiliée complète (rzekl.com / Admitad), correctement encodée */
  buildAffiliateUrl(productId) {
    const aliUrl = this.buildAliUrl(productId);
    return this.admitadBase + encodeURIComponent(aliUrl);
  },
};

module.exports = config;
