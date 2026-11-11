# Commerce Town · La petite épicerie

Prototype jouable de gestion d'épicerie, en HTML/Canvas et JavaScript. Le diorama utilise les planches Commerce Town fournies : mobilier, personnages, végétation et façade. Aucun service distant ni paquet npm nécessaire pour jouer.

## Jouer

Ouvrir `index.html` dans un navigateur récent, ou servir le dossier :

```powershell
python -m http.server 8080
# http://localhost:8080
```

- Départ avec 480 €, cinq meubles de vente, deux caisses et un employé de réassort.
- Ouvrir **Construire** et choisir un rayon. Sur téléphone, toucher une case pour afficher l’aperçu, puis appuyer sur **Poser**. Sur PC, survoler une case pour prévisualiser et cliquer pour construire. **Tourner** change l’orientation du rayon avant la pose.
- Hors construction, sélectionner un rayon par sa base pour le tourner sur place ou le retirer. Le retrait est confirmé et ne rembourse pas l’achat.
- Sur téléphone, glisser avec un doigt déplace la vue et pincer avec deux doigts zoome. Le catalogue et les objectifs s’ouvrent depuis le dock.
- Les clients contournent le mobilier, prennent un article et paient à la caisse.
- Chaque client cherche un type de produit. Le catalogue indique le stock, les ventes et les demandes manquées par rayon depuis le début de la partie. Une suggestion apparaît quand un produit demandé reste indisponible.
- Chaque rayon a une jauge au-dessus du meuble. Le casier s’ouvre à la même hauteur pendant un achat ou un réassort. Chaque case représente une unité. Survoler ou sélectionner la base du rayon permet aussi de l’ouvrir.
- L’employé rejoint les rayons sous la moitié de leur capacité, puis retourne à la réserve attenante. Les marchandises sont payées au moment du réassort, dans la limite de la trésorerie.
- Trois objectifs donnent des primes, chacun une seule fois et dans n'importe quel ordre.
- La pause et les vitesses ×1, ×2 et ×3 sont en haut à droite. **Commandes** ouvre l’aide. Sur PC, la molette zoome vers le curseur et un glissement avec le bouton gauche déplace la caméra. Espace met le jeu en pause hors boutons et Échap ferme le panneau ouvert ou quitte le placement.

**Pas de sauvegarde pour cette étape : actualiser la page recommence la partie.**

## Vérifier

Node.js récent, sans installation de dépendances :

```powershell
node --test tests/*.test.cjs
node --check game.js
node --check renderer.js
git diff --check
```

Les tests couvrent projection/sélection, limites et chevauchements, accessibilité, trajets cardinaux, construction pendant les déplacements, économie, réassort, primes et reproduction d'une simulation à pas fixe.

## Structure

- `index.html` : interface et chargement des scripts classiques, compatible avec `file://`.
- `style.css` : HUD, dock illustré et panneaux adaptés au téléphone et au PC.
- `game-core.js` : catalogue, état, recherche de chemin, placement, simulation et objectifs. Export navigateur et Node, sans DOM.
- `renderer.js` : scène isométrique, sprites et rendu de secours dessiné en code.
- `sprites.js` et `assets/` : planches Commerce Town originales, découpes et ancrage dans la scène.
- `game.js` : interactions, affichage des indicateurs et boucle à pas fixe de 1/30 s.
- `isometric.js` : projection et sélection réutilisées depuis le prototype initial.
- `tests/` : tests Node intégrés.
- `spritesheet.png` : ancienne planche conservée, plus utilisée par le jeu.
- `docs/COZY-STORE.md` : décisions, validations et limites de cette version.

Pas de framework, compilation, télémétrie ou ressource réseau à l'exécution. Le nom du dépôt reste `pocket-grocery`.
