#!/usr/bin/env node
/**
 * scripts/validate-products.js
 *
 * Vérifie CHAQUE produit de products.js (le vrai catalogue affiché sur le
 * site — celui utilisé par index.html / renderProducts()) :
 *
 *   1. Le produit AliExpress existe-t-il toujours ?
 *   2. L'image du produit se charge-t-elle vraiment ?
 *   3. Le lien affilié (rzekl.com / Admitad) redirige-t-il bien vers CE
 *      produit (et pas vers une page générique = incompatibilité avec le
 *      programme d'affiliation) ?
 *
 * Usage :
 *   node scripts/validate-products.js            → rapport seulement
 *   node scripts/validate-products.js --fix       → retire les produits
 *                                                    cassés de products.js
 *                                                    et les met de côté dans
 *                                                    products.quarantine.json
 *   node scripts/validate-products.js --json      → sortie JSON pure (CI)
 *
 * Code de sortie : 1 si au moins un produit est CONFIRMÉ cassé (BROKEN),
 * 0 sinon (un statut UNCERTAIN — ex: AliExpress a répondu par un captcha —
 * ne fait jamais échouer le build, pour éviter les faux positifs).
 */

const fs = require("fs");
const path = require("path");
const config = require("./lib/config");
const productsStore = require("./lib/products-store");
const {
  checkAliExpressProductLive,
  checkImageReachable,
  checkAffiliateLinkResolves,
} = require("./lib/checks");

const PRODUCTS_PATH = productsStore.PRODUCTS_PATH;
const QUARANTINE_PATH = path.join(__dirname, "..", "products.quarantine.json");
const AUDIT_PATH = path.join(__dirname, "..", "products.audit.json");
const CONCURRENCY = 3; // reste courtois envers AliExpress/rzekl.com

const args = process.argv.slice(2);
const FIX = args.includes("--fix");
const JSON_OUTPUT = args.includes("--json");

const C = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function worstStatus(statuses) {
  if (statuses.includes("BROKEN")) return "BROKEN";
  if (statuses.includes("UNCERTAIN")) return "UNCERTAIN";
  return "OK";
}

async function validateProduct(p) {
  const [aliexpress, image, affiliate] = await Promise.all([
    checkAliExpressProductLive(p.id, config),
    checkImageReachable(p.img),
    checkAffiliateLinkResolves(p.id, config),
  ]);
  const overall = worstStatus([aliexpress.status, image.status, affiliate.status]);
  return { id: p.id, name: p.name, overall, aliexpress, image, affiliate };
}

async function main() {
  const products = productsStore.readProducts();

  if (!JSON_OUTPUT) {
    console.log(C.bold(`\nValidation de ${products.length} produits...\n`));
  }

  const results = await mapWithConcurrency(products, CONCURRENCY, validateProduct);

  const broken = results.filter((r) => r.overall === "BROKEN");
  const uncertain = results.filter((r) => r.overall === "UNCERTAIN");
  const ok = results.filter((r) => r.overall === "OK");

  fs.writeFileSync(
    AUDIT_PATH,
    JSON.stringify(
      { checkedAt: new Date().toISOString(), total: products.length, ok: ok.length, broken: broken.length, uncertain: uncertain.length, results },
      null,
      2
    )
  );

  if (JSON_OUTPUT) {
    console.log(JSON.stringify({ ok: ok.length, broken: broken.length, uncertain: uncertain.length, results }, null, 2));
  } else {
    for (const r of results) {
      const icon = r.overall === "OK" ? C.green("✓ OK") : r.overall === "BROKEN" ? C.red("✗ CASSÉ") : C.yellow("? INCERTAIN");
      console.log(`${icon}  ${r.id}  ${r.name}`);
      if (r.overall !== "OK") {
        if (r.aliexpress.status !== "OK") console.log(C.dim(`    · AliExpress: ${r.aliexpress.status} — ${r.aliexpress.detail}`));
        if (r.image.status !== "OK") console.log(C.dim(`    · Image: ${r.image.status} — ${r.image.detail}`));
        if (r.affiliate.status !== "OK") console.log(C.dim(`    · Lien affilié: ${r.affiliate.status} — ${r.affiliate.detail}`));
      }
    }
    console.log("");
    console.log(C.bold(`Résumé : ${C.green(ok.length + " OK")} · ${C.red(broken.length + " cassés")} · ${C.yellow(uncertain.length + " incertains")}`));
    console.log(C.dim(`Rapport détaillé écrit dans ${path.relative(process.cwd(), AUDIT_PATH)}`));
  }

  if (FIX && broken.length > 0) {
    const brokenIds = new Set(broken.map((r) => r.id));
    const remaining = products.filter((p) => !brokenIds.has(p.id));
    const quarantined = products
      .filter((p) => brokenIds.has(p.id))
      .map((p) => ({
        ...p,
        removedAt: new Date().toISOString(),
        reason: results.find((r) => r.id === p.id),
      }));

    fs.copyFileSync(PRODUCTS_PATH, PRODUCTS_PATH + ".bak");
    productsStore.writeProducts(remaining, { backup: false });

    let existingQuarantine = [];
    if (fs.existsSync(QUARANTINE_PATH)) {
      try {
        existingQuarantine = JSON.parse(fs.readFileSync(QUARANTINE_PATH, "utf8"));
      } catch (_) {}
    }
    fs.writeFileSync(QUARANTINE_PATH, JSON.stringify([...existingQuarantine, ...quarantined], null, 2));

    if (!JSON_OUTPUT) {
      console.log("");
      console.log(C.yellow(`--fix : ${broken.length} produit(s) retiré(s) de products.js`));
      console.log(C.dim(`  Sauvegarde de l'ancien fichier : products.js.bak`));
      console.log(C.dim(`  Détails déplacés dans : products.quarantine.json`));
    }
  }

  process.exit(broken.length > 0 && !FIX ? 1 : 0);
}

main().catch((err) => {
  console.error("Erreur du script de validation:", err);
  process.exit(2);
});
