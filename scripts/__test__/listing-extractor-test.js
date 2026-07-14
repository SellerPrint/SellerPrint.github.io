const { extractListingHints } = require("../lib/listing-extractor");

let pass = 0, fail = 0;
function assert(label, cond) {
  if (cond) { console.log(`  \x1b[32m✓\x1b[0m ${label}`); pass++; }
  else { console.log(`  \x1b[31m✗\x1b[0m ${label}`); fail++; }
}

// Échantillon synthétique : simule le pattern courant "gros blob JSON de
// listing embarqué dans un <script>" avec du bruit autour (comme un vrai
// script contient plein d'autres données/fonctions sans rapport).
const syntheticHtml = `
<html><head></head><body>
<div class="list">
  <a href="/item/1111111111.html">Voir</a>
  <a href="/item/2222222222.html">Voir</a>
  <a href="/item/3333333333.html">Voir</a>
</div>
<script>
  window.someUnrelatedThing = function() { return { a: 1 }; };
</script>
<script>
  window.runParams = {"data":{"root":{"fields":{"mods":{"itemList":{"content":[
    {"productId": 1111111111, "title": "T-shirt personnalisé homme coton bio", "image": "//ae-pic-a1.aliexpress-media.com/kf/abc111.jpg", "price": "7.99"},
    {"productId": 2222222222, "title": "Hoodie oversize impression photo", "image": "https://ae-pic-a1.aliexpress-media.com/kf/abc222.jpg", "price": "12.40"},
    {"productId": 9999999999, "title": "Produit non demandé", "image": "https://ae-pic-a1.aliexpress-media.com/kf/other.jpg"}
  ]}}}}}};
</script>
<script>
  // Un candidat (3333333333) apparaît dans un script mais SANS titre/image valides
  var partial = {"productId": 3333333333, "note": "pas de titre ni image ici"};
</script>
</body></html>
`;

console.log("1) Extraction depuis un blob JSON embarqué (2 sur 3 candidats ont titre+image)");
const result = extractListingHints(syntheticHtml, ["1111111111", "2222222222", "3333333333"]);
assert("1111111111 trouvé", result.hints.has("1111111111"));
assert("2222222222 trouvé", result.hints.has("2222222222"));
assert("3333333333 absent (pas de titre/image dans son objet)", !result.hints.has("3333333333"));
assert("titre correct pour 1111111111", result.hints.get("1111111111")?.name === "T-shirt personnalisé homme coton bio");
assert("image avec schéma corrigé (// -> https://)", result.hints.get("1111111111")?.img === "https://ae-pic-a1.aliexpress-media.com/kf/abc111.jpg");
assert("image déjà avec schéma laissée telle quelle", result.hints.get("2222222222")?.img === "https://ae-pic-a1.aliexpress-media.com/kf/abc222.jpg");
assert("stats.scriptCount == 3", result.stats.scriptCount === 3);
assert("stats.scriptsWithCandidateId == 2 (le script sans rapport est ignoré)", result.stats.scriptsWithCandidateId === 2);

console.log("\n2) Aucun candidat présent dans le HTML -> aucun hint, pas de crash");
const result2 = extractListingHints("<html><script>var x = {a:1}</script></html>", ["1234567890123"]);
assert("aucun hint trouvé", result2.hints.size === 0);
assert("pas de crash, stats renvoyées", typeof result2.stats.scriptCount === "number");

console.log("\n3) HTML sans balise script -> pas de crash");
const result3 = extractListingHints("<html><body>Rien ici</body></html>", ["123"]);
assert("aucun hint", result3.hints.size === 0);

console.log("\n4) JSON malformé dans un script -> ignoré proprement, pas de crash");
const brokenHtml = `<script>var x = {productId: 555, "title": "sans guillemets sur la clé"}; // JSON invalide</script>`;
const result4 = extractListingHints(brokenHtml, ["555"]);
assert("pas de crash sur JSON invalide", result4.hints.size === 0);

console.log(`\n${pass} passés, ${fail} échoués\n`);
process.exit(fail > 0 ? 1 : 0);
