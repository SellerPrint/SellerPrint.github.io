/**
 * Script de filtrage des produits interdits aux moins de 18 ans
 * Analyse: noms, descriptions, URLs d'images et catégories
 */

// Mots-clés et expressions associés à du contenu pour adultes
const ADULT_KEYWORDS = [
  // Intoxicants
  'alcohol', 'beer', 'wine', 'whiskey', 'vodka', 'liquor', 'champagne',
  'cigar', 'cigarette', 'tobacco', 'smoking', 'vape',
  
  // Contenu sexuel/érotique
  'adult', 'erotic', 'intimate', 'lingerie', 'sexy', 'naughty',
  'pleasure', 'xxx', '18+', 'mature', 'nsfw', 'sensual',
  'vibrator', 'dildo', 'sexual', 'sex toy', 'adult toy',
  
  // Armes/Violence
  'weapon', 'gun', 'rifle', 'pistol', 'knife', 'sword', 'brass knuckles',
  'switchblade', 'machete', 'tactical', 'tactical gear', 'concealed',
  
  // Drogues
  'drug', 'cannabis', 'marijuana', 'weed', 'cocaine', 'meth', 'heroin',
  'lsd', 'mushroom', 'psychedelic', 'opium',
  
  // Contenu violent/gore
  'gore', 'blood', 'death', 'skull', 'murder', 'horror', 'scream',
  
  // Gambling
  'poker', 'casino', 'bet', 'gambling', 'dice', 'cards game',
];

const DANGEROUS_CATEGORIES = [
  '202216602', // Jeux de hasard (Dice cup, Poker)
];

/**
 * Vérifie si une URL d'image contient des signaux d'alerte
 * @param {string} imageUrl - URL de l'image
 * @returns {boolean}
 */
function isImageSuspicious(imageUrl) {
  if (!imageUrl) return false;
  
  const suspiciousPatterns = [
    'adult', 'xxx', 'erotic', 'nude', 'naked', 'intimate',
    'sexual', 'explicit', 'mature'
  ];
  
  return suspiciousPatterns.some(pattern => 
    imageUrl.toLowerCase().includes(pattern)
  );
}

/**
 * Analyse le texte pour détecter du contenu pour adultes
 * @param {string} text - Texte à analyser (nom, description)
 * @returns {object} Résultat avec score et détails
 */
function analyzeText(text) {
  if (!text) return { score: 0, matches: [] };
  
  const lowerText = text.toLowerCase();
  const matches = [];
  let score = 0;
  
  // Chercher les mots-clés
  ADULT_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) {
      matches.push(keyword);
      score += 1;
    }
  });
  
  // Pénalité pour certaines expressions spécifiques
  if (lowerText.includes('dice cup') && lowerText.includes('poker')) {
    score += 2; // Jeu de hasard explicite
  }
  
  if (lowerText.includes('18+') || lowerText.includes('adult')) {
    score += 3; // Indication explicite
  }
  
  return { score, matches };
}

/**
 * Détermine si un produit est interdit aux moins de 18 ans
 * @param {object} product - Objet produit
 * @returns {object} Résultat de l'analyse
 */
function isAdultProduct(product) {
  let totalScore = 0;
  const reasons = [];
  
  // Analyser le nom
  const nameAnalysis = analyzeText(product.name);
  totalScore += nameAnalysis.score;
  if (nameAnalysis.matches.length > 0) {
    reasons.push(`Nom: ${nameAnalysis.matches.join(', ')}`);
  }
  
  // Analyser la description
  const descAnalysis = analyzeText(product.desc);
  totalScore += descAnalysis.score;
  if (descAnalysis.matches.length > 0) {
    reasons.push(`Description: ${descAnalysis.matches.join(', ')}`);
  }
  
  // Vérifier l'image
  if (isImageSuspicious(product.img)) {
    totalScore += 5;
    reasons.push('Image: URL suspecte');
  }
  
  // Vérifier la catégorie
  if (DANGEROUS_CATEGORIES.includes(product.cat)) {
    totalScore += 2;
    reasons.push(`Catégorie dangereuse: ${product.cat}`);
  }
  
  // Seuil de détection: score >= 3
  const isAdult = totalScore >= 3;
  
  return {
    isAdult,
    score: totalScore,
    reasons,
    id: product.id,
    name: product.name
  };
}

/**
 * Filtre les produits et sépare les adultes
 * @param {array} products - Liste des produits
 * @returns {object} Produits filtrés et adultes détectés
 */
function filterAdultProducts(products) {
  const safe = [];
  const adult = [];
  const suspicious = [];
  
  products.forEach(product => {
    const analysis = isAdultProduct(product);
    
    if (analysis.isAdult) {
      adult.push({
        ...product,
        ...analysis
      });
    } else if (analysis.score > 0 && analysis.score < 3) {
      suspicious.push({
        ...product,
        ...analysis
      });
    } else {
      safe.push(product);
    }
  });
  
  return { safe, adult, suspicious };
}

// Export pour utilisation
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isAdultProduct,
    filterAdultProducts,
    analyzeText,
    ADULT_KEYWORDS
  };
}

console.log('✅ Script de filtrage chargé');
