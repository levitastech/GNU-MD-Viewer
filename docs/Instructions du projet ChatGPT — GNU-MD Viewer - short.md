# Projet : GNU-MD Viewer

## Mission

GNU-MD Viewer est un viewer Markdown desktop open source, rapide, léger, sûr et agréable à utiliser.

Priorité initiale : **Linux**, avec portabilité native vers **Windows** et **macOS**.

Le projet sera publié publiquement sur GitHub et doit être conçu comme un projet open source maintenable et contributif.

GNU-MD Viewer est avant tout un **lecteur Markdown**, pas un éditeur. Toute nouvelle fonctionnalité doit servir la lecture et la navigation efficaces dans les documents.

Priorités :

1. rapidité de lancement ;
2. fidélité du rendu ;
3. faible consommation mémoire ;
4. simplicité ;
5. intégration desktop ;
6. sécurité ;
7. compatibilité GitHub Flavored Markdown ;
8. portabilité ;
9. architecture modulaire ;
10. facilité de contribution.

---

# Stack officielle

## Desktop
- Tauri 2
- Rust stable

## Frontend
- Svelte 5
- TypeScript strict
- Vite
- pnpm

## Markdown
- markdown-it
- plugins markdown-it explicites
- CommonMark / GitHub Flavored Markdown

## Rendu enrichi
- highlight.js : coloration syntaxique
- Mermaid : diagrammes
- KaTeX : mathématiques
- DOMPurify : sanitisation HTML

## Styles
Privilégier :
- CSS natif ;
- variables CSS ;
- CSS scoped Svelte.

Éviter les frameworks CSS lourds si CSS natif suffit.

## Qualité et tests
Frontend :
- Vitest
- ESLint
- Prettier
- TypeScript strict

Rust :
- cargo test
- rustfmt
- cargo clippy

CI/CD :
- GitHub Actions
- lint
- tests
- builds multiplateformes
- GitHub Releases

---

# Architecture

Séparer clairement :

1. moteur Markdown ;
2. interface utilisateur ;
3. accès système ;
4. configuration ;
5. intégration Tauri.

Pipeline :

`Markdown → parsing → extensions → HTML → sanitisation → DOM → Mermaid/KaTeX`

Le moteur Markdown ne doit pas dépendre directement des composants Svelte et doit rester potentiellement réutilisable indépendamment de l'interface desktop.

## Rust / Tauri

Rust gère principalement :

- ouverture de fichiers ;
- arguments CLI ;
- associations de fichiers ;
- filesystem ;
- surveillance des modifications ;
- métadonnées ;
- intégration drag & drop native ;
- ouverture des URLs externes ;
- configuration native ;
- intégration OS ;
- fonctions nécessitant des permissions.

Ne pas déplacer vers Rust une logique qui peut rester simple, sûre et testable en TypeScript.

## Svelte / TypeScript

Le frontend gère :

- rendu Markdown ;
- UI ;
- navigation ;
- table des matières ;
- thèmes ;
- raccourcis ;
- recherche ;
- zoom ;
- historique visuel ;
- états applicatifs ;
- erreurs.

Les composants doivent rester petits et spécialisés.

---

# MVP

La première version publiable doit supporter :

- `.md`, `.markdown`, `.mdown`, `.mkd` ;
- ouverture de fichiers ;
- drag & drop ;
- ouverture via CLI ;
- associations de fichiers ;
- CommonMark / GFM ;
- titres, listes, tableaux, citations ;
- task lists ;
- liens et autolinks ;
- images locales ;
- chemins relatifs ;
- blocs de code ;
- coloration syntaxique ;
- footnotes ;
- GitHub-style alerts ;
- Mermaid ;
- KaTeX ;
- ancres automatiques ;
- table des matières ;
- navigation par titres ;
- thèmes clair, sombre et système ;
- zoom ;
- raccourcis clavier ;
- hot reload après modification externe ;
- fichiers récents.

Le viewer doit fonctionner entièrement hors ligne.

---

# Interface et navigation

L'interface doit rester minimaliste et centrée sur le document.

Prévoir :

- barre supérieure discrète ;
- zone principale de lecture ;
- panneau latéral optionnel ;
- table des matières ;
- recherche ;
- informations du fichier ;
- paramètres.

Les panneaux secondaires doivent pouvoir être masqués.

---

# Rendu Markdown

Priorité à la compatibilité avec les README et documents techniques GitHub.

Toute extension Markdown non standard doit être isolée sous forme de plugin.

Éviter les modifications ad hoc du parser lorsqu'un plugin peut résoudre le besoin.

Les images et liens relatifs doivent être résolus relativement au **fichier Markdown ouvert**, jamais relativement au répertoire courant du processus.

---

# Sécurité

Considérer tout fichier Markdown comme potentiellement non fiable.

Règles obligatoires :

- ne jamais exécuter de JavaScript provenant du Markdown ;
- désactiver le HTML brut par défaut ;
- sanitiser tout HTML généré ;
- utiliser DOMPurify ou une solution auditée équivalente ;
- appliquer une CSP restrictive ;
- interdire les scripts distants arbitraires ;
- limiter les permissions Tauri ;
- limiter les scopes filesystem ;
- ouvrir les URLs HTTP/HTTPS dans le navigateur système ;
- ne jamais utiliser `eval` ;
- contrôler strictement tout usage de `innerHTML` ;
- ne jamais exposer arbitrairement les APIs Tauri au contenu Markdown.

Un éventuel mode HTML plus permissif doit être explicitement identifié comme mode de confiance et rester désactivé par défaut.

---

# Vie privée

Fonctionnement local par défaut :

- aucune télémétrie ;
- aucun analytics ;
- aucun upload ;
- aucune API distante ;
- aucune collecte des documents ;
- aucun compte obligatoire.

Toute future fonctionnalité réseau doit être documentée et optionnelle.

---

# Performance

L'application doit rester fluide sur de gros documents.

Éviter :

- rerenders inutiles ;
- dépendances lourdes ;
- gros frameworks UI ;
- chargement anticipé de fonctions rares.

Utiliser le lazy loading lorsque pertinent pour Mermaid, KaTeX, coloration syntaxique et fonctions secondaires.

Mesurer avant d'optimiser. Les optimisations importantes doivent idéalement être accompagnées de benchmarks reproductibles.

---

# Dépendances

Avant d'ajouter une dépendance, vérifier :

1. qu'elle est réellement nécessaire ;
2. qu'une fonction native ou existante ne suffit pas ;
3. son niveau de maintenance ;
4. sa licence ;
5. sa taille ;
6. ses implications de sécurité.

Préférer des bibliothèques reconnues et ciblées.

Éviter les packages npm inutiles pour des fonctions triviales.

---

# Portabilité et distribution

Toute modification doit considérer Linux, Windows et macOS.

Linux reste la plateforme principale de développement, mais le code commun ne doit pas dépendre inutilement de comportements Linux.

Utiliser les APIs Tauri/Rust multiplateformes et isoler le code spécifique à un OS.

Formats prévus :

Linux :
- AppImage
- `.deb`
- `.rpm`

Windows :
- NSIS `.exe`
- MSI si pertinent

macOS :
- `.app`
- `.dmg`

Automatiser les releases avec GitHub Actions.

Prévoir ensuite :
- signatures Windows ;
- signature/notarisation macOS ;
- mise à jour automatique Tauri.

---

# GitHub et licence

Le repository est public.

Maintenir au minimum :

- `README.md`
- `LICENSE`
- `CONTRIBUTING.md`
- `SECURITY.md`
- `CHANGELOG.md`
- templates Issues / Pull Requests
- documentation développeur

Branches :

- `main` : stable
- `feat/...`
- `fix/...`
- `docs/...`
- `refactor/...`

Éviter les changements importants directement sur `main`.

Commits atomiques avec préfixes :

`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `build:`, `ci:`, `chore:`.

Licence de référence : **MIT**.

Toute dépendance ou code réutilisé doit avoir une licence compatible. Ne jamais copier du code d'un projet tiers sans vérifier licence, compatibilité et obligations d'attribution.

Les projets de référence servent à étudier fonctionnalités et architecture, pas à copier aveuglément leur implémentation.

---

# Documentation

Maintenir :

- `README.md` : présentation utilisateur ;
- `docs/ARCHITECTURE.md` : architecture ;
- `docs/DEVELOPMENT.md` : environnement et développement ;
- `docs/SECURITY.md` : modèle de sécurité ;
- `CONTRIBUTING.md` : contribution ;
- `docs/adr/` : décisions architecturales importantes si nécessaire.

---

# Méthode de travail avec ChatGPT

Pour toute demande concernant le projet :

1. examiner les fichiers existants avant une modification importante ;
2. préserver l'architecture actuelle lorsqu'elle reste pertinente ;
3. identifier précisément les fichiers concernés ;
4. distinguer bug, dette technique, amélioration et fonctionnalité ;
5. choisir la solution la plus simple compatible avec les objectifs ;
6. éviter la surarchitecture ;
7. produire du code maintenable et testable ;
8. vérifier Linux/Windows/macOS ;
9. vérifier sécurité et performances ;
10. ajouter ou adapter les tests.

Pour toute information dépendant de versions ou APIs susceptibles d'évoluer — Tauri, Svelte, Vite, Rust, dépendances — vérifier les sources actuelles avant de conclure.

Priorité des sources :

1. documentation officielle ;
2. repository officiel ;
3. issues/discussions officielles ;
4. sources techniques reconnues.

Ne jamais inventer une API ou un comportement non vérifié.

---

# Règles de décision

En cas de plusieurs solutions, privilégier :

1. simplicité ;
2. sécurité ;
3. performance ;
4. maintenabilité ;
5. portabilité ;
6. peu de dépendances ;
7. facilité de contribution ;
8. qualité de l'implémentation.

Éviter par défaut :

- Electron ;
- backend web ;
- serveur HTTP local si Tauri suffit ;
- base de données pour le MVP ;
- React si Svelte suffit ;
- Redux ;
- Tailwind sans justification ;
- frameworks UI lourds ;
- microservices ;
- comptes utilisateurs ;
- cloud obligatoire ;
- télémétrie ;
- dépendances inutiles ;
- édition Markdown avancée avant stabilisation du viewer.

---

# Vision

Après stabilisation du MVP, les évolutions possibles comprennent :

- onglets ;
- navigation par répertoire ;
- recherche plein texte ;
- mode présentation ;
- export HTML/PDF ;
- impression ;
- mode focus ;
- bookmarks ;
- historique et restauration de session ;
- thèmes personnalisables ;
- système de plugins ;
- CLI dédiée ;
- mise à jour automatique ;
- éventuelle extension navigateur partageant le moteur Markdown.

Ces évolutions ne doivent pas complexifier prématurément le MVP.

## Principe directeur

GNU-MD Viewer doit permettre de double-cliquer sur n'importe quel fichier Markdown et de l'ouvrir instantanément dans une vue **propre, fidèle, sûre et agréable à lire**.

Toute décision technique doit rester alignée sur cet objectif.