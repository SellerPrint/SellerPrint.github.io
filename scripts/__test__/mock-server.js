const http = require("http");

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  if (url.pathname === "/item/FORBIDDEN.html") {
    res.writeHead(403, { "Content-Type": "text/html" });
    res.end("<html><body>Forbidden</body></html>");
    return;
  }

  if (url.pathname === "/img-403.jpg") {
    res.writeHead(403, { "Content-Type": "text/html" });
    res.end("Forbidden");
    return;
  }

  if (url.pathname === "/category-listing-with-hints") {
    const host = req.headers.host;
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      "<html><body>" +
        '<a href="/item/9990000201.html">Voir</a>' +
        '<a href="/item/9990000203.html">Voir</a>' +
        '<script>window.runParams = {"data":{"root":{"fields":{"mods":{"itemList":{"content":[' +
        `{"productId": 9990000201, "title": "Produit trouvé via hint catégorie", "image": "http://${host}/img-ok.jpg"},` +
        `{"productId": 9990000203, "title": "Second produit via hint", "image": "http://${host}/img-ok.jpg"}` +
        "]}}}}}};</script>" +
        "</body></html>"
    );
    return;
  }

  // Simule le VRAI scénario rencontré : la fiche produit individuelle est
  // bloquée par anti-bot, même pour un produit dont l'ID a été trouvé via
  // la page catégorie avec hints ci-dessus.
  if (url.pathname === "/item/9990000201.html" || url.pathname === "/item/9990000203.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<html><body>Please verify you are human - captcha challenge</body></html>");
    return;
  }

  if (url.pathname === "/category-listing") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      "<html><body>" +
        '<a href="/item/9990000001.html">Produit A</a>' +
        '<a href="/item/9990000002.html">Produit B</a>' +
        '<a href="/item/9990000099.html">Produit mort</a>' +
        "</body></html>"
    );
    return;
  }

  if (url.pathname === "/category-listing-empty") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<html><body>Aucun produit ici (page vide ou anti-bot)</body></html>");
    return;
  }

  if (url.pathname === "/category-listing-broken-source") {
    res.writeHead(500, { "Content-Type": "text/html" });
    res.end("erreur serveur");
    return;
  }

  if (url.pathname === "/item/DEAD.html" || url.pathname === "/item/9990000099.html") {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("<html><body>Not found</body></html>");
    return;
  }

  if (url.pathname === "/item/CAPTCHA.html") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<html><body>Please verify you are human - captcha challenge</body></html>");
    return;
  }

  if (url.pathname.startsWith("/item/")) {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(
      "<html><head>" +
        '<meta property="og:title" content="Produit Test Auto-Détecté">' +
        `<meta property="og:image" content="http://${req.headers.host}/img-ok.jpg">` +
        "</head><body>Produit disponible, ajouter au panier</body></html>"
    );
    return;
  }

  if (url.pathname === "/img-ok.jpg") {
    res.writeHead(200, { "Content-Type": "image/jpeg" });
    res.end(Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    return;
  }

  if (url.pathname === "/img-404.jpg") {
    res.writeHead(404, { "Content-Type": "text/html" });
    res.end("not found");
    return;
  }

  if (url.pathname === "/img-hotlink-protected.jpg") {
    // Simule le VRAI comportement du CDN AliExpress rencontré en prod :
    // laisse passer une requête sans Referer (ex: script Node "nu"), mais
    // bloque quand un Referer tiers est présent (ex: <img> chargée depuis
    // sellerprint.github.io) -> exactement ce qui rendait le catalogue
    // affiché "12 produits annoncés, 2 visibles".
    if (req.headers.referer) {
      res.writeHead(403, { "Content-Type": "text/html" });
      res.end("Forbidden - hotlink protection");
      return;
    }
    res.writeHead(200, { "Content-Type": "image/jpeg" });
    res.end(Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
    return;
  }

  if (url.pathname === "/affiliate-no-redirect-clean") {
    // Simule un service qui répond normalement (200) sans jamais rediriger
    // -> vrai signal de lien mal formé
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<html><body>Ce service ne redirige jamais</body></html>");
    return;
  }

  if (url.pathname === "/affiliate-blocked") {
    // Simule un blocage réseau/anti-bot ambigu (ex: proxy sandbox) sur le
    // service d'affiliation lui-même -> ne doit jamais être classé cassé
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  if (url.pathname === "/affiliate-ok") {
    // Simule un lien affilié qui redirige correctement vers le produit
    const target = url.searchParams.get("ulp");
    res.writeHead(302, { Location: target });
    res.end();
    return;
  }

  if (url.pathname === "/affiliate-broken") {
    // Simule un programme Admitad qui ne reconnaît pas le produit ->
    // redirige vers la home AliExpress au lieu du produit demandé
    res.writeHead(302, { Location: `http://${req.headers.host}/home-fallback` });
    res.end();
    return;
  }

  if (url.pathname === "/home-fallback") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<html><body>AliExpress home fallback</body></html>");
    return;
  }

  res.writeHead(404);
  res.end("not found");
});

const PORT = process.env.MOCK_PORT || 8998;
server.listen(PORT, () => {
  console.log("PORT=" + PORT);
});
