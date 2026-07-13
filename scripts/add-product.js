#!/usr/bin/env node
/**
 * scripts/add-product.js
 *
 * Ajoute un produit à products.js à partir d'une simple URL AliExpress,
 * au lieu du copier-coller manuel (source d'erreurs : mauvaise image,
 * ID mal recopié, lien non testé...). Toute la logique de vérification
 * vit dans scripts/lib/resolve-candidate.js (partagée avec
 * scripts/discover-products.js).
 *
 * Usage :
 *   node scripts/add-product.js "https://www.aliexpress.com/item/1005XXXXXXXXXXX.html" --cat=textile
 *   node scripts/add-product.js 1005XXXXXXXXXXX --cat=deco --badge=Nouveau --name="..." --desc="..." --img="..."
 *
 * Options :
 *   --cat=textile|deco|accessoire   (obligatoire)
 *   --name="..." --desc="..." --badge="..." --img="..."   (sinon auto-détectés/génériques)
 *   --force   (accepte un statut incertain au lieu de refuser)
 */

const productsStore = require("./lib/products-store");
const { resolveCandidate } = require("./lib/resolve-candidate");

const C = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

const VALID_CATS = ["textile", "deco", "accessoire"];

function parseArgs(argv) {
  const out = { _: [] };
  for (const arg of argv) {
    const m = arg.match(/^--([a-zA-Z-]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
    else if (arg === "--force") out.force = true;
    else out._.push(arg);
  }
  return out;
}

function extractProductId(input) {
  const m = String(input).match(/(\d{10,20})/);
  return m ? m[1] : null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args._.length === 0) {
    console.error(C.red("Usage: node scripts/add-product.js <url-ou-id-aliexpress> --cat=textile|deco|accessoire [--name=] [--desc=] [--badge=] [--img=] [--force]"));
    process.exit(2);
  }

  const productId = extractProductId(args._[0]);
  if (!productId) {
    console.error(C.red(`Impossible d'extraire un ID produit AliExpress depuis "${args._[0]}"`));
    process.exit(2);
  }
  if (!args.cat || !VALID_CATS.includes(args.cat)) {
    console.error(C.red(`--cat est obligatoire et doit être l'une de : ${VALID_CATS.join(", ")}`));
    process.exit(2);
  }

  const existing = productsStore.readProducts();
  if (existing.some((p) => p.id === productId)) {
    console.error(C.red(`Le produit ${productId} est déjà présent dans products.js — abandon.`));
    process.exit(2);
  }

  console.log(C.bold(`\nAjout du produit ${productId}...\n`));
  console.log("→ Vérification AliExpress, image et lien affilié...");

  const result = await resolveCandidate(
    productId,
    { cat: args.cat, name: args.name, desc: args.desc, badge: args.badge, img: args.img },
    { strict: !args.force }
  );

  if (!result.ok) {
    console.error(C.red(`✗ ${result.reason}`));
    console.error(C.red("  Rien n'a été ajouté à products.js. Relance avec --force pour ignorer un statut incertain."));
    process.exit(1);
  }

  productsStore.writeProducts([...existing, result.product]);

  console.log(C.green("✓ Produit validé et ajouté (sauvegarde dans products.js.bak)"));
  console.log(JSON.stringify(result.product, null, 2));
  console.log("");
  console.log(C.yellow("Pense à relire desc/badge avant de publier."));
}

main().catch((err) => {
  console.error("Erreur du script d'ajout:", err);
  process.exit(2);
});
