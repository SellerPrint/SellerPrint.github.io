/**
 * scripts/lib/listing-extractor.js
 *
 * Les fiches produit individuelles AliExpress (/item/ID.html) sont
 * bloquées par anti-bot depuis les IPs GitHub Actions (confirmé par des
 * runs réels — voir scripts/README.md). Les pages de catégorie
 * (/w/wholesale-*.html) ne le sont PAS : le scraping y trouve bien de
 * vrais liens produit. Beaucoup de sites e-commerce embarquent les
 * données complètes de la liste de produits (titre, image, prix...) dans
 * un blob JSON caché à l'intérieur d'une balise <script>, pour
 * l'hydratation côté client — c'est ce qu'on tente d'extraire ici, pour
 * ne JAMAIS avoir à toucher la fiche produit individuelle bloquée.
 *
 * ⚠️ Honnêteté : cette extraction est un pari éclairé basé sur des
 * patterns courants (pas une certitude vérifiée sur du vrai HTML
 * AliExpress — impossible à tester depuis mon environnement, ce domaine
 * y est aussi bloqué). Elle ne cherche PAS un nom de variable JS précis
 * (fragile, change facilement) mais scanne génériquement tout objet JSON
 * embarqué qui référence un des IDs produit déjà trouvés par
 * extractCandidateIds(), avec un champ titre et une URL d'image à côté.
 * Si elle ne trouve rien, `stats` donne assez d'info pour affiner au
 * prochain essai plutôt que de deviner à l'aveugle.
 */

const ID_FIELDS = ["productId", "product_id", "itemId", "item_id", "id", "productID"];
const NAME_FIELDS = ["title", "subject", "productTitle", "displayName", "name"];
const IMG_FIELDS = ["image", "imageUrl", "img", "imgUrl", "picUrl", "imageURL", "mainImage"];
const MAX_JSON_ATTEMPTS_PER_SCRIPT = 25;
const MAX_WALK_DEPTH = 8;

function extractScriptBlocks(html) {
  const blocks = [];
  const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) blocks.push(m[1]);
  return blocks;
}

/**
 * Extrait un objet/tableau JSON équilibré à partir de l'index d'une
 * accolade/crochet ouvrant, en respectant les chaînes de caractères
 * (une accolade dans une chaîne ne doit pas compter).
 */
function findBalancedJson(str, startIdx) {
  const open = str[startIdx];
  const close = open === "{" ? "}" : open === "[" ? "]" : null;
  if (!close) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return str.slice(startIdx, i + 1);
    }
  }
  return null; // jamais équilibré (script tronqué ou faux positif)
}

function pickField(node, fields) {
  for (const f of fields) {
    if (typeof node[f] === "string" && node[f].trim().length > 0) return node[f];
  }
  return null;
}

function walkForProducts(node, candidateIds, found, depth) {
  if (depth > MAX_WALK_DEPTH || found.size >= candidateIds.size) return;
  if (Array.isArray(node)) {
    for (const item of node) {
      walkForProducts(item, candidateIds, found, depth + 1);
      if (found.size >= candidateIds.size) return;
    }
    return;
  }
  if (node && typeof node === "object") {
    let matchedId = null;
    for (const f of ID_FIELDS) {
      if (node[f] != null && candidateIds.has(String(node[f]))) {
        matchedId = String(node[f]);
        break;
      }
    }
    if (matchedId && !found.has(matchedId)) {
      const name = pickField(node, NAME_FIELDS);
      let img = pickField(node, IMG_FIELDS);
      if (img && img.startsWith("//")) img = "https:" + img; // AliExpress omet souvent le schéma
      if (name && img && /^https?:\/\//.test(img)) {
        found.set(matchedId, { name, img });
      }
    }
    for (const key of Object.keys(node)) {
      walkForProducts(node[key], candidateIds, found, depth + 1);
      if (found.size >= candidateIds.size) return;
    }
  }
}

/**
 * @param {string} html Le HTML brut de la page de catégorie/listing.
 * @param {string[]} candidateIdsArray IDs produit déjà extraits des liens.
 * @returns {{ hints: Map<string,{name:string,img:string}>, stats: object }}
 */
function extractListingHints(html, candidateIdsArray) {
  const candidateIds = new Set(candidateIdsArray.map(String));
  const found = new Map();
  const scripts = extractScriptBlocks(html);
  const stats = {
    scriptCount: scripts.length,
    scriptsWithCandidateId: 0,
    jsonBlobsParsed: 0,
    largestScriptSize: 0,
  };

  for (const script of scripts) {
    stats.largestScriptSize = Math.max(stats.largestScriptSize, script.length);
    const containsCandidate = candidateIdsArray.some((id) => script.includes(String(id)));
    if (!containsCandidate) continue;
    stats.scriptsWithCandidateId++;

    const assignRe = /[=:(]\s*([{[])/g;
    let m;
    let attempts = 0;
    while ((m = assignRe.exec(script)) !== null && attempts < MAX_JSON_ATTEMPTS_PER_SCRIPT) {
      attempts++;
      const startIdx = m.index + m[0].length - 1;
      const raw = findBalancedJson(script, startIdx);
      if (!raw || raw.length < 50) continue;
      try {
        const parsed = JSON.parse(raw);
        stats.jsonBlobsParsed++;
        walkForProducts(parsed, candidateIds, found, 0);
      } catch (_) {
        // Pas un JSON valide à cet endroit précis — normal, on continue
        // d'essayer les autres occurrences du même script.
      }
      if (found.size >= candidateIds.size) break;
    }
    if (found.size >= candidateIds.size) break;
  }

  return { hints: found, stats };
}

module.exports = { extractListingHints, findBalancedJson, extractScriptBlocks };
