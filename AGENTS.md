# AGENTS.md — GNU-MD Viewer

## Mission et périmètre

Construire un lecteur Markdown desktop hors ligne, rapide, fiable et sûr. Linux est prioritaire ; conserver la portabilité Windows et macOS. Le binaire cible est `gnu-mdv` ; `gnu-md` peut devenir un alias après vérification des collisions de noms et des paquets. Le projet est indépendant du projet GNU : ne pas suggérer une affiliation.

Ce pack est une base documentaire. Vérifier les fichiers réels du dépôt avant toute modification ; ne pas supposer que le squelette applicatif, les scripts ou la CI existent déjà.

## Ordre de travail

1. Lire les fichiers concernés et identifier bug, dette, amélioration ou fonctionnalité.
2. Choisir le changement le plus simple qui améliore la lecture des documents.
3. Vérifier les APIs et versions dans la documentation officielle avant d'écrire du code dépendant de Tauri, Svelte ou des bibliothèques.
4. Contrôler les implications de sécurité, performance et portabilité.
5. Mettre à jour tests et documentation concernés ; exécuter les vérifications disponibles et dire ce qui n'a pas été exécuté.
6. Appliquer `.rules/COMMIT_RULES.md`, `.rules/TESTING_RULES.md`, `.rules/PROGRESS_RULES.md` et `.rules/VERSIONING.md`.

## Stack et responsabilités

Tauri 2 / Rust stable : fichiers, arguments, événements OS, associations et intégration système. Svelte 5 / TypeScript strict / Vite / pnpm : interface et rendu. Parser indépendant des composants : markdown-it et plugins explicites. HTML généré sanitisé avec DOMPurify avant insertion DOM ; enrichissements Mermaid/KaTeX traités comme entrées non fiables. CSS natif en priorité. Vérifier licence, maintenance, poids et surface d'attaque avant toute dépendance.

Pipeline logique : Markdown → parsing → plugins → HTML → sanitisation → DOM → enrichissement contrôlé. Aucun contenu Markdown ne reçoit de privilèges Tauri. Ne pas promettre une conformité GFM totale avant les fixtures de référence.

## Invariants

- HTML brut désactivé par défaut ; pas de script distant, `eval` ou chargement réseau automatique.
- Les liens et images relatifs se basent sur le chemin du document ouvert, jamais sur le CWD.
- Pas de lecture arbitraire exposée au DOM ; vérifier chemins, schémas d'URL, permissions et ressources locales.
- HTTP/HTTPS externes : confirmation ou ouverture explicite dans le navigateur système, jamais chargement silencieux.
- Pas de télémétrie ni de compte ; expérience utilisable sans réseau.
- Mesurer lancement, mémoire et gros documents avant d'optimiser ; charger les extensions lourdes à la demande.

## Portée MVP

Ouverture `.md`, `.markdown`, `.mdown`, `.mkd` (dialogue, CLI, association, dépôt), CommonMark/GFM, tâches, tables, autolinks, footnotes, alerts GitHub, images et chemins relatifs, code, coloration, Mermaid, KaTeX, ancres et table des matières, navigation, thèmes, zoom, raccourcis, rechargement externe, récents. Rester un lecteur ; les fonctions d'édition et le cloud ne sont pas prioritaires.

## Fichiers de référence

`README.md` : usage et état ; `docs/ARCHITECTURE.md` : frontières ; `docs/DEVELOPMENT.md` : commandes et étapes ; `docs/SECURITY.md` : modèle de menace ; `docs/adr/` : décisions durables ; `CONTRIBUTING.md` : processus. Les consignes locales `.rules/` complètent ce fichier. En cas de conflit, documenter la décision et mettre à jour les références.
