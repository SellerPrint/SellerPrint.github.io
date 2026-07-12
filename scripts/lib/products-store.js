/**
 * scripts/lib/products-store.js
 * Lecture/écriture de products.js — un seul endroit qui connaît le format
 * du fichier, utilisé à la fois par validate-products.js et add-product.js.
 */
const fs = require("fs");
const path = require("path");

const PRODUCTS_PATH = path.join(__dirname, "..", "..", "products.js");

function readProducts() {
  delete require.cache[require.resolve(PRODUCTS_PATH)];
  return require(PRODUCTS_PATH);
}

function serialize(products) {
  const header = `/**
 * SellerPrint — Catalogue produits avec vraies images AliExpress
 * Images hébergées sur : ae-pic-a1.aliexpress-media.com (CDN officiel AliExpress)
 * IDs produits réels — liens affiliés via rzekl.com
 *
 * Ce fichier peut être régénéré automatiquement par :
 *   node scripts/validate-products.js --fix   (retire les produits cassés)
 *   node scripts/add-product.js <url>         (ajoute un produit validé)
 */
const products = [
`;
  const body = products
    .map((p) => {
      return [
        `  {`,
        `    id: ${JSON.stringify(p.id)},`,
        `    name: ${JSON.stringify(p.name)},`,
        `    desc: ${JSON.stringify(p.desc)},`,
        `    badge: ${JSON.stringify(p.badge || "")},`,
        `    cat: ${JSON.stringify(p.cat)},`,
        `    img: ${JSON.stringify(p.img)}`,
        `  }`,
      ].join("\n");
    })
    .join(",\n");
  const footer = `
];

// Expose globally so other scripts (index.html) can read window.products.
// (top-level \`const\` does NOT attach to window like \`var\` does — without
// this line the homepage product grid stays empty for every visitor.)
if (typeof window !== "undefined") {
  window.products = products;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = products;
}
`;
  return header + body + footer;
}

function writeProducts(products, { backup = true } = {}) {
  if (backup && fs.existsSync(PRODUCTS_PATH)) {
    fs.copyFileSync(PRODUCTS_PATH, PRODUCTS_PATH + ".bak");
  }
  fs.writeFileSync(PRODUCTS_PATH, serialize(products));
}

module.exports = { PRODUCTS_PATH, readProducts, serialize, writeProducts };
