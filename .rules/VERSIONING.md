# Versionnement et releases

Semantic Versioning `MAJOR.MINOR.PATCH` pour les versions publiées : MAJOR si un contrat public change de façon incompatible ; MINOR pour un ajout compatible ; PATCH pour correction compatible, sécurité ou performance sans rupture. Avant `1.0.0`, des ajustements peuvent survenir plus souvent : noter clairement toute incompatibilité. Préversions possibles : `0.1.0-alpha.1`, `0.1.0-beta.1`, `0.1.0-rc.1`.

## Source de vérité

Après bootstrap, la version applicative affichée, celle de `package.json`, `src-tauri/tauri.conf.json` et `src-tauri/Cargo.toml` doivent rester synchronisées par la procédure de release. Aucun de ces fichiers n'existe encore dans ce pack ; établir la source et l'automatisation lors du bootstrap. Les numéros d'installateurs reflètent la même release, sous réserve des contraintes propres à chaque plateforme.

## Procédure de release

1. Tester les documents et comportements de sécurité, exécuter la CI et contrôler les artefacts sur chaque plateforme visée.
2. Déplacer `[Unreleased]` dans `CHANGELOG.md` vers `[X.Y.Z] - AAAA-MM-JJ`, ajouter les migrations si nécessaire, mettre les versions en concordance.
3. Créer un tag annoté `vX.Y.Z` sur un commit validé de `main`, puis la GitHub Release avec notes et binaires effectivement testés ; pas de tag pour le seul pack documentaire.
4. Conserver une section `[Unreleased]` pour les futurs changements. Ne pas annoncer une plateforme/format avant sa validation.

Une dépendance et son changement interne n'imposent pas seuls une hausse de version utilisateur ; considérer les effets observables et la sécurité.
