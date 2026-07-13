# Scripts — catalogue produits affiliés

Ces scripts corrigent le problème de liens/images cassés du catalogue
(`products.js`) en vérifiant réellement chaque produit côté serveur
(seul endroit où on peut lire le vrai code HTTP — le navigateur est
bloqué par CORS pour ça, voir `affiliate-validator.js`).

## Vérifier le catalogue actuel

```bash
npm run validate:products
```

Affiche un rapport (✓ OK / ✗ CASSÉ / ? INCERTAIN) pour chaque produit et
écrit le détail dans `products.audit.json`. Code de sortie 1 si au moins
un produit est confirmé cassé (utilisé par la CI, voir
`.github/workflows/validate-products.yml` — tourne automatiquement à
chaque modif de `products.js` et chaque lundi).

Un statut **INCERTAIN** (ex: AliExpress a répondu par un captcha) ne fait
jamais échouer le build et ne supprime jamais un produit — pour éviter de
retirer par erreur un produit qui existe bien.

### ⚠️ Le check du lien affilié (rzekl.com/Admitad) a un coût

Vérifier qu'un lien affilié redirige bien vers le bon produit veut dire
taper sur le vrai système de tracking d'Admitad — pas juste sur AliExpress.
Le refaire chaque jour pour tout le catalogue peut ressembler à du trafic
de clics automatisé pour leurs systèmes anti-fraude. Ajoute
`--skip-affiliate` pour ne vérifier qu'AliExpress + l'image :

```bash
node scripts/validate-products.js --fix --skip-affiliate
```

Le workflow CI fait déjà cette distinction : vérification légère chaque
jour, vérification complète (avec le lien affilié) une fois par semaine
seulement (voir `.github/workflows/validate-products.yml`).

## Si le scraping/la validation sont bloqués depuis GitHub Actions

Les runners GitHub Actions partagés utilisent des IPs de datacenter (Azure)
largement connues et bloquées par les systèmes anti-bot — c'est un risque
réel, pas juste théorique, et différent de ce qui se passe en local.

Si tu vois des avertissements `⚠️ Aucun lien produit trouvé` de façon
persistante, ou beaucoup de statuts INCERTAIN qui ne se résolvent jamais,
la solution qui évite de changer d'hébergement est un proxy résidentiel/
rotatif (Bright Data, Smartproxy, ScraperAPI...) :

```bash
npm install                                    # installe `undici` (nécessaire pour le proxy)
```

Puis ajoute un secret **SCRAPER_PROXY_URL** dans Settings → Secrets and
variables → Actions du dépôt, au format `http://user:password@host:port`.
Rien d'autre à changer : tous les scripts (`validate-products.js`,
`add-product.js`, `discover-products.js`) l'utilisent automatiquement dès
qu'il est présent, et continuent de fonctionner sans lui si tu ne veux pas
en payer un.

```bash
SCRAPER_PROXY_URL="http://user:pass@host:port" npm run discover:products   # test en local
npm run test:proxy                              # vérifie que le mécanisme marche (serveurs simulés)
```

Je n'ai par ailleurs jamais pu tester ce check contre le vrai rzekl.com
(domaine bloqué depuis mon environnement) — seulement contre un serveur
simulé. Il suppose une redirection HTTP standard (`Location`) ; si Admitad
utilise une redirection JavaScript ou un meta-refresh, ce check pourrait
classer un lien valide comme cassé à tort. À surveiller lors des premiers
runs réels — regarde `products.audit.json` pour voir le détail exact de
ce qui a été détecté avant de faire confiance aveuglément au résumé.

## Retirer automatiquement les produits cassés

```bash
npm run validate:products:fix
```

Retire les produits confirmés cassés de `products.js` (sauvegarde dans
`products.js.bak`) et les déplace dans `products.quarantine.json` avec le
détail de la raison, pour relecture manuelle avant suppression définitive.

## Ajouter un produit

```bash
npm run add:product -- "https://www.aliexpress.com/item/1005XXXXXXXXXXX.html" --cat=textile
```

Avant d'écrire quoi que ce soit dans `products.js`, le script vérifie que
le produit est en ligne, que son image se charge vraiment, et que le lien
affilié (rzekl.com/Admitad) redirige bien vers ce produit précis. Si une
seule de ces vérifications échoue, rien n'est ajouté.

Le nom et l'image sont auto-détectés depuis la page (balises `og:title` /
`og:image`) quand c'est possible ; sinon précise `--name=` et `--img=`.

Options : `--cat=textile|deco|accessoire` (obligatoire), `--name=`,
`--desc=`, `--badge=`, `--img=`, `--force` (ignore un statut incertain).

## Faire grossir le catalogue automatiquement (scraping + validation)

```bash
npm run discover:products             # scrape, valide, ajoute jusqu'à la cible
npm run discover:products:dry-run     # montre ce qui serait ajouté sans rien écrire
```

Scrape les pages de catégorie/recherche AliExpress listées dans
`scripts/discovery-sources.json` (éditable — ajoute/retire des URLs et des
catégories), extrait les IDs produits qui y apparaissent, puis fait passer
CHAQUE candidat par la même vérification que `add-product.js` (existence,
image, lien affilié) avant de l'ajouter. Rien de non vérifié n'entre dans
`products.js`.

Deux réglages dans `scripts/discovery-sources.json` :
- `targetCount` : taille de catalogue visée (défaut 100).
- `maxNewPerRun` : nombre max de nouveaux produits ajoutés en un seul run
  (défaut 15), pour rester progressif plutôt que de tout ajouter d'un coup.

Un `products.discovery-seen.json` garde la trace des IDs déjà évalués
(ajoutés ou rejetés) pour ne pas re-scraper les mêmes candidats à chaque
run — un candidat rejeté est réessayé après 30 jours (le rejet était peut
être temporaire : rupture de stock, blocage anti-bot ponctuel...).

**Limite honnête à connaître** : ce script utilise un simple `fetch()`
Node, sans navigateur headless. Les pages de catégorie AliExpress
semblent conçues pour être indexées par les moteurs de recherche (donc
lisibles par un fetch classique — testé avec du vrai contenu), mais si
AliExpress change sa détection anti-bot ou sa structure de page, une
source peut se retrouver à renvoyer 0 candidat du jour au lendemain. Le
script le signale clairement (`⚠️ Aucun lien produit trouvé`) plutôt que
d'échouer silencieusement. Si ça devient systématique, la vraie solution
robuste serait de brancher l'API officielle (product feed Admitad ou
AliExpress Open Platform) avec tes propres identifiants — possible dans un
prochain échange si besoin.

Le workflow `.github/workflows/validate-products.yml` tourne chaque jour :
il retire d'abord les produits cassés (`validate-products.js --fix`), puis
comble le catalogue vers la cible (`discover-products.js`), et commit/push
automatiquement s'il y a eu des changements — le catalogue s'entretient
tout seul.

## Lancer les tests des scripts eux-mêmes

```bash
npm run test:scripts
```

Fait tourner un petit serveur HTTP local simulant un produit vivant, un
produit supprimé, une image cassée, un lien affilié incompatible, etc.
Ne touche à aucun vrai site externe — utile pour vérifier que la logique
de détection fonctionne toujours après une modif de `scripts/lib/checks.js`.
