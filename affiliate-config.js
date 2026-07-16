/**
 * affiliate-config.js
 *
 * Source unique de vérité pour les URLs d'affiliation, côté navigateur.
 * Doit toujours correspondre à affiliate-config.json (utilisé lui par les
 * scripts Node — scripts/validate-products.js, scripts/add-product.js).
 *
 * Pourquoi deux fichiers pour une seule config ?
 * Ce site est du HTML statique sans étape de build : une page ne peut pas
 * faire `import config from "./affiliate-config.json"`. Ce fichier .js
 * recopie donc les mêmes valeurs pour qu'elles restent chargeables par un
 * simple <script src="affiliate-config.js">.
 *
 * ⚠️ Si tu changes l'ID de tracking Admitad, mets à jour les DEUX fichiers
 * (affiliate-config.json ET affiliate-config.js). C'est justement l'absence
 * d'un point central comme celui-ci qui avait fait diverger
 * affiliate-validator.js (qui attendait encore l'ancien format de lien).
 */
(function (root) {
  "use strict";

  var SP_AFFILIATE_CONFIG = {
    admitadBase: "https://rzekl.com/c/1e8d114494ffc29cecab16525dc3e8/?ulp=",
    aliexpressBase: "https://www.aliexpress.com/item/",

    buildAliUrl: function (productId) {
      return this.aliexpressBase + productId + ".html";
    },
    buildAffiliateUrl: function (productId) {
      return this.admitadBase + encodeURIComponent(this.buildAliUrl(productId));
    },
  };

  root.SP_AFFILIATE_CONFIG = SP_AFFILIATE_CONFIG;
})(typeof window !== "undefined" ? window : this);
