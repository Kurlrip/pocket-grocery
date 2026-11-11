# Commerce Town · La petite épicerie

Prototype jouable de gestion d'épicerie, en HTML/Canvas et JavaScript. Le diorama utilise les planches Commerce Town fournies : mobilier, personnages, végétation et façade. Aucun service distant ni paquet npm nécessaire pour jouer.

## Jouer

Ouvrir `index.html` dans un navigateur récent, ou servir le dossier :

```powershell
python -m http.server 8080
# http://localhost:8080
```

- Départ avec 480 €, cinq meubles de vente, deux caisses et un employé de réassort.
- Ouvrir **Construire**, choisir un rayon, puis toucher ou cliquer sur une case libre. Un premier stock est inclus dans le prix. **Annuler** quitte le placement.
- Sur téléphone, glisser avec un doigt déplace la vue et pincer avec deux doigts zoome. Le catalogue et les objectifs s’ouvrent depuis le dock.
- Les clients contournent le mobilier, prennent un article et paient à la caisse.
- L'employé réapprovisionne les rayons sous la moitié de leur capacité. Les marchandises sont payées au moment du réassort, dans la limite de la trésorerie.
- Trois objectifs donnent des primes, chacun une seule fois et dans n'importe quel ordre.
- **Commandes** donne accès à la pause, aux vitesses 1×, 2× et 4× et à l’aide. Sur PC, Espace met le jeu en pause hors boutons. Échap ferme le panneau ouvert ou quitte le placement.
- Survoler un rayon hors construction pour consulter son stock.

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
