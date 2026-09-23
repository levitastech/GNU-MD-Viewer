# Règles de suivi de progression

`.progress/` est local, exclu du dépôt par `.gitignore`. L'utiliser pour un chantier long ou une passation, jamais comme source de vérité durable ; le projet documentaire initial ne crée pas d'état fictif.

## Structure facultative à créer au premier chantier long

- `STATE.md` : état courant, dernier commit, prochaine action et blocage ; réécrit.
- `PROGRESS.yml` : lots et statuts `todo`, `doing`, `done`, `blocked` ; mis à jour.
- `HANDOFF.md` : consignes de reprise, si passation ; réécrit.
- `JOURNAL.md` : faits, tests, commits, blocages datés ; ajout en fin de fichier seulement.
- `DECISIONS.md` : décisions temporaires actives ; retirer une fois intégrées aux docs/ADR.
- `DEBT_NOTES.md` : dettes différées, impact et critère de reprise.
- `archive/` : notes de travail closes si nécessaires.

## Protocole

En reprise, lire `STATE.md` et `PROGRESS.yml` si présents, puis `HANDOFF.md` si nécessaire. En cours de chantier, inscrire uniquement les faits utiles. Au point d'arrêt, noter résultat, tests réalisés/non réalisés, prochaine action concrète et risque résiduel. Une décision durable va dans `docs/adr/` ou `docs/`, pas dans un journal local. Pour une correction courte, un commit et une PR claire suffisent : ne pas fabriquer de suivi inutile.
