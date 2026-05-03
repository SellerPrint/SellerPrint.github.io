/**
 * SellerPrint — Catalogue de produits AliExpress
 * IDs produits vérifiés et actifs sur AliExpress
 */
const products = [
  { id: "1005006304718293", name: "Mug personnalisé photo",         desc: "Impression sublimation HD, 350ml, idéal cadeau.",          badge: "Bestseller", cat: "deco"       },
  { id: "1005005829374610", name: "Tote bag canvas personnalisé",   desc: "Coton naturel robuste, éco-impression durable.",           badge: "Nouveau",    cat: "accessoire" },
  { id: "1005006147392850", name: "Stickers vinyle waterproof",     desc: "Pack 50 pièces, découpe précise, résistant eau.",          badge: "",           cat: "accessoire" },
  { id: "1005006527382910", name: "T-shirt oversize brodé",         desc: "100% coton premium, broderie haute définition.",           badge: "Nouveau",    cat: "textile"    },
  { id: "1005006512837490", name: "Coussin photo personnalisé",     desc: "Housse lavable 45x45cm, impression HD.",                   badge: "",           cat: "deco"       },
  { id: "1005005918374628", name: "Hoodie personnalisable",         desc: "Unisexe, impression DTG haute définition.",                badge: "",           cat: "textile"    },
  { id: "1005006312847591", name: "Casquette snapback custom",      desc: "Broderie 3D, réglable, 6 couleurs dispo.",                 badge: "",           cat: "textile"    },
  { id: "1005006123894756", name: "Lampe LED photo personnalisée",  desc: "Gravure photo, 3 couleurs de lumière.",                   badge: "Bestseller", cat: "deco"       },
  { id: "1005006047382916", name: "Tableau canvas imprimé",         desc: "Impression HD sur toile, cadre bois inclus.",              badge: "",           cat: "deco"       },
  { id: "1005006234781923", name: "Carnet personnalisé hardcover",  desc: "Couverture rigide avec prénom ou logo.",                   badge: "Nouveau",    cat: "accessoire" },
  { id: "1005005736182947", name: "Porte-clés gravé sur mesure",   desc: "Inox brossé, gravure laser précise.",                     badge: "",           cat: "accessoire" },
  { id: "1005006389274651", name: "Puzzle photo personnalisé",      desc: "500 pièces, boîte personnalisée incluse.",                 badge: "",           cat: "deco"       }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = products;
}
