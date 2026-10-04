# CLAUDE.md — consignes pour Claude Code

Lire `AGENTS.md` avant toute tâche : il porte les contrats communs, le produit, la stack et les invariants. Ce fichier précise le parcours de Claude Code ; éviter une seconde copie des décisions techniques.

## Parcours de reprise

1. Contrôler `git status --short`, la branche et les fichiers réels ; préserver le travail concurrent. Au 3 octobre 2026, L03 a créé le socle Tauri/Svelte, ses lockfiles et la CI ; le lecteur Markdown et L04 restent à réaliser. Recontrôler les preuves locales et distantes au lieu de supposer le lot clos.
2. Lire `.rules/COMMIT_RULES.md`, `TESTING_RULES.md`, `PROGRESS_RULES.md` et `VERSIONING.md` ; consulter `docs/ARCHITECTURE.md`, `docs/SECURITY.md` et `docs/DEVELOPMENT.md` selon le changement.
3. Pour un chantier local, lire `.progress/STATE.md`, `PROGRESS.yml`, puis `GNU_MD_VIEWER_PLAN_CHANTIER_V1.md` et le fichier `GNU_MD_VIEWER_PLAN_P1.md`, `P2.md`, `P3.md` ou `P4.md` correspondant (même préfixe). Lire `HANDOFF.md` si nécessaire. Si `.progress/` est absent, utiliser les références durables et la tâche demandée ; ne pas inventer de suivi historique.
4. Reprendre le premier lot autorisé dont les prérequis sont satisfaits. SG01–SG09 et V1 §12.2 sont déjà validés ; les gates G1–G4 exigent des preuves techniques. Une demande d'affinement du plan ne démarre pas les lots applicatifs.

## Pendant le lot

- Vérifier les APIs/versions dans les sources officielles avant d'écrire du code dépendant de Tauri, Svelte ou des bibliothèques ; consigner versions/provenance. Ne pas créer couche, dépendance ou architecture par anticipation.
- Garder moteur, sanitisation, UI et accès système séparés conformément à `AGENTS.md`. Toute modification rendu/filesystem couvre fixtures hostiles, chemins relatifs, refus et erreurs ; tester les commandes Rust indépendamment du filtrage frontend.
- Utiliser les scripts réellement déclarés ; `docs/DEVELOPMENT.md` contient actuellement des commandes futures. Pour documentation seule, contrôler liens/structure/diff ; ne pas déclarer les suites TS/Rust exécutées.
- Tester de manière ciblée pendant le lot ; vérifier les suites pertinentes et recettes natives à la gate. Rapporter commande/recette, résultat, contexte, limites et non-exécutions. Un build réussi ne vaut pas essai installé.
- Le plan permet du parallélisme entre contributeurs ; il n'impose pas de sous-agents. Sans instruction de délégation, avancer directement lot par lot.

## Point d'arrêt

Mettre à jour le suivi local avec faits, preuves, blocage ciblé et prochaine action, selon `.rules/PROGRESS_RULES.md`. `.progress/` reste ignoré et exclu des commits ; transcrire les contrats durables dans `docs/`/ADR. Ne marquer `done` qu'après livrables et validation ; garder distincts lot clos, gate satisfaite, candidat prêt et livraison effectuée.

Ne pas committer, pousser, publier, taguer ou modifier une release sans demande ou autorisation existante pour cette action. Préparer le candidat et ses preuves avant de solliciter une autorisation manquante à L29 ; G4 n'accorde pas cette autorisation. Ne pas choisir seul l'identité légale du détenteur des droits. Le nom `gnu-mdv` est la cible technique ; la validation publique du nom « GNU-MD Viewer » reste en attente dans `docs/adr/0001-licence-et-nom.md`.
