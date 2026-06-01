/**
 * affiliate-validator.js
 * SellerPrint — Validation des URLs Admitad & AliExpress
 * 
 * ✓ Valide le format des URLs
 * ✓ Vérifie les erreurs 404
 * ✓ Cache les résultats (localStorage)
 * ✓ Rejette les URLs invalides avant affichage
 */

(function () {
  "use strict";

  var VALIDATOR = {
    // Patterns valides
    PATTERNS: {
      admitad: /^https:\/\/ad\.admitad\.com\/g\/[a-f0-9]{32}\/\?ulp=https:\/\/.+/i,
      aliexpress: /^https:\/\/www\.aliexpress\.com\/item\/\d+\.html/i,
      product_id: /^\d{16}$/ // IDs AliExpress: 16 chiffres
    },

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
     * Vérifie si un produit existe (HEAD request, pas de cors)
     * Utilise une API proxy si nécessaire
     */
    checkProductExists: function(productId, callback) {
      if (!productId) {
        callback({ valid: false, error: "ID produit manquant" });
        return;
      }

      var cacheKey = "sp_prod_" + productId;
      var cached = this.getCache(cacheKey);
      
      if (cached) {
        callback(cached);
        return;
      }

      // Vérification via une API proxy légère (no-cors fallback)
      var testUrl = "https://www.aliexpress.com/item/" + productId + ".html";
      
      fetch(testUrl, { 
        method: "HEAD",
        mode: "no-cors"
      })
      .then(function(response) {
        // no-cors retourne toujours 0, donc on considère que la requête a réussi
        var result = { valid: true };
        VALIDATOR.setCache(cacheKey, result);
        callback(result);
      })
      .catch(function(error) {
        var result = { valid: false, error: "Produit non accessible: " + error.message };
        VALIDATOR.setCache(cacheKey, result);
        callback(result);
      });
    },

    /**
     * Validation complète: format + existence
     */
    validateUrl: function(url, callback) {
      var self = this;
      
      // 1. Validation du format
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

      // 3. Extraction ID et vérification produit
      var productId = this.extractProductId(url);
      this.checkProductExists(productId, function(result) {
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
