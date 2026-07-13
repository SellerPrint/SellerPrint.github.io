const http = require("http");

let requestCount = 0;

// Mini proxy HTTP "forward" : le client envoie une requête avec l'URL
// absolue dans la ligne de requête (comportement standard d'un proxy),
// ce proxy la relaie telle quelle et renvoie la réponse.
const proxy = http.createServer((req, res) => {
  if (req.url === "/__proxy_stats__") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ requestCount }));
    return;
  }
  requestCount++;
  const target = new URL(req.url);
  const options = {
    hostname: target.hostname,
    port: target.port || 80,
    path: target.pathname + target.search,
    method: req.method,
    headers: { ...req.headers, "x-proxied-by": "test-proxy" },
  };
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  req.pipe(proxyReq);
  proxyReq.on("error", (err) => {
    res.writeHead(502);
    res.end("Proxy error: " + err.message);
  });
});

const PORT = process.env.TEST_PROXY_PORT || 8999;
proxy.listen(PORT, () => {
  console.log("PROXY_PORT=" + PORT);
});

process.on("SIGTERM", () => proxy.close());

// Permet au script parent de connaître le nombre de requêtes passées
// par le proxy via une petite route d'introspection.
proxy.on("request", () => {});
setInterval(() => {}, 1 << 30); // garde le process vivant
module.exports = { getCount: () => requestCount };
