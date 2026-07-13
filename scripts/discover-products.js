#!/usr/bin/env node
/**
 * scripts/discover-products.js
 *
 * Fait grossir products.js automatiquement en scrapant des pages de
 * catégorie/recherche AliExpress (configurées dans
 * scripts/discovery-sources.json), jusqu'à atteindre `targetCount`
 * produits (défaut 100). Chaque candidat trouvé passe par EXACTEMENT
 * la même vérification que scripts/add-product.js (scripts/lib/resolve-candidate.js)
 * avant d'être ajouté — aucun produit non vérifié n'entre dans le catalogue.
 *
 * ⚠️ Limite honnête : ce script scrape le HTML brut renvoyé par un simple
 * fetch() Node (pas de navigateur headless, pas d'exécution JS). Les pages
 * `/w/wholesale-*.html` d'AliExpress semblent conçues pour être indexées
 * par les moteurs de recherche (meta description, robots:index) et j'ai
 * confirmé qu'un contenu exploitable (liens /item/ID.html) en est
 * extractible via un fetch — mais si AliExpress sert un contenu différent
 * à ce script (détection anti-bot, A/B test, changement de structure), le
 * nombre de candidats trouvés tombera à zéro pour cette source : le
 * script le signale clairement plutôt que d'échouer silencieusement.
 * Si ça devient systématique, la vraie solution robuste est l'API
 * officielle d'affiliation (Admitad product feed ou AliExpress Open
 * Platform), qui demande tes propres identifiants API — dis-le moi si tu
 * veux qu'on branche ça à la place.
 *
 * Usage :
 *   node scripts/discover-products.js
 *   node scripts/discover-products.js --target=150 --max-new=25
 *   node scripts/discover-products.js --dry-run   (n'écrit rien, montre juste ce qui serait ajouté)
 */

const fs = require("fs");
const path = require("path");
const productsStore = require("./lib/products-store");
const discoveryStore = require("./lib/discovery-store");
const { resolveCandidate } = require("./lib/resolve-candidate");
const { mapWithConcurrency } = require("./lib/concurrency");
const { getFetchImpl } = require("./lib/proxy");

const SOURCES_PATH = path.join(__dirname, "discovery-sources.json");
const CONCURRENCY = 2; // scraping + validation : reste discret

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const C = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

function parseArgs(argv) {
  const out = { dryRun: false };
  for (const arg of argv) {
    if (arg === "--dry-run") out.dryRun = true;
    const m = arg.match(/^--target=(\d+)$/);
    if (m) out.target = parseInt(m[1], 10);
    const m2 = arg.match(/^--max-new=(\d+)$/);
    if (m2) out.maxNew = parseInt(m2[1], 10);
  }
  return out;
}

function extractCandidateIds(html) {
  const re = /\/item\/(\d{10,20})\.html/g;
  const ids = new Set();
  let m;
  while ((m = re.exec(html)) !== null) ids.add(m[1]);
  return [...ids];
}

async function scrapeSource(source) {
  try {
    const { fetchFn, dispatcher } = getFetchImpl();
    const res = await fetchFn(source.url, { headers: { "User-Agent": UA }, dispatcher });
    const body = await res.text();
    const ids = extractCandidateIds(body);
    return { source, ids, error: null };
  } catch (err) {
    return { source, ids: [], error: err.message };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourcesConfig = JSON.parse(fs.readFileSync(SOURCES_PATH, "utf8"));
  const targetCount = args.target || sourcesConfig.targetCount || 100;
  const maxNewPerRun = args.maxNew || sourcesConfig.maxNewPerRun || 15;

  const existing = productsStore.readProducts();
  const existingIds = new Set(existing.map((p) => p.id));

  console.log(C.bold(`\nCatalogue actuel : ${existing.length} produits (cible : ${targetCount})\n`));

  if (existing.length >= targetCount) {
    console.log(C.green(`Cible déjà atteinte (${existing.length} ≥ ${targetCount}), rien à faire.`));
    return;
  }

  const seen = discoveryStore.readSeen();
  const needed = targetCount - existing.length;
  const toFind = Math.min(needed, maxNewPerRun);

  console.log(`Scraping de ${sourcesConfig.sources.length} source(s) pour trouver jusqu'à ${toFind} nouveau(x) produit(s)...\n`);

  const scraped = await mapWithConcurrency(sourcesConfig.sources, CONCURRENCY, scrapeSource);

  let totalCandidatesFound = 0;
  let candidatesToTry = [];

  for (const { source, ids, error } of scraped) {
    if (error) {
      console.log(C.yellow(`? ${source.url} — erreur réseau (${error}), source ignorée`));
      continue;
    }
    totalCandidatesFound += ids.length;
    const fresh = ids.filter((id) => !existingIds.has(id) && !discoveryStore.shouldSkip(seen, id));
    console.log(C.dim(`  ${source.url} → ${ids.length} lien(s) produit trouvé(s), ${fresh.length} nouveau(x) à vérifier`));
    fresh.forEach((id) => candidatesToTry.push({ id, cat: source.cat }));
  }

  if (totalCandidatesFound === 0) {
    console.log(C.yellow("\n⚠️  Aucun lien produit trouvé sur AUCUNE source. AliExpress sert probablement"));
    console.log(C.yellow("   un contenu différent à ce script (anti-bot, structure changée). Voir le"));
    console.log(C.yellow("   commentaire en haut de scripts/discover-products.js pour l'alternative (API officielle)."));
  }

  // dédoublonne les candidats (plusieurs sources peuvent trouver le même id)
  const seenThisRun = new Set();
  candidatesToTry = candidatesToTry.filter((c) => {
    if (seenThisRun.has(c.id)) return false;
    seenThisRun.add(c.id);
    return true;
  });

  candidatesToTry = candidatesToTry.slice(0, toFind * 3); // marge car tous ne passeront pas la validation

  console.log(`\nVérification de ${candidatesToTry.length} candidat(s) (objectif : ${toFind} ajouts)...\n`);

  const added = [];
  const rejected = [];

  // Traite séquentiellement par petits lots pour pouvoir s'arrêter dès que
  // l'objectif du run est atteint sans gaspiller de requêtes inutiles.
  for (let i = 0; i < candidatesToTry.length && added.length < toFind; i += CONCURRENCY) {
    const batch = candidatesToTry.slice(i, i + CONCURRENCY);
    const results = await mapWithConcurrency(batch, CONCURRENCY, async (c) => {
      const result = await resolveCandidate(c.id, { cat: c.cat }, { strict: false });
      return { c, result };
    });

    for (const { c, result } of results) {
      if (result.ok) {
        console.log(C.green(`  ✓ ${c.id} — ${result.product.name}`));
        added.push(result.product);
        discoveryStore.markSeen(seen, c.id, "added");
      } else {
        console.log(C.dim(`  · ${c.id} rejeté — ${result.reason}`));
        rejected.push({ id: c.id, reason: result.reason });
        discoveryStore.markSeen(seen, c.id, "rejected", result.reason);
      }
    }
  }

  if (!args.dryRun) {
    discoveryStore.writeSeen(seen);
  }

  console.log("");
  console.log(C.bold(`Résumé : ${C.green(added.length + " ajoutés")} · ${rejected.length} rejetés · ${candidatesToTry.length - added.length - rejected.length} non essayés`));

  if (added.length > 0) {
    if (args.dryRun) {
      console.log(C.yellow("\n--dry-run : rien n'a été écrit dans products.js. Produits qui auraient été ajoutés :"));
      console.log(JSON.stringify(added, null, 2));
    } else {
      productsStore.writeProducts([...existing, ...added]);
      console.log(C.green(`\n${added.length} produit(s) ajouté(s) à products.js (catalogue : ${existing.length + added.length}/${targetCount}).`));
    }
  } else {
    console.log(C.yellow("\nAucun produit ajouté ce run."));
  }
}

main().catch((err) => {
  console.error("Erreur du script de découverte:", err);
  process.exit(2);
});
