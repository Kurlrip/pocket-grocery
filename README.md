# Commerce Town · La petite épicerie

Prototype jouable de gestion d'épicerie, en HTML/Canvas et JavaScript. Diorama isométrique dessiné en code : aucun asset graphique, service distant ou paquet npm nécessaire pour jouer. L'ancien prototype Pocket Grocery reste disponible dans l'historique Git.

## Jouer

Ouvrir `index.html` dans un navigateur récent, ou servir le dossier :

```powershell
python -m http.server 8080
# http://localhost:8080
```

- Départ : 480 €, un primeur, un fournil, une caisse et un employé.
- Choisir un rayon dans le catalogue, puis une case libre. Vert : placement possible ; rouge : refusé. Un premier stock est inclus dans le prix.
- Les clients contournent le mobilier, prennent un article et paient à la caisse.
- L'employé réapprovisionne les rayons sous la moitié de leur capacité. Les marchandises sont payées au moment du réassort, dans la limite de la trésorerie.
- Trois objectifs donnent des primes, chacun une seule fois et dans n'importe quel ordre.
- Espace : pause/reprise (hors boutons). Échap ou clic droit : quitter la construction. Boutons 1×, 2× et 4× : vitesse de simulation.
- Survoler un rayon hors construction pour consulter son stock. Le bouton « ? » explique les règles.

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
- `style.css` : interface crème/vert sauge, disposition ordinateur/mobile.
- `game-core.js` : catalogue, état, recherche de chemin, placement, simulation et objectifs. Export navigateur et Node, sans DOM.
- `renderer.js` : diorama, mobilier, personnages et vignettes procédurales.
- `game.js` : interactions, affichage des indicateurs et boucle à pas fixe de 1/30 s.
- `isometric.js` : projection et sélection réutilisées depuis le prototype initial.
- `tests/` : tests Node intégrés.
- `spritesheet.png` : ancienne planche conservée, plus utilisée par le jeu.
- `docs/COZY-STORE.md` : décisions, validations et limites de cette version.

Pas de framework, compilation, télémétrie ou ressource réseau à l'exécution. Le nom du dépôt reste `pocket-grocery`.
