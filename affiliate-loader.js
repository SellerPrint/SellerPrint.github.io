/**
 * affiliate-loader.js
 * SellerPrint — Chargement optimisé des liens affiliés
 *
 * ⚠️ STATUT (voir audit du projet) : ce fichier n'est actuellement chargé
 * sur AUCUNE page du site, et le HTML généré (statique ou via
 * renderProducts() dans index.html) n'utilise pas l'attribut
 * `data-affiliate-id` que ce module s'attend à trouver — donc même
 * chargé, il ne trouverait aucun élément à traiter.
 *
 * La protection contre les liens/images cassés en production passe
 * aujourd'hui par deux mécanismes actifs :
 *   1. handleImgError() dans index.html, qui retire la carte entière
 *      dès qu'une image ne charge plus (signal fiable, contrairement à
 *      une vérification de lien).
 *   2. scripts/validate-products.js (Node), qui vérifie réellement
 *      chaque produit/image/lien affilié côté serveur — seul endroit où
 *      CORS ne bloque pas la lecture du vrai code HTTP.
 *
 * Ce fichier reste disponible pour une future intégration (ajouter
 * data-affiliate-id + data-category sur les cartes, puis charger ce
 * script) si un chargement paresseux par IntersectionObserver devient
 * utile, mais son garde-fou "existence produit" hérite des limites de
 * AffiliateValidator.checkProductExists (non fiable côté navigateur,
 * voir affiliate-validator.js) : il ne peut réagir qu'à un format d'URL
 * invalide, pas à un produit réellement supprimé.
 *
 * ✓ Lazy loading des liens
 * ✓ Compression & minification des URLs
 * ✓ Performance: Intersection Observer
 * ✓ Fallback gracieux si produit indisponible
 */

(function () {
  "use strict";

  // Source unique de vérité (affiliate-config.js) — évite que ce fichier
  // ne diverge à nouveau des vraies URLs utilisées par le site.
  var SHARED = window.SP_AFFILIATE_CONFIG || {};

  var LOADER = {
    config: {
      ADMITAD_BASE: SHARED.admitadBase || "https://rzekl.com/c/1e8d114494ffc29cecab16525dc3e8/?ulp=",
      ALIEXPRESS_BASE: SHARED.aliexpressBase || "https://www.aliexpress.com/item/",
      VALIDATE_ON_LOAD: true,
      CACHE_TTL: 3600000, // 1h
      BATCH_SIZE: 10, // Valider par batch de 10
      TIMEOUT: 5000 // 5s timeout max
    },

    /**
     * Initialise le système de chargement
     */
    init: function(options) {
      Object.assign(this.config, options || {});
      this.setupIntersectionObserver();
      this.cacheProductLinks();
    },

    /**
     * Setup Intersection Observer pour lazy loading
     */
    setupIntersectionObserver: function() {
      if (!("IntersectionObserver" in window)) {
        // Fallback pour vieux navigateurs
        this.loadAllLinks();
        return;
      }

      var self = this;
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            self.loadLink(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, {
        rootMargin: "50px" // Charge 50px avant d'apparaître
      });

      // Observer tous les liens avec data-affiliate
      document.querySelectorAll("[data-affiliate-id]").forEach(function(el) {
        observer.observe(el);
      });
    },

    /**
     * Construit une URL Admitad valide
     */
    buildAffiliateUrl: function(productId) {
      if (!productId) return null;
      
      var aliUrl = this.config.ALIEXPRESS_BASE + productId + ".html";
      var affiliateUrl = this.config.ADMITAD_BASE + encodeURIComponent(aliUrl);
      
      return affiliateUrl;
    },

    /**
     * Charge et valide un lien affilié unique
     */
    loadLink: function(element) {
      var productId = element.getAttribute("data-affiliate-id");
      if (!productId) return;

      var url = this.buildAffiliateUrl(productId);
      if (!url) {
        this.handleError(element, "URL invalide");
        return;
      }

      var self = this;

      // Valider format + existence
      if (this.config.VALIDATE_ON_LOAD) {
        AffiliateValidator.validateUrl(url, function(result) {
          if (result.valid) {
            self.applyLink(element, url);
          } else {
            self.handleError(element, result.error);
          }
        });
      } else {
        // Mode sans validation (plus rapide)
        this.applyLink(element, url);
      }
    },

    /**
     * Applique l'URL au lien
     */
    applyLink: function(element, url) {
      element.href = url;
      element.setAttribute("rel", "noopener noreferrer sponsored");
      element.setAttribute("target", "_blank");
      element.classList.add("sp-affiliate-ready");
      element.removeAttribute("aria-busy");

      // Tracker le clic
      element.addEventListener("click", function() {
        LOADER.trackClick(element);
      });
    },

    /**
     * Gère les erreurs (produit 404, etc.)
     */
    handleError: function(element, errorMsg) {
      console.warn("Affiliate error: " + errorMsg + " for " + element.getAttribute("data-affiliate-id"));
      
      element.classList.add("sp-affiliate-error");
      element.setAttribute("aria-disabled", "true");
      element.style.opacity = "0.5";
      element.style.pointerEvents = "none";
      
      // Tooltip d'erreur (optionnel)
      element.title = "Produit temporairement indisponible";
    },

    /**
     * Track les clics pour analytics
     */
    trackClick: function(element) {
      try {
        var productId = element.getAttribute("data-affiliate-id");
        var category = element.getAttribute("data-category") || "general";
        
        // LocalStorage: historique des clics
        var history = JSON.parse(localStorage.getItem("sp_click_history") || "[]");
        history.push({
          id: productId,
          cat: category,
          ts: Date.now()
        });
        
        // Garder les 100 derniers clics
        localStorage.setItem("sp_click_history", JSON.stringify(history.slice(-100)));

        // GTM / Analytics event (optionnel)
        if (window.gtag) {
          gtag("event", "affiliate_click", {
            product_id: productId,
            category: category
          });
        }
      } catch (e) {
        console.error("Click tracking error:", e);
      }
    },

    /**
     * Cache les liens produits pour validation batch
     */
    cacheProductLinks: function() {
      var links = [];
      document.querySelectorAll("[data-affiliate-id]").forEach(function(el) {
        links.push({
          el: el,
          id: el.getAttribute("data-affiliate-id")
        });
      });

      // Valider par batch
      var self = this;
      for (var i = 0; i < links.length; i += this.config.BATCH_SIZE) {
        var batch = links.slice(i, i + this.config.BATCH_SIZE);
        setTimeout(function() {
          batch.forEach(function(item) {
            if (item.el) self.loadLink(item.el);
          });
        }, 100 * Math.floor(i / this.config.BATCH_SIZE));
      }
    },

    /**
     * Fallback: charge tous les liens sans lazy loading
     */
    loadAllLinks: function() {
      var self = this;
      document.querySelectorAll("[data-affiliate-id]").forEach(function(el) {
        self.loadLink(el);
      });
    },

    /**
     * Revalide tous les liens (utile après changement de config)
     */
    refreshAll: function() {
      localStorage.removeItem("sp_aff_cache");
      this.cacheProductLinks();
    }
  };

  // Exposition globale
  window.AffiliateLoader = LOADER;

  // Auto-init au chargement du DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      LOADER.init();
    });
  } else {
    LOADER.init();
  }

})();
