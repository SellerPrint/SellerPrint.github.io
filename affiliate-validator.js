/**
 * affiliate-validator.js
 * SellerPrint — Validation des URLs Admitad & AliExpress
 *
 * ⚠️ CORRECTIF IMPORTANT (voir audit du projet) :
 * Ce fichier n'était chargé sur AUCUNE page du site (aucun
 * <script src="affiliate-validator.js">), donc rien de ce qui suit
 * n'avait d'effet réel sur les liens cassés. En plus de ça, deux bugs :
 *
 *   1. Le regex `admitad` attendait "ad.admitad.com" alors que TOUS les
 *      liens du site utilisent "rzekl.com" (voir affiliate-config.json) —
 *      donc même en le branchant, validateFormat() aurait rejeté 100%
 *      des vrais liens du site.
 *   2. checkProductExists() utilise fetch(url, {mode:"no-cors"}). En mode
 *      no-cors, la réponse est TOUJOURS "opaque" : le .then() s'exécute
 *      pour un produit qui existe COMME pour un produit supprimé (404).
 *      Cette fonction renvoyait donc systématiquement {valid:true}, quel
 *      que soit le produit — un CORS du navigateur empêche structurellement
 *      de lire le vrai code HTTP d'un domaine externe comme aliexpress.com.
 *
 * La vraie vérification d'existence d'un produit ne peut se faire QUE
 * côté serveur (Node), là où CORS ne s'applique pas : voir
 * scripts/validate-products.js (exécuté à la main ou via CI, voir
 * .github/workflows/validate-products.yml).
 *
 * Ce fichier reste utile pour un usage ponctuel côté navigateur (ex: un
 * futur formulaire d'admin qui valide juste le FORMAT d'un lien collé),
 * mais checkProductExists() ci-dessous est volontairement documenté comme
 * non fiable pour trancher "ce produit existe/n'existe pas".
 */

(function () {
  "use strict";

  var VALIDATOR = {
    // Patterns valides — dérivés de la config partagée (affiliate-config.js)
    // si elle est chargée sur la page, pour ne plus jamais diverger.
    PATTERNS: (function () {
      var cfg = window.SP_AFFILIATE_CONFIG;
      var admitadHost = "rzekl\\.com";
      try {
        if (cfg && cfg.admitadBase) admitadHost = new URL(cfg.admitadBase).hostname.replace(/\./g, "\\.");
      } catch (_) {}
      return {
        admitad: new RegExp("^https:\\/\\/" + admitadHost + "\\/.+\\?ulp=https:\\/\\/.+", "i"),
        aliexpress: /^https:\/\/www\.aliexpress\.com\/item\/\d+\.html/i,
        product_id: /^\d{10,20}$/, // IDs AliExpress: généralement 16 chiffres
      };
    })(),

    // Cache: { url: { valid: bool, checked_at: timestamp, error?: string } }
    CACHE_KEY: "sp_affiliate_cache",
    CACHE_TTL: 86400000, // 24h en ms

    /**
     * Valide le format d'une URL Admitad + AliExpress
     */
    validateFormat: function(url) {
      if (!url || typeof url !== "string") return { valid: false, error: "URL vide" };
      
      var admitad = this.PATTERNS.admitad.test(url);
      var aliexpress = this.PATTERNS.aliexpress.test(url);
      
      if (!admitad) {
        return { valid: false, error: "Format Admitad invalide" };
      }
      if (!aliexpress) {
        return { valid: false, error: "Format AliExpress invalide dans l'ULP" };
      }
      
      return { valid: true };
    },

    /**
     * Extrait l'ID produit AliExpress de l'URL
     */
    extractProductId: function(url) {
      var match = url.match(/\/item\/(\d+)/);
      return match ? match[1] : null;
    },

    /**
     * ⚠️ NE PEUT PAS vraiment vérifier qu'un produit existe.
     * Le navigateur applique CORS sur les requêtes vers aliexpress.com :
     * en mode "no-cors" la réponse est opaque (impossible de lire le code
     * HTTP réel, 200 et 404 sont indiscernables), et un fetch "cors" normal
     * serait bloqué avant même d'atteindre le serveur. Il n'existe donc
     * PAS de moyen fiable de faire ce check depuis le navigateur.
     *
     * Renvoie explicitement `checked:false` pour que l'appelant ne
     * confonde jamais ce résultat avec une vraie confirmation. Pour une
     * vraie vérification, utiliser scripts/validate-products.js (Node).
     */
    checkProductExists: function(productId, callback) {
      if (!productId) {
        callback({ valid: false, checked: false, error: "ID produit manquant" });
        return;
      }
      callback({
        valid: null,
        checked: false,
        error: "Vérification d'existence impossible depuis le navigateur (CORS). Utiliser scripts/validate-products.js.",
      });
    },

    /**
     * Validation complète: format (fiable) + tentative d'existence
     * (non fiable, voir checkProductExists). Ne bloque JAMAIS l'affichage
     * sur la base du check d'existence, seulement sur le format — sinon
     * on masquerait des produits parfaitement valides.
     */
    validateUrl: function(url, callback) {
      var self = this;

      // 1. Validation du format — seul signal fiable côté navigateur
      var formatCheck = this.validateFormat(url);
      if (!formatCheck.valid) {
        callback(formatCheck);
        return;
      }

      // 2. Check cache global
      var cached = this.getCache(url);
      if (cached) {
        callback(cached);
        return;
      }

      // 3. Tentative d'info sur l'existence, à titre indicatif seulement
      // (ne détermine jamais result.valid, qui reste true après le format).
      var productId = this.extractProductId(url);
      this.checkProductExists(productId, function(existenceInfo) {
        var result = { valid: true, existenceCheck: existenceInfo };
        self.setCache(url, result);
        callback(result);
      });
    },

    /**
     * Récupère du cache localStorage
     */
    getCache: function(key) {
      try {
        var data = localStorage.getItem("sp_aff_" + key);
        if (!data) return null;
        
        var obj = JSON.parse(data);
        var now = Date.now();
        
        // Vérifier TTL
        if (now - obj.ts > this.CACHE_TTL) {
          localStorage.removeItem("sp_aff_" + key);
          return null;
        }
        
        return obj.result;
      } catch (e) {
        return null;
      }
    },

    /**
     * Sauvegarde dans le cache
     */
    setCache: function(key, result) {
      try {
        var data = {
          ts: Date.now(),
          result: result
        };
        localStorage.setItem("sp_aff_" + key, JSON.stringify(data));
      } catch (e) {
        console.warn("Cache localStorage plein");
      }
    },

    /**
     * Valide un batch d'URLs (async)
     */
    validateBatch: function(urls, callback) {
      var results = {};
      var pending = urls.length;

      urls.forEach(function(url) {
        VALIDATOR.validateUrl(url, function(result) {
          results[url] = result;
          pending--;
          if (pending === 0) {
            callback(results);
          }
        });
      });
    }
  };

  // Exposition globale
  window.AffiliateValidator = VALIDATOR;

})();
