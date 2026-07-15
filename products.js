/**
 * SellerPrint — Catalogue produits avec vraies images AliExpress
 * Images hébergées sur : ae-pic-a1.aliexpress-media.com (CDN officiel AliExpress)
 * IDs produits réels — liens affiliés via rzekl.com
 *
 * Ce fichier peut être régénéré automatiquement par :
 *   node scripts/validate-products.js --fix   (retire les produits cassés)
 *   node scripts/add-product.js <url>         (ajoute un produit validé)
 */
const products = [

];

// Expose globally so other scripts (index.html) can read window.products.
// (top-level `const` does NOT attach to window like `var` does — without
// this line the homepage product grid stays empty for every visitor.)
if (typeof window !== "undefined") {
  window.products = products;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = products;
}
