# État de reprise — 11 novembre 2026

> Archive de l'inspection initiale. La version suivante est décrite dans `COZY-STORE.md` et le README ; ses déplacements, son rendu et son économie remplacent plusieurs limites listées ici.

## Dépôt inspecté

- Dépôt : https://github.com/Kurlrip/pocket-grocery
- Branche distante initiale unique : `main`, commit `be63f6d`.
- Trois commits : prototype (`cde7b54`), ajout de planche (`ae490ef`), intégration (`be63f6d`).
- Aucune PR ouverte au moment de l'inspection.
- Le dossier local était vide ; clone réalisé sans écraser de fichiers existants.
- À l'origine : `index.html` et `spritesheet.png`, sans documentation, tests ou procédure de build.

## Fonctionnel dans le code existant

Grille isométrique 12 × 12, cinq types de rayons, coûts et revenus, stock local, clients, caisse et employé de réassort. Les personnages sont vectoriels. Le rendu accepte une planche PNG ou un secours vectoriel si le chargement échoue.

## Première correction sur branche séparée

- Sélection par inclusion dans la tuile (floor), au lieu de l'arrondi qui décale le clic au centre.
- Conversion des coordonnées du clic tenant compte de l'échelle CSS du Canvas.
- Emprise complète vérifiée, entrée/caisse/réserve protégées, clic droit ignoré.
- Tri commun des rayons et personnages par profondeur ; approximation par centre d'emprise, pas un solveur d'occlusion pour objets imbriqués.
- Tests de géométrie et documentation reproductible.

## État réel des images

La planche présente dans le dépôt est une illustration opaque 1408 × 768, avec fond beige, titres, personnages et plusieurs objets par panneau. Les rectangles actuels ne correspondent pas tous à leur rayon : par exemple, « Fruits & Légumes » prélève une zone du panneau frais/laitiers. Changer uniquement ces rectangles ne produira pas des sprites propres.

La conversation « Lire une conversation Gemini » valide un style coloré de maquette miniature pour Commerce Town. Sa récupération fournit du texte mais aucune pièce jointe ou image exploitable. Les images approuvées ne peuvent donc pas être intégrées fidèlement depuis cette seule référence. La planche d'origine et sa configuration sont conservées.

## Prochaine étape recommandée

Valider un seul rayon propre dans la carte existante avant d'étendre le contenu :

1. Récupérer les PNG source approuvés et les conserver séparément dans `assets/source/`.
2. Préparer un PNG transparent par objet dans `assets/sprites/`, sans texte ni objet voisin ; conserver perspective et éclairage communs.
3. Définir pour chaque sprite son emprise, sa taille d'affichage et son pivot au sol. L'affichage actuel impose 90 × 80 à tous les rayons : à remplacer par ces métadonnées.
4. Tester un rayon 2 × 1 devant/derrière un personnage, puis une emprise 2 × 2 ; contrôler ombres, échelle et alignement au sol avant de migrer les cinq rayons.

Ne pas lancer une refonte en ville complète avant cette validation visuelle. Le prototype de magasin fournit déjà une boucle économique utile pour tester les assets.

## Limites connues

- Déplacement direct : les agents traversent les rayons, sans recherche de chemin.
- Vitesse liée aux images par seconde ; simulation non déterministe.
- Réassort gratuit, sans achats de marchandises ; équilibrage provisoire.
- Pas de sauvegarde, caméra ou adaptation mobile aboutie ; Canvas fixe 900 × 700.
- Pas de nouvelle image de Commerce Town intégrée.
- Tri de profondeur simple et dessins vectoriels à revoir avec les pivots des futurs sprites.
- Aucune licence explicite dans le dépôt ; provenance et droits des futurs assets à documenter avant distribution.

## Vérification de cette reprise

- `node --test tests/isometric.test.cjs` : 7 tests réussis.
- `git diff --check` : réussi.
- Chrome headless via Playwright, servi par `python -m http.server` : chargement de l'image, refus sur la caisse, clic droit ignoré, placement au centre attendu, refus de chevauchement, sélection après redimensionnement CSS du Canvas, achat et revenu à la caisse vérifiés. Aucun `pageerror`.
- Chargement de PNG volontairement bloqué dans une seconde page : mode vectoriel activé.
- Capture inspectée : confirme le défaut de la planche opaque, toujours présent et documenté ; les nouveaux sprites approuvés restent à intégrer.
- Playwright installé dans un dossier temporaire pour ce contrôle ; aucune dépendance ajoutée au projet.
- Non vérifiés : cycle complet de réassort, autres navigateurs, mobile, occlusions complexes.
