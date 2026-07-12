#!/usr/bin/env node
/**
 * scripts/add-product.js
 *
 * Ajoute un produit à products.js à partir d'une simple URL AliExpress,
 * au lieu du copier-coller manuel (source d'erreurs : mauvaise image,
 * ID mal recopié, lien non testé...).
 *
 * Ce que le script fait AVANT d'écrire quoi que ce soit :
 *   1. Extrait l'ID produit depuis l'URL.
 *   2. Vérifie que le produit est bien en ligne (même logique que
 *      scripts/validate-products.js).
 *   3. Essaie d'auto-remplir le nom et l'image depuis les balises
 *      og:title / og:image de la page (peut échouer -> précise --name/--img).
 *   4. Vérifie que l'image trouvée (ou fournie) est bien accessible.
 *   5. Vérifie que le lien affilié (rzekl.com/Admitad) redirige bien vers
 *      CE produit.
 * Si une de ces vérifications échoue, RIEN n'est écrit dans products.js.
 *
 * Usage :
 *   node scripts/add-product.js "https://www.aliexpress.com/item/1005XXXXXXXXXXX.html" --cat=textile
 *   node scripts/add-product.js 1005XXXXXXXXXXX --cat=deco --badge=Nouveau --name="..." --desc="..." --img="..."
 *
 * Options :
 *   --cat=textile|deco|accessoire   (obligatoire)
 *   --name="..."                    (sinon auto-détecté depuis og:title)
 *   --desc="..."                    (sinon générique, à corriger à la main)
 *   --badge="Nouveau"               (optionnel)
 *   --img="https://..."             (sinon auto-détecté depuis og:image)
 *   --force                         (ignore l'avertissement lien affilié incertain)
 */

const config = require("./lib/config");
const productsStore = require("./lib/products-store");
const {
  checkAliExpressProductLive,
  checkImageReachable,
  checkAffiliateLinkResolves,
} = require("./lib/checks");

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
    if (m) {
      out[m[1]] = m[2];
    } else if (arg === "--force") {
      out.force = true;
    } else {
      out._.push(arg);
    }
  }
  return out;
}

function extractProductId(input) {
  const m = String(input).match(/(\d{10,20})/);
  return m ? m[1] : null;
}

function extractMeta(html, property) {
  const re = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  const m = html.match(re);
  if (m) return m[1];
  // essaie l'ordre inverse content puis property
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`,
    "i"
  );
  const m2 = html.match(re2);
  return m2 ? m2[1] : null;
}

async function fetchAliexpressPage(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });
  const body = await res.text();
  return { status: res.status, body };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args._.length === 0) {
    console.error(C.red("Usage: node scripts/add-product.js <url-ou-id-aliexpress> --cat=textile|deco|accessoire [--name=] [--desc=] [--badge=] [--img=]"));
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

  // 1) Le produit est-il en ligne ?
  console.log("→ Vérification AliExpress...");
  const live = await checkAliExpressProductLive(productId, config);
  if (live.status === "BROKEN") {
    console.error(C.red(`✗ Produit introuvable sur AliExpress : ${live.detail}`));
    console.error(C.red("  Rien n'a été ajouté à products.js."));
    process.exit(1);
  }
  if (live.status === "UNCERTAIN" && !args.force) {
    console.error(C.yellow(`? Impossible de confirmer que le produit est en ligne : ${live.detail}`));
    console.error(C.yellow("  Relance avec --force si tu es sûr que le produit existe bien."));
    process.exit(1);
  }
  console.log(C.green("✓ Produit accessible"));

  // 2) Auto-détection nom/image depuis la page (best effort)
  let name = args.name;
  let img = args.img;
  let desc = args.desc;

  if (!name || !img) {
    console.log("→ Tentative d'auto-détection du titre/image (og:title, og:image)...");
    try {
      const { body } = await fetchAliexpressPage(config.buildAliUrl(productId));
      if (!name) {
        const ogTitle = extractMeta(body, "og:title");
        if (ogTitle) {
          name = ogTitle;
          console.log(C.green(`  Titre détecté : ${name}`));
        }
      }
      if (!img) {
        const ogImage = extractMeta(body, "og:image");
        if (ogImage) {
          img = ogImage;
          console.log(C.green(`  Image détectée : ${img}`));
        }
      }
    } catch (err) {
      console.log(C.yellow(`  Auto-détection impossible (${err.message}), passe par --name/--img.`));
    }
  }

  if (!name) {
    console.error(C.red("Impossible de déterminer le nom du produit — fournis --name=\"...\""));
    process.exit(2);
  }
  if (!img) {
    console.error(C.red("Impossible de déterminer l'image du produit — fournis --img=\"...\""));
    process.exit(2);
  }
  if (!desc) {
    desc = "Description à compléter.";
    console.log(C.yellow(`  Pas de --desc fourni, description générique utilisée (à corriger dans products.js).`));
  }

  // 3) L'image est-elle vraiment accessible ?
  console.log("→ Vérification de l'image...");
  const imageCheck = await checkImageReachable(img);
  if (imageCheck.status === "BROKEN") {
    console.error(C.red(`✗ Image inaccessible : ${imageCheck.detail}`));
    console.error(C.red("  Rien n'a été ajouté à products.js."));
    process.exit(1);
  }
  if (imageCheck.status === "UNCERTAIN" && !args.force) {
    console.error(C.yellow(`? Image non confirmée : ${imageCheck.detail} (relance avec --force pour ignorer)`));
    process.exit(1);
  }
  console.log(C.green("✓ Image accessible"));

  // 4) Le lien affilié redirige-t-il bien vers CE produit ?
  console.log("→ Vérification du lien affilié (Admitad/rzekl.com)...");
  const affiliateCheck = await checkAffiliateLinkResolves(productId, config);
  if (affiliateCheck.status === "BROKEN") {
    console.error(C.red(`✗ Lien affilié invalide : ${affiliateCheck.detail}`));
    console.error(C.red("  Ce produit semble incompatible avec le programme d'affiliation actuel."));
    console.error(C.red("  Rien n'a été ajouté à products.js."));
    process.exit(1);
  }
  if (affiliateCheck.status === "UNCERTAIN" && !args.force) {
    console.error(C.yellow(`? Lien affilié non confirmé : ${affiliateCheck.detail} (relance avec --force pour ignorer)`));
    process.exit(1);
  }
  console.log(C.green("✓ Lien affilié valide"));

  const newProduct = {
    id: productId,
    name,
    desc,
    badge: args.badge || "",
    cat: args.cat,
    img,
  };

  productsStore.writeProducts([...existing, newProduct]);

  console.log("");
  console.log(C.green(C.bold(`✓ Produit ajouté à products.js (sauvegarde dans products.js.bak)`)));
  console.log(JSON.stringify(newProduct, null, 2));
  console.log("");
  console.log(C.yellow("Pense à relire desc/badge avant de publier, et à lancer scripts/validate-products.js avant de commit."));
}

main().catch((err) => {
  console.error("Erreur du script d'ajout:", err);
  process.exit(2);
});
