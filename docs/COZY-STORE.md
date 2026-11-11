# La petite épicerie — 11 novembre 2026

> Cette note décrit la version procédurale initiale. Voir `COMMERCE-TOWN-ART.md` pour la direction graphique actuelle.

## Direction retenue

L'utilisateur autorise une reprise complète et indique ne plus vouloir dépendre des anciennes images. À l'inspection, le dépôt local est propre et contient encore la planche d'origine. Elle est conservée, sans être chargée.

La nouvelle scène est un diorama Canvas entièrement procédural : sol carrelé, murs ouverts, fenêtres, caisse, mobilier, produits, personnages, végétation et trottoir. L'interface utilise une palette crème et vert sauge. Aucun téléchargement d'image ou police n'est requis, y compris en ouvrant directement `index.html`.

## Boucle jouable

- Deux rayons préinstallés et 480 € pour commencer à aménager immédiatement.
- Cinq rayons : primeur, fournil, frais, épicerie et fleurs.
- Clients dirigés vers un rayon en stock, achat d'un article, paiement, sortie.
- Un employé rejoint les rayons à réapprovisionner puis revient en réserve. Le coût dépend du nombre d'unités effectivement livrées et de l'argent disponible.
- Trois objectifs indépendants, récompensés une seule fois.
- Construction avec aperçu et protection des accès. Les trajets en cours sont recalculés lorsque le plan change.
- Pause, vitesses ×1/×2/×4, aide intégrée et consultation du stock au survol.

## Architecture

La projection `isometric.js` est réutilisée. La simulation auparavant embarquée dans le HTML est isolée dans `game-core.js` pour être testée sans navigateur. Elle utilise une grille 10 × 10, une recherche en largeur à quatre voisins et un état pseudoaléatoire reproductible. L'interface applique un pas fixe de 1/30 seconde ; elle suspend l'évolution quand l'onglet est masqué.

Le rendu reste indépendant : `renderer.js` utilise la même transformation pour dessiner et sélectionner les cases. Les éléments sont triés par profondeur. Les nouvelles vignettes proviennent des mêmes fonctions que le mobilier du magasin.

## Vérification réalisée

- 16 tests Node réussis, incluant une simulation de 180 secondes avec ventes et réassort payant.
- Assertions sur les coordonnées des agents à chaque pas : déplacement cardinal, sans occupation des cases du mobilier.
- Construction pendant des trajets actifs et refus de fermeture du dernier accès.
- Contrôle Chrome avec Playwright : ajout du rayon frais et versement de sa prime, refus d'un chevauchement sans dépense, annulation, pause, aide et retour à l'état de pause précédent.
- Partie navigateur à vitesse ×4 atteignant 50 clients servis avec trésorerie positive.
- Captures ordinateur 1440 × 1000 et mobile 390 × 844 inspectées. Aucun débordement horizontal de la page.
- Ouverture directe via `file://` vérifiée. Aucune requête PNG et aucune erreur JavaScript de page pendant le scénario.
- Vérifications de syntaxe JavaScript et `git diff --check`.

Le contrôle navigateur utilise une installation temporaire de Playwright, sans ajout de dépendance au dépôt.

## Limites et suite

Pas de sauvegarde : un rechargement recommence la partie. Les clients peuvent se superposer, sans file physique ni réservation des cases entre agents. Le tri visuel par profondeur est approximatif pour les grandes emprises. Aucun système de rotation ou de retrait de mobilier n'est exposé. Les montants et le rythme sont provisoires.

Chrome desktop et la disposition mobile ont été vérifiés ; Safari, Firefox et un vrai téléphone restent non vérifiés. La jouabilité au clavier du Canvas reste limitée ; le placement s'effectue à la souris ou au toucher.

Prochaine étape utile après retour sur cette direction : déplacement/retrait de rayons et sauvegarde locale versionnée, avant d'ajouter de nouveaux systèmes de gestion.
