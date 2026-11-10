# Pocket Grocery

- Prototype navigateur HTML/Canvas, JavaScript classique ; pas d'Unreal ni de bundler.
- `index.html` porte la simulation existante. Étendre ce prototype avant d'introduire un framework.
- `isometric.js` expose `Isometric` dans le navigateur et `module.exports` pour Node.
- Lancement : `python -m http.server 8080` ; tests : `node --test tests/*.test.cjs`.
- Vérifier `git diff --check` et le navigateur après modification du rendu.
- Préserver `spritesheet.png` : c'est une planche illustrée opaque, pas un atlas prêt à produire.
- Ne pas présenter les images de la conversation comme intégrées : leurs fichiers source ne sont pas disponibles dans cette reprise.
- Travailler sur une branche distincte ; ne pas fusionner ou déployer sans demande.
- Pas de sauvegarde, pathfinding ou inventaire global. Ne pas annoncer ces systèmes comme présents.
