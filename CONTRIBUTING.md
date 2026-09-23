# Contribuer à GNU-MD Viewer

Merci de contribuer à un lecteur Markdown simple, hors ligne et sûr. Une contribution doit améliorer la lecture, la navigation, la fiabilité ou l'accessibilité sans alourdir inutilement le lancement et la mémoire.

## Avant de coder

1. Lire `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY.md` et les règles `.rules/` applicables.
2. Vérifier les tickets et discussions existants. Pour un changement d'architecture ou de dépendance majeur, ouvrir d'abord une issue avec coût, alternatives, sécurité, licence et impact Linux/Windows/macOS.
3. Partir de `main` à jour sur une branche `feat/*`, `fix/*`, `docs/*` ou `refactor/*`. Ne pas modifier directement `main` pour un changement important.

## Implémentation et validation

Suivre les frontières du moteur, de l'UI et du système. Pour un bug, fournir une reproduction ou fixture ; pour un changement de rendu, ajouter les cas Markdown concernés ; pour une entrée hostile, couvrir la régression de sécurité. Exécuter les vérifications réellement disponibles décrites dans `docs/DEVELOPMENT.md` et `.rules/TESTING_RULES.md`. Signaler ce qui manque dans la PR. Ne jamais déposer de documents privés dans un ticket ou des fixtures.

Vérifier les droits sur les contributions : pas de copie de code, d'images ou de textes tiers sans licence et attribution compatibles. Tout apport proposé est destiné à être distribué sous la licence du projet, sauf identification claire des fichiers tiers.

## Pull request

Limiter la PR à une unité cohérente, utiliser les commits conventionnels, remplir le modèle de PR, expliquer les impacts de sécurité, performance et portabilité. Lier l'issue si applicable. Mettre à jour le changelog pour toute évolution visible. La revue, les tests et la documentation font partie du changement.

Les vulnérabilités se signalent selon `SECURITY.md`, sans issue publique exploitante. Le comportement attendu figure dans `CODE_OF_CONDUCT.md`.
