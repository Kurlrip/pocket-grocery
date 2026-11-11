# Direction artistique Commerce Town

## Écran de jeu et quartier

- Les images `assets/ui-*.webp` proviennent d’une planche générée à partir de la référence visuelle du projet. Chaque icône est recadrée et exportée avec transparence. Le titre et les symboles restent disponibles si une image manque.
- `assets/commerce-neighborhood.webp` est un fond généré pour la scène, dessiné derrière le monde dans le Canvas. La rue, le trottoir et le parc utilisent la projection du magasin. Le décor extérieur reste hors de la grille de simulation.
- `assets/commerce-street.webp` regroupe les quatre sprites générés pour la rue et le parc. La voiture suit le temps de simulation pour respecter la pause et les vitesses de jeu.
- Le dock ouvre un panneau commun pour le catalogue, les objectifs et les commandes. Après sélection, le panneau rend la main au Canvas et la bannière de placement reste accessible.

### Essai sur téléphone

1. Ouvrir le jeu, vérifier la lisibilité du HUD et accéder aux trois entrées du dock en portrait, puis en paysage.
2. Ouvrir **Construire** et choisir **Le fleuriste**. Essayer une case occupée et vérifier que le prix reste intact.
3. Glisser puis pincer avec le rayon sélectionné. Tourner le téléphone, poser le rayon sur une case libre et vérifier l’achat et la prime **Un peu de tout** dans **Objectifs**.
4. Mettre le jeu en pause dans **Commandes**, puis reprendre. La circulation et les clients doivent s’arrêter et repartir avec la simulation.

## Planches d’origine

Les trois planches transparentes fournies le 11 novembre 2026 sont conservées sous leur forme originale dans `assets/`. La planche de présentation de la ville sert de référence visuelle ; elle n'est pas utilisée comme décor.

- `commerce-furniture.png` : cinq rayons, caisse, stock, trottoir, herbe et mobilier urbain.
- `commerce-people.png` : quatre profils de clientèle, une caissière et un employé. Les sprites sont des poses fixes, avec un léger mouvement à l'écran et retournement horizontal pendant la marche.
- `commerce-buildings.png` : première façade présentée en vignette « Vu depuis la rue ». Le jeu reste centré sur l'intérieur du magasin.

Les sources sont découpées à l'affichage dans `sprites.js`, sans altérer les PNG. Le même mobilier est utilisé dans le catalogue, la prévisualisation de placement et le magasin. Les ancrages et échelles sont dans `renderer.js`. Les murs et le sol de base restent générés en code. L'ancienne spritesheet Pocket Grocery est conservée et n'est plus chargée.

Vérifié dans Chrome avec ouverture directe du fichier HTML : chargement des planches, rendu du mobilier et des personnages, placement du rayon frais, ventes et disposition mobile sans débordement. 16 tests Node réussis. Aucune modification de l'économie ou des trajets.

Avant publication commerciale, documenter la provenance et les droits de diffusion des planches.
