const { spawn } = require("child_process");
const path = require("path");

async function main() {
  const serverProc = spawn("node", [path.join(__dirname, "mock-server.js")]);
  const port = await new Promise((resolve) => {
    serverProc.stdout.on("data", (chunk) => {
      const m = chunk.toString().match(/PORT=(\d+)/);
      if (m) resolve(m[1]);
    });
  });

  const base = `http://localhost:${port}`;
  const config = {
    aliexpressBase: base + "/item/",
    admitadBase: base + "/affiliate-ok?ulp=",
    buildAliUrl(id) {
      return this.aliexpressBase + id + ".html";
    },
    buildAffiliateUrl(id) {
      return this.admitadBase + encodeURIComponent(this.buildAliUrl(id));
    },
  };
  const brokenAffiliateConfig = {
    ...config,
    buildAffiliateUrl(id) {
      return base + "/affiliate-broken?ulp=" + encodeURIComponent(this.buildAliUrl(id));
    },
  };

  const { checkAliExpressProductLive, checkImageReachable, checkAffiliateLinkResolves } = require("../lib/checks");

  const tests = [];
  let pass = 0, fail = 0;

  function assertStatus(label, actual, expected) {
    tests.push([label, actual, expected]);
    if (actual === expected) {
      console.log(`  \x1b[32m✓\x1b[0m ${label} -> ${actual}`);
      pass++;
    } else {
      console.log(`  \x1b[31m✗\x1b[0m ${label} -> attendu ${expected}, obtenu ${actual}`);
      fail++;
    }
  }

  console.log("\n1) Produit AliExpress vivant");
  assertStatus("GOOD product", (await checkAliExpressProductLive("GOOD", config)).status, "OK");

  console.log("\n2) Produit AliExpress supprimé (404)");
  assertStatus("DEAD product", (await checkAliExpressProductLive("DEAD", config)).status, "BROKEN");

  console.log("\n3) Produit AliExpress bloqué par anti-bot/captcha");
  assertStatus("CAPTCHA product", (await checkAliExpressProductLive("CAPTCHA", config)).status, "UNCERTAIN");

  console.log("\n4) Image valide");
  assertStatus("Image OK", (await checkImageReachable(base + "/img-ok.jpg")).status, "OK");

  console.log("\n5) Image cassée (404)");
  assertStatus("Image 404", (await checkImageReachable(base + "/img-404.jpg")).status, "BROKEN");

  console.log("\n6) Lien affilié qui redirige correctement vers le produit");
  assertStatus("Affiliate OK", (await checkAffiliateLinkResolves("GOOD", config)).status, "OK");

  console.log("\n7) Lien affilié incompatible programme (redirige vers page générique)");
  assertStatus("Affiliate broken", (await checkAffiliateLinkResolves("GOOD", brokenAffiliateConfig)).status, "BROKEN");

  console.log("\n8) Produit qui renvoie 403 (proxy/anti-bot ambigu) -> ne doit JAMAIS être OK ni BROKEN à tort");
  assertStatus("Product 403", (await checkAliExpressProductLive("FORBIDDEN", config)).status, "UNCERTAIN");

  console.log("\n9) Image qui renvoie 403 (protection anti-hotlink) -> incertain, pas cassé à tort");
  assertStatus("Image 403", (await checkImageReachable(base + "/img-403.jpg")).status, "UNCERTAIN");

  console.log("\n9bis) Image protégée anti-hotlink, vérifiée SANS Referer (ancien comportement) -> ne détecte rien, faux OK");
  assertStatus("Hotlink image without Referer", (await checkImageReachable(base + "/img-hotlink-protected.jpg")).status, "OK");

  console.log("\n9ter) Même image, vérifiée AVEC le Referer du site (correctif) -> détecte le vrai blocage");
  assertStatus("Hotlink image with Referer", (await checkImageReachable(base + "/img-hotlink-protected.jpg", base + "/")).status, "BROKEN");

  const noRedirectCleanConfig = { ...config, buildAffiliateUrl(id) { return base + "/affiliate-no-redirect-clean?ulp=" + encodeURIComponent(this.buildAliUrl(id)); } };
  console.log("\n10) Lien affilié qui répond 200 SANS jamais rediriger -> incertain (peut être anti-bot), jamais cassé à tort");
  assertStatus("Affiliate no-redirect clean", (await checkAffiliateLinkResolves("GOOD", noRedirectCleanConfig)).status, "UNCERTAIN");

  const blockedConfig = { ...config, buildAffiliateUrl(id) { return base + "/affiliate-blocked?ulp=" + encodeURIComponent(this.buildAliUrl(id)); } };
  console.log("\n11) Lien affilié bloqué de façon ambiguë (403, proxy/anti-bot) -> incertain, pas cassé à tort");
  assertStatus("Affiliate blocked ambiguous", (await checkAffiliateLinkResolves("GOOD", blockedConfig)).status, "UNCERTAIN");

  console.log(`\n${pass} passés, ${fail} échoués\n`);
  serverProc.kill();
  process.exit(fail > 0 ? 1 : 0);
}

main();
