const { spawn } = require("child_process");
const path = require("path");

function waitFor(proc, marker) {
  return new Promise((resolve, reject) => {
    proc.on("error", reject);
    proc.stderr.on("data", (c) => console.error("[stderr]", c.toString()));
    proc.stdout.on("data", (chunk) => {
      if (chunk.toString().includes(marker)) resolve();
    });
  });
}

async function main() {
  const target = spawn("node", [path.join(__dirname, "mock-server.js")], {
    env: { ...process.env, MOCK_PORT: "8998" },
  });
  await waitFor(target, "PORT=");
  console.log("Serveur cible démarré (8998)");

  const proxy = spawn("node", [path.join(__dirname, "mock-proxy.js")], {
    env: { ...process.env, TEST_PROXY_PORT: "8999" },
  });
  await waitFor(proxy, "PROXY_PORT=");
  console.log("Proxy démarré (8999)\n");

  process.env.SCRAPER_PROXY_URL = "http://localhost:8999";
  // Force un require frais (checks.js met le dispatcher en cache sinon)
  delete require.cache[require.resolve("../lib/proxy")];
  delete require.cache[require.resolve("../lib/checks")];
  const { checkImageReachable } = require("../lib/checks");

  const statsBefore = await (await fetch("http://localhost:8999/__proxy_stats__")).json();
  console.log("Requêtes proxy avant :", statsBefore.requestCount);

  const result = await checkImageReachable("http://localhost:8998/img-ok.jpg");
  console.log("Résultat du check (via proxy) :", JSON.stringify(result));

  const statsAfter = await (await fetch("http://localhost:8999/__proxy_stats__")).json();
  console.log("Requêtes proxy après :", statsAfter.requestCount);

  const checks = [
    ["Le check réussit toujours à travers le proxy", result.status === "OK"],
    ["Le proxy a bien vu passer au moins 1 requête", statsAfter.requestCount > statsBefore.requestCount],
  ];

  let allPass = true;
  console.log("\n── Vérifications ──");
  for (const [label, pass] of checks) {
    console.log((pass ? "\x1b[32m✓\x1b[0m " : "\x1b[31m✗\x1b[0m ") + label);
    if (!pass) allPass = false;
  }

  target.kill();
  proxy.kill();
  process.exit(allPass ? 0 : 1);
}

main().catch((err) => {
  console.error("Erreur:", err);
  process.exit(1);
});
