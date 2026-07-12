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

## Lancer les tests des scripts eux-mêmes

```bash
npm run test:scripts
```

Fait tourner un petit serveur HTTP local simulant un produit vivant, un
produit supprimé, une image cassée, un lien affilié incompatible, etc.
Ne touche à aucun vrai site externe — utile pour vérifier que la logique
de détection fonctionne toujours après une modif de `scripts/lib/checks.js`.
