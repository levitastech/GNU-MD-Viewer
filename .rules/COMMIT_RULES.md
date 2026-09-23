# Règles de commits et changelog

## Un changement cohérent par commit

Un commit représente une intention vérifiable : moteur Markdown, UI, intégration Tauri, sécurité, documentation ou build. Une modification transversale peut être un seul commit si le comportement est indivisible et testé ; sinon séparer les étapes qui restent compilables. Examiner le diff avant de stager ; éviter de prendre des fichiers non liés.

## Conventional Commits

`type(scope): sujet à l'impératif`, titre court (cible ≤ 72 caractères), corps expliquant pourquoi si nécessaire. Scopes recommandés : `markdown`, `ui`, `tauri`, `files`, `security`, `docs`, `build`, `ci`. Types : `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `style`. Rupture : `type(scope)!: ...` et `BREAKING CHANGE: ...` dans le corps.

Exemples :

```text
fix(markdown): résoudre les images depuis le document ouvert
feat(ui): ajouter une navigation par titres
fix(security): bloquer les URL de ressources non autorisées
docs(tauri): décrire l'ouverture via association de fichiers
```

## Avant de committer

- Lire `git diff --check`, `git diff --cached` et `git status --short`.
- Exécuter tests et linters pertinents disponibles selon `.rules/TESTING_RULES.md` ; indiquer les tests non exécutés dans la PR.
- Vérifier régression sur documents hostiles pour un changement de rendu/accès système ; mettre à jour doc et changelog lorsque l'utilisateur voit une différence.
- Ne pas committer de secret, document utilisateur, artefact de build ou `.progress/`.

## Branches et PR

`main` stable ; branches `feat/*`, `fix/*`, `docs/*`, `refactor/*`. PR de taille raisonnable avec revue et vérifications avant fusion. Préférer des commits explicites ; ne pas présumer d'une branche `develop` ou d'un outil de publication avant leur adoption documentée.

## Changelog

Tenir `CHANGELOG.md` à la main : ajouter les changements visibles sous `[Unreleased]` (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`). Ne pas faire figurer chaque commit interne. À la release, dater une section et vérifier les notes de migration. Voir `.rules/VERSIONING.md`.
