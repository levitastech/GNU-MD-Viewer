# CLAUDE.md — consignes pour Claude Code

Lire `AGENTS.md` avant toute tâche : il définit produit, stack, invariants et sources de vérité. Appliquer ensuite les règles de `.rules/` pertinentes et consulter `docs/ARCHITECTURE.md`, `docs/SECURITY.md` selon le changement.

Avant une modification importante, inspecter le dépôt réel et ses scripts ; ne pas créer de couche ou de dépendance par anticipation. Vérifier les APIs Tauri 2 / Svelte 5 dans leur documentation officielle. Garder le moteur Markdown isolé de Svelte. Tester les documents hostiles et les chemins relatifs lorsqu'on touche au rendu ou au filesystem. Indiquer explicitement les vérifications réussies et non exécutées. Suivre `.rules/PROGRESS_RULES.md` pour la reprise des tâches longues.

Ne pas publier, taguer, modifier une release ou choisir seul l'identité légale du détenteur des droits. Le nom `gnu-mdv` est la cible technique ; la validation publique du nom « GNU-MD Viewer » figure dans `docs/adr/0001-licence-et-nom.md`.
