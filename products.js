/**
 * SellerPrint — Catalogue produits avec vraies images AliExpress
 * Images hébergées sur : ae-pic-a1.aliexpress-media.com (CDN officiel AliExpress)
 * IDs produits réels — liens affiliés via rzekl.com
 */
const products = [
  {
    id: "1005007708806246",
    name: "T-shirt custom all-over print",
    desc: "Impression totale HD, 100% coton, unisexe. Envoyez votre design.",
    badge: "Bestseller",
    cat: "textile",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S63e9ee3c3f594b77a1d3c972a9d85c33B.jpg"
  },
  {
    id: "1005008084751945",
    name: "Hoodie oversize personnalisable",
    desc: "Sweat à capuche unisexe, impression DTG haute définition.",
    badge: "",
    cat: "textile",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S7935b82d01ea42b7a2219f9a7a131f3a8.jpg"
  },
  {
    id: "1005006266462340",
    name: "Casquette snapback brodée",
    desc: "Broderie 3D personnalisée, réglable, 6 coloris disponibles.",
    badge: "",
    cat: "textile",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S5dea27d68d5042d58562a2f120531d88U.jpg"
  },
  {
    id: "1005009499378197",
    name: "Coussin photo personnalisé",
    desc: "Housse lavable 45×45 cm, impression HD sur tissu doux.",
    badge: "",
    cat: "deco",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S59c5e2b5ca0e47a0a011e633eb7afcdaD.jpg"
  },
  {
    id: "1005009553808835",
    name: "Tableau Diamond Art mural",
    desc: "Kit diamond painting 30×30 cm, effet mosaïque brillante.",
    badge: "Nouveau",
    cat: "deco",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S8555512a36a64d50b0dc6b65e09e8f98R.jpg"
  },
  {
    id: "1005008882491044",
    name: "Lampe LED photo gravée",
    desc: "Veilleuse acrylique gravure photo, 3 températures de lumière.",
    badge: "Bestseller",
    cat: "deco",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S845d3b5d74bd45c1b2b84ab6a890c184b.jpg"
  },
  {
    id: "1005008063787016",
    name: "Tote bag canvas personnalisé",
    desc: "Coton naturel robuste, impression ou broderie prénom/logo.",
    badge: "Nouveau",
    cat: "accessoire",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S5c395693e7ca49a9b14d390594ab4b111.jpg"
  },
  {
    id: "1005008246951274",
    name: "Stickers vinyle waterproof",
    desc: "Vinyle imprimé UV, résistant eau & soleil, livré par lot.",
    badge: "",
    cat: "accessoire",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S9a7df571e6124cb59ae5fe86f2704a5bb.jpg"
  },
  {
    id: "1005005616306760",
    name: "Porte-clés gravé laser",
    desc: "Inox brossé premium, gravure laser prénom/photo.",
    badge: "",
    cat: "accessoire",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/Sef23dadd2d0d4019a1a1529e1feaf9edT.jpg"
  },
  {
    id: "1005006817254451",
    name: "Carnet photo personnalisé",
    desc: "Couverture rigide imprimée, format A5, idéal cadeau.",
    badge: "Nouveau",
    cat: "accessoire",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/Se9639795351a4c3d815327e6db81bc04g.jpg"
  },
  {
    id: "1005006283748095",
    name: "Puzzle photo acrylique",
    desc: "Cadre acrylique transparent avec photo insérée, format cœur.",
    badge: "",
    cat: "deco",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S81a52be01d3b48f397beabd9d6dc45d4B.jpg"
  },
  {
    id: "1005009842192249",
    name: "Plaid photo personnalisé",
    desc: "Couverture polaire HD avec ta photo, 130×150 cm.",
    badge: "",
    cat: "deco",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/Sd0c6ef2c6dce411db87d764e16c177abB.jpg"
  }
];

// Expose globally so other scripts (index.html) can read window.products.
// (top-level `const` does NOT attach to window like `var` does — without
// this line the homepage product grid stays empty for every visitor.)
window.products = products;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = products;
}
