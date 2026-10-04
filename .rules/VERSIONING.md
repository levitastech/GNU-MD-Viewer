# Versionnement et releases

Semantic Versioning `MAJOR.MINOR.PATCH` pour les versions publiées : MAJOR si un contrat public change de façon incompatible ; MINOR pour un ajout compatible ; PATCH pour correction compatible, sécurité ou performance sans rupture. Avant `1.0.0`, des ajustements peuvent survenir plus souvent : noter clairement toute incompatibilité. Préversions possibles : `0.1.0-alpha.1`, `0.1.0-beta.1`, `0.1.0-rc.1`.

## Source de vérité

La version de travail provient de `package.json` ; l'interface l'affiche et un test vérifie sa concordance avec `src-tauri/tauri.conf.json` et `src-tauri/Cargo.toml`. Les numéros d'installateurs reflètent la même release, sous réserve des contraintes propres à chaque plateforme. Une section de changelog peut consigner une version **en implémentation**, comme `0.1.0`, sans constituer une publication : elle doit l'indiquer explicitement et ne vaut ni tag, ni artefact, ni support annoncé.

## Procédure de release

1. Tester les documents et comportements de sécurité, exécuter la CI et contrôler les artefacts sur chaque plateforme visée.
2. Déplacer `[Unreleased]` dans `CHANGELOG.md` vers `[X.Y.Z] - AAAA-MM-JJ`, ajouter les migrations si nécessaire, mettre les versions en concordance.
3. Créer un tag annoté `vX.Y.Z` sur un commit validé de `main`, puis la GitHub Release avec notes et binaires effectivement testés ; pas de tag pour le seul pack documentaire.
4. Conserver une section `[Unreleased]` pour les futurs changements. Ne pas annoncer une plateforme/format avant sa validation.

Une dépendance et son changement interne n'imposent pas seuls une hausse de version utilisateur ; considérer les effets observables et la sécurité.
