# Pocket Grocery / Commerce Town

Prototype de gestion de supermarché en HTML/Canvas et JavaScript, sans framework ni compilation. Le dépôt conserve pour l'instant le nom Pocket Grocery ; Commerce Town désigne la direction envisagée, pas encore une simulation de ville.

## Lancer et vérifier

Depuis la racine, sous PowerShell :

```powershell
python -m http.server 8080
# Ouvrir http://localhost:8080
```

Choisir un rayon puis cliquer sur une case libre. Départ : 200 pièces. Les clients prennent un article, passent à la caisse, puis sortent. L'employé remplit automatiquement les rayons sous la moitié de leur capacité.

```powershell
node --test tests/*.test.cjs
git diff --check
```

Node.js sert uniquement aux tests. Aucun paquet npm requis.

## Structure

- `index.html` : interface, économie, simulation et rendu Canvas.
- `isometric.js` : projection, sélection de case et validation d'emprise ; partagé avec les tests Node.
- `spritesheet.png` : planche d'origine conservée sans modification.
- `tests/` : tests automatisés sans dépendance.
- `docs/PROJECT-STATE.md` : bilan de reprise et prochaine étape graphique.

Pas de sauvegarde : recharger la page réinitialise la partie.
