/**
 * SellerPrint — Catalogue produits avec vraies images AliExpress
 * Images hébergées sur : ae-pic-a1.aliexpress-media.com (CDN officiel AliExpress)
 * IDs produits réels — liens affiliés via rzekl.com
 */
const products = [
  {
    id: "1005007708806246",
    name: "T-shirt custom all-over print",
    desc: "Impression sublimation haute définition sur toute la surface du tissu, sans zones blanches ni craquelures dans le temps. Coupe unisexe 100% coton du S au XXL — envoyez votre propre visuel ou choisissez un motif parmi les modèles du vendeur.",
    badge: "Bestseller",
    cat: "textile",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S63e9ee3c3f594b77a1d3c972a9d85c33B.jpg"
  },
  {
    id: "1005008084751945",
    name: "Hoodie oversize personnalisable",
    desc: "Sweat à capuche coupe oversize, intérieur molletonné pour un confort mi-saison comme hiver. Impression DTG (Direct to Garment) haute définition qui résiste au lavage en machine sans se craqueler ni se décolorer.",
    badge: "",
    cat: "textile",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S7935b82d01ea42b7a2219f9a7a131f3a8.jpg"
  },
  {
    id: "1005006266462340",
    name: "Casquette snapback brodée",
    desc: "Broderie 3D en relief, plus durable dans le temps qu'une simple impression, avec réglage snapback universel. Disponible en 6 coloris, personnalisable avec un texte, un logo ou une initiale.",
    badge: "",
    cat: "textile",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S5dea27d68d5042d58562a2f120531d88U.jpg"
  },
  {
    id: "1005009499378197",
    name: "Coussin photo personnalisé",
    desc: "Housse 45×45 cm au toucher doux, impression HD résistante au lavage en machine à froid. Idéal pour transformer une photo de famille, un souvenir de voyage ou un dessin d'enfant en objet déco du quotidien.",
    badge: "",
    cat: "deco",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S59c5e2b5ca0e47a0a011e633eb7afcdaD.jpg"
  },
  {
    id: "1005009553808835",
    name: "Tableau Diamond Art mural",
    desc: "Kit complet de diamond painting 30×30 cm avec toile pré-imprimée, diamants numérotés et outils inclus. Une activité créative relaxante qui donne, une fois terminée, un tableau à effet mosaïque brillante à accrocher au mur.",
    badge: "Nouveau",
    cat: "deco",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S8555512a36a64d50b0dc6b65e09e8f98R.jpg"
  },
  {
    id: "1005008882491044",
    name: "Lampe LED photo gravée",
    desc: "Veilleuse en acrylique avec gravure laser 3D de votre photo à l'intérieur du bloc transparent. Trois températures de lumière réglables (chaude, froide, multicolore) pour s'adapter à n'importe quelle pièce.",
    badge: "Bestseller",
    cat: "deco",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S845d3b5d74bd45c1b2b84ab6a890c184b.jpg"
  },
  {
    id: "1005008063787016",
    name: "Tote bag canvas personnalisé",
    desc: "Sac en coton canvas épais et résistant, pensé pour un usage quotidien (courses, université, plage). Personnalisation au choix : impression ou broderie d'un prénom, d'une initiale ou d'un logo, en plusieurs coloris de fil.",
    badge: "Nouveau",
    cat: "accessoire",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S5c395693e7ca49a9b14d390594ab4b111.jpg"
  },
  {
    id: "1005008246951274",
    name: "Stickers vinyle waterproof",
    desc: "Vinyle imprimé UV, résistant à l'eau, au soleil et aux rayures — pensé pour une gourde, un ordinateur portable ou l'extérieur d'une voiture sans se décolorer. Livré en lot, découpe précise autour du motif.",
    badge: "",
    cat: "accessoire",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S9a7df571e6124cb59ae5fe86f2704a5bb.jpg"
  },
  {
    id: "1005005616306760",
    name: "Porte-clés gravé laser",
    desc: "Inox brossé premium, gravure laser fine et durable qui ne s'efface pas avec le temps ni les frottements en poche. Personnalisable avec un prénom, une date ou une courte phrase — une idée cadeau simple et durable.",
    badge: "",
    cat: "accessoire",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/Sef23dadd2d0d4019a1a1529e1feaf9edT.jpg"
  },
  {
    id: "1005006817254451",
    name: "Carnet photo personnalisé",
    desc: "Couverture rigide avec votre photo imprimée en HD, format A5 pratique à transporter. Pages intérieures lignées ou blanches selon le modèle choisi chez le vendeur — un cadeau personnalisé pour la rentrée ou un anniversaire.",
    badge: "Nouveau",
    cat: "accessoire",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/Se9639795351a4c3d815327e6db81bc04g.jpg"
  },
  {
    id: "1005006283748095",
    name: "Puzzle photo acrylique",
    desc: "Cadre en acrylique transparent avec votre photo insérée au centre, disponible en format cœur. Un rendu par transparence qui se pose sur un bureau ou une étagère, sans perçage ni fixation murale nécessaire.",
    badge: "",
    cat: "deco",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/S81a52be01d3b48f397beabd9d6dc45d4B.jpg"
  },
  {
    id: "1005009842192249",
    name: "Plaid photo personnalisé",
    desc: "Couverture en polaire douce 130×150 cm avec votre photo imprimée en HD sur toute la surface. Lavable en machine à basse température, idéale sur le canapé en hiver ou comme cadeau personnalisé.",
    badge: "",
    cat: "deco",
    img: "https://ae-pic-a1.aliexpress-media.com/kf/Sd0c6ef2c6dce411db87d764e16c177abB.jpg"
  }
];

// Expose globally so other scripts (index.html) can read window.products.
// (top-level `const` does NOT attach to window like `var` does — without
// this line the homepage product grid stays empty for every visitor.)
if (typeof window !== "undefined") {
  window.products = products;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = products;
}
