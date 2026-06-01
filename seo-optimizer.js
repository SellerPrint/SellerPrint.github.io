/**
 * seo-optimizer.js
 * SellerPrint — Optimisation SEO + Hiérarchisation des annonces
 * 
 * ✓ Structured Data (JSON-LD)
 * ✓ Meta tags dynamiques
 * ✓ Breadcrumbs schema
 * ✓ Séparation visuelle: AdSense >> Admitad links
 */

(function () {
  "use strict";

  var SEO = {
    config: {
      siteName: "SellerPrint",
      siteUrl: "https://sellerprint.github.io",
      locale: "fr_FR"
    },

    /**
     * Injecte Schema.org JSON-LD pour les produits
     */
    injectProductSchema: function(product) {
      var schema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name || "",
        "description": product.description || "",
        "image": product.image || "",
        "brand": { "@type": "Brand", "name": "SellerPrint" },
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "EUR",
          "offerCount": 1,
          "availability": "https://schema.org/InStock"
        }
      };

      this.addJsonLd(schema);
    },

    /**
     * Breadcrumb schema
     */
    injectBreadcrumb: function(items) {
      var itemListElement = [];
      
      items.forEach(function(item, idx) {
        itemListElement.push({
          "@type": "ListItem",
          "position": idx + 1,
          "name": item.name,
          "item": item.url
        });
      });

      var schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": itemListElement
      };

      this.addJsonLd(schema);
    },

    /**
     * Organization schema
     */
    injectOrganization: function() {
      var schema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "SellerPrint",
        "url": this.config.siteUrl,
        "logo": this.config.siteUrl + "/icon-192.png",
        "description": "Créez, imprimez et vendez vos produits personnalisés",
        "sameAs": [
          // Ajouter vos réseaux sociaux ici
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "notification.sellerprint@gmail.com",
          "contactType": "Customer Support"
        }
      };

      this.addJsonLd(schema);
    },

    /**
     * Ajoute un script JSON-LD au <head>
     */
    addJsonLd: function(schema) {
      var script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    },

    /**
     * Optimise les meta tags dynamiquement
     */
    optimizeMetaTags: function() {
      // Open Graph: image optimisée
      this.setMetaTag("og:image", this.config.siteUrl + "/og-image.png", "property");
      this.setMetaTag("og:image:width", "1200", "property");
      this.setMetaTag("og:image:height", "630", "property");

      // Twitter Card
      this.setMetaTag("twitter:card", "summary_large_image", "name");
      this.setMetaTag("twitter:site", "@SellerPrint", "name");

      // Canonical URL
      if (!document.querySelector("link[rel='canonical']")) {
        var canonical = document.createElement("link");
        canonical.rel = "canonical";
        canonical.href = this.config.siteUrl;
        document.head.appendChild(canonical);
      }

      // Preload ressources critiques
      this.preloadCriticalResources();
    },

    /**
     * Définit/met à jour un meta tag
     */
    setMetaTag: function(name, content, type) {
      type = type || "name";
      var attr = type === "property" ? "property" : "name";
      var selector = "meta[" + attr + "='" + name + "']";
      var meta = document.querySelector(selector);

      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }

      meta.content = content;
    },

    /**
     * Preload des ressources critiques (fonts, images)
     */
    preloadCriticalResources: function() {
      var resources = [
        { href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap", as: "style" }
      ];

      resources.forEach(function(res) {
        if (!document.querySelector("link[href='" + res.href + "']")) {
          var link = document.createElement("link");
          link.rel = "preload";
          link.href = res.href;
          link.as = res.as;
          if (res.as === "font") link.crossOrigin = "anonymous";
          document.head.appendChild(link);
        }
      });
    },

    /**
     * Crée une hiérarchie visuelle: AdSense > Admitad
     * AdSense: position prioritaire, design premium
     * Admitad: design secondaire, texte plus discret
     */
    setupAdHierarchy: function() {
      // CSS injection pour hiérarchie
      var styles = document.createElement("style");
      styles.id = "sp-ad-hierarchy";
      styles.textContent = `
        /* ══════════════════════════════════════
           HIÉRARCHIE PUBLICITAIRE
           ══════════════════════════════════════ */

        /* AdSense: PRINCIPAL (priorité visuelle) */
        .ad-container {
          background: linear-gradient(135deg, rgba(102,126,234,0.08) 0%, rgba(118,75,162,0.08) 100%);
          border: 2px solid #667eea;
          border-radius: 16px;
          padding: 20px;
          margin: 3rem 0;
          box-shadow: 0 8px 32px rgba(102,126,234,0.12);
          position: relative;
        }

        .ad-label {
          font-size: 0.75rem !important;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: #667eea;
          margin-bottom: 12px;
          display: block;
        }

        .adsbygoogle {
          display: block !important;
          min-height: 150px;
        }

        /* ══════════════════════════════════════
           Admitad: SECONDAIRE (discret) */
        .sp-ads-wrap {
          background: #f8f9ff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          margin: 2rem 0;
          position: relative;
        }

        .sp-ads-label {
          font-size: 0.7rem !important;
          color: #999;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 12px;
        }

        .sp-ads-grid {
          gap: 12px;
        }

        .sp-ad {
          background: #fff;
          border: 1px solid #e5e7eb;
          transition: all 0.2s ease;
        }

        .sp-ad:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102,126,234,0.1);
        }

        /* ══════════════════════════════════════
           SÉPARATION CLAIRE */
        
        /* Les produits PRINCIPAUX (grid) */
        .products-grid {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.04);
        }

        .section-title {
          color: #667eea;
          font-weight: 800;
        }

        /* Media queries pour mobile */
        @media(max-width: 768px) {
          .ad-container {
            margin: 2rem 0;
            padding: 16px;
          }

          .sp-ads-wrap {
            margin: 1.5rem 0;
            padding: 12px;
          }
        }
      `;

      document.head.appendChild(styles);
    },

    /**
     * Initialise toutes les optimisations SEO
     */
    init: function(options) {
      Object.assign(this.config, options || {});
      
      this.optimizeMetaTags();
      this.injectOrganization();
      this.setupAdHierarchy();

      // Injecter breadcrumb si on est sur une page produit
      if (window.location.pathname.includes("product") || window.location.pathname.includes("produit")) {
        this.injectBreadcrumb([
          { name: "Accueil", url: this.config.siteUrl },
          { name: "Produits", url: this.config.siteUrl + "/#produits" },
          { name: "Détail produit", url: window.location.href }
        ]);
      }
    }
  };

  window.SEOOptimizer = SEO;

  // Auto-init
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      SEO.init();
    });
  } else {
    SEO.init();
  }

})();
