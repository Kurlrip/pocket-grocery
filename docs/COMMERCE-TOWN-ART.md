# Direction artistique Commerce Town

Les trois planches transparentes fournies le 11 novembre 2026 sont conservées sous leur forme originale dans `assets/`. La planche de présentation de la ville sert de référence visuelle ; elle n'est pas utilisée comme décor.

- `commerce-furniture.png` : cinq rayons, caisse, stock, trottoir, herbe et mobilier urbain.
- `commerce-people.png` : quatre profils de clientèle, une caissière et un employé. Les sprites sont des poses fixes, avec un léger mouvement à l'écran et retournement horizontal pendant la marche.
- `commerce-buildings.png` : première façade présentée en vignette « Vu depuis la rue ». Le jeu reste centré sur l'intérieur du magasin.

Les sources sont découpées à l'affichage dans `sprites.js`, sans altérer les PNG. Le même mobilier est utilisé dans le catalogue, la prévisualisation de placement et le magasin. Les ancrages et échelles sont dans `renderer.js`. Les murs et le sol de base restent générés en code. L'ancienne spritesheet Pocket Grocery est conservée et n'est plus chargée.

Vérifié dans Chrome avec ouverture directe du fichier HTML : chargement des planches, rendu du mobilier et des personnages, placement du rayon frais, ventes et disposition mobile sans débordement. 16 tests Node réussis. Aucune modification de l'économie ou des trajets.

Avant publication commerciale, documenter la provenance et les droits de diffusion des planches.
