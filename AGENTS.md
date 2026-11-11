# Commerce Town / Pocket Grocery

- Prototype HTML/Canvas, JavaScript classique, sans bundler ni dépendance d'exécution.
- Lancer en ouvrant `index.html` ou avec `python -m http.server 8080`.
- Tests : `node --test tests/*.test.cjs` ; vérifier aussi `node --check game.js`, `node --check renderer.js` et `git diff --check`.
- Vérifier le rendu et les interactions dans un vrai navigateur après modification de l'interface.
- `game-core.js` : état et simulation pure, exportés via `Store`/`module.exports`. Catalogue et objectifs font autorité ici.
- `game.js` : DOM, commandes et pas fixe 1/30 s. `renderer.js` : rendu et hit-testing via la même caméra. `isometric.js` : projection.
- Les cases d'agents utilisent des coordonnées entières centrées par le renderer (+0.5). Les emprises du mobilier commencent au coin des cases.
- Toute construction doit préserver les trajets et l'accès à la caisse, à la réserve et à chaque rayon. Les primes doivent être versées une seule fois.
- Conserver les planches approuvées dans `assets/`. `sprites.js` définit les découpes sans modifier les fichiers PNG ; `renderer.js` garde un rendu de secours. L'ancienne `spritesheet.png` n'est plus chargée.
- Travailler sur une branche distincte ; ne pas fusionner ou déployer sans demande.
- `save-game.js` : sauvegarde locale versionnée et reprise des trajets. Pas de file d’attente physique. La simulation ignore les collisions entre agents, mais contourne le mobilier.
- L'historique `docs/PROJECT-STATE.md` décrit l'inspection initiale. Lire `docs/COZY-STORE.md` pour la simulation et `docs/COMMERCE-TOWN-ART.md` pour les sprites actuels.
