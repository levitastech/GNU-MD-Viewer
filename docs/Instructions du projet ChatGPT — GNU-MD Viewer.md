# Projet : GNU-MD Viewer

## Mission

Ce projet vise à concevoir, développer, documenter et publier un viewer Markdown desktop open source.

L'objectif principal est de fournir une application rapide, légère, sûre et agréable permettant d'ouvrir et consulter des fichiers Markdown locaux avec un rendu de haute qualité.

La plateforme initiale prioritaire est Linux.

L'architecture doit cependant rester nativement portable vers :

- Linux ;
- Windows ;
- macOS.

Le projet sera publié publiquement sur GitHub et doit être conçu dès le départ comme un véritable projet open source maintenable et contributif.

---

# Positionnement produit

GNU-MD Viewer est avant tout un lecteur Markdown et non un éditeur.

Le produit doit privilégier :

1. rapidité de lancement ;
2. fidélité du rendu ;
3. faible consommation mémoire ;
4. simplicité d'utilisation ;
5. intégration desktop ;
6. sécurité lors de l'ouverture de documents non fiables ;
7. compatibilité GitHub Flavored Markdown ;
8. portabilité Linux/Windows/macOS ;
9. architecture modulaire ;
10. facilité de contribution.

Éviter d'introduire des fonctions complexes d'édition tant que le viewer n'est pas mature.

Chaque nouvelle fonctionnalité doit être évaluée par rapport au rôle principal de l'application : lire et naviguer efficacement dans des documents Markdown.

---

# Stack technique de référence

La stack officielle du projet est :

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
- plugins markdown-it sélectionnés explicitement
- GitHub Flavored Markdown lorsque pertinent

## Rendu enrichi

- highlight.js pour les blocs de code
- Mermaid pour les diagrammes
- KaTeX pour les expressions mathématiques
- DOMPurify pour la sanitisation du HTML

## Styles

Utiliser prioritairement :

- CSS natif ;
- variables CSS ;
- CSS scoped des composants Svelte.

Éviter l'ajout d'un framework CSS lourd si CSS natif suffit.

## Tests

- Vitest pour TypeScript et moteur de rendu ;
- tests Rust avec cargo test ;
- tests de fixtures Markdown ;
- tests d'intégration lorsque nécessaire.

## Qualité

Frontend :

- ESLint ;
- Prettier ;
- TypeScript strict.

Rust :

- rustfmt ;
- cargo clippy ;
- cargo test.

## CI/CD

Utiliser GitHub Actions pour :

- lint ;
- tests ;
- build ;
- génération des exécutables ;
- GitHub Releases.

---

# Architecture

Maintenir une séparation nette entre :

1. moteur Markdown ;
2. interface utilisateur ;
3. accès système ;
4. configuration ;
5. intégration Tauri.

Le moteur Markdown ne doit pas dépendre directement des composants Svelte.

Architecture logique souhaitée :

Markdown source
→ parsing
→ extensions
→ génération HTML
→ sanitisation
→ rendu DOM
→ enrichissement Mermaid/KaTeX.

L'objectif est que le moteur Markdown puisse éventuellement être réutilisé indépendamment de l'interface desktop.

---

# Responsabilités Rust / Tauri

Rust doit gérer les fonctions nécessitant une intégration avec le système d'exploitation :

- ouverture de fichiers ;
- arguments CLI ;
- associations de fichiers ;
- accès filesystem ;
- surveillance des modifications ;
- métadonnées de fichiers ;
- drag & drop lorsqu'une intégration native est nécessaire ;
- ouverture des URLs externes ;
- configuration native ;
- intégration desktop ;
- fonctions nécessitant des permissions privilégiées.

Ne pas déplacer inutilement dans Rust une logique qui peut rester simple, sûre et testable en TypeScript.

---

# Responsabilités TypeScript / Svelte

Le frontend doit gérer :

- rendu Markdown ;
- UI ;
- navigation dans le document ;
- table des matières ;
- thèmes ;
- raccourcis ;
- historique visuel ;
- recherche dans le document ;
- zoom ;
- états applicatifs ;
- affichage des erreurs.

Les composants doivent rester petits et spécialisés.

Éviter les composants monolithiques.

---

# Fonctionnalités MVP

La première version publiable doit prendre en charge au minimum :

- ouverture de fichiers Markdown ;
- drag & drop ;
- ouverture via argument CLI ;
- association avec les extensions Markdown ;
- `.md` ;
- `.markdown` ;
- `.mdown` ;
- `.mkd` ;
- rendu CommonMark/GFM ;
- titres ;
- listes ;
- tableaux ;
- task lists ;
- citations ;
- liens ;
- images locales ;
- liens relatifs ;
- blocs de code ;
- coloration syntaxique ;
- Mermaid ;
- KaTeX ;
- table des matières ;
- navigation par titres ;
- thème clair ;
- thème sombre ;
- thème suivant le système ;
- zoom ;
- raccourcis clavier ;
- hot reload lors d'une modification externe du fichier ;
- fichiers récents.

Le viewer doit fonctionner totalement hors ligne.

---

# Navigation

La lecture doit rester centrale.

Prévoir une interface minimaliste avec idéalement :

- barre supérieure discrète ;
- zone principale de document ;
- panneau latéral optionnel ;
- table des matières ;
- recherche ;
- informations du fichier ;
- paramètres.

Les panneaux secondaires doivent pouvoir être masqués.

La lecture d'un document ne doit pas être encombrée par l'interface.

---

# Rendu Markdown

La priorité est la compatibilité avec les README et documents techniques couramment présents sur GitHub.

Prendre en charge progressivement :

- CommonMark ;
- GitHub Flavored Markdown ;
- tables ;
- strikethrough ;
- task lists ;
- footnotes ;
- autolinks ;
- fenced code blocks ;
- GitHub-style alerts ;
- Mermaid ;
- KaTeX ;
- ancres automatiques ;
- table des matières.

Toute extension non standard doit être isolée sous forme de plugin.

Ne pas modifier le parser de manière ad hoc lorsque l'utilisation ou la création d'un plugin est possible.

---

# Images et ressources locales

Les chemins relatifs doivent être résolus relativement au fichier Markdown ouvert.

Exemple :

document :

`/home/user/project/docs/readme.md`

image Markdown :

`../assets/logo.png`

résolution attendue :

`/home/user/project/assets/logo.png`

La même logique doit être appliquée aux autres fichiers Markdown liés.

Ne jamais considérer le répertoire courant du processus comme base des liens relatifs du document.

---

# Sécurité

Traiter chaque fichier Markdown ouvert comme potentiellement non fiable.

Principes obligatoires :

- ne jamais exécuter du JavaScript provenant du Markdown ;
- désactiver le HTML brut par défaut ;
- sanitiser tout HTML généré ;
- utiliser DOMPurify ou une solution équivalente auditée ;
- utiliser une CSP restrictive ;
- interdire le chargement arbitraire de scripts distants ;
- limiter les permissions Tauri au strict nécessaire ;
- limiter les scopes filesystem ;
- ouvrir les liens HTTP/HTTPS externes dans le navigateur système ;
- ne jamais utiliser eval ;
- éviter innerHTML sauf au niveau contrôlé du pipeline Markdown après sanitisation ;
- ne jamais exposer arbitrairement les APIs Tauri au contenu Markdown.

Le mode par défaut doit privilégier la sécurité.

Une éventuelle fonctionnalité permettant du contenu HTML plus permissif devra être explicitement identifiée comme mode de confiance et rester désactivée par défaut.

---

# Vie privée

GNU-MD Viewer doit fonctionner localement.

Par défaut :

- aucune télémétrie ;
- aucun analytics ;
- aucun upload ;
- aucune API distante ;
- aucune collecte de documents ;
- aucun compte utilisateur requis.

Toute future fonctionnalité réseau devra être explicitement documentée et optionnelle.

---

# Performance

L'application doit rester fluide sur des documents Markdown importants.

Éviter :

- rerender complet inutile ;
- dépendances lourdes ;
- gros frameworks UI ;
- chargement anticipé de fonctionnalités rares.

Utiliser le lazy loading lorsque pertinent, notamment pour :

- Mermaid ;
- KaTeX ;
- bibliothèques de coloration syntaxique ;
- fonctions secondaires.

Mesurer avant d'optimiser.

Toute optimisation doit être accompagnée autant que possible d'un benchmark reproductible.

---

# Dépendances

Avant d'ajouter une dépendance :

1. vérifier qu'elle est réellement nécessaire ;
2. vérifier qu'une fonction native ou déjà présente ne suffit pas ;
3. vérifier son activité et sa maintenance ;
4. vérifier sa licence ;
5. vérifier sa taille ;
6. vérifier ses implications de sécurité ;
7. préférer les bibliothèques reconnues et ciblées.

Éviter l'accumulation de packages npm pour des fonctions triviales.

---

# Portabilité

Toute modification doit prendre en compte Linux, Windows et macOS.

Linux reste la plateforme prioritaire de développement, mais éviter les chemins, commandes ou comportements spécifiques Linux dans la logique applicative commune.

Utiliser les APIs Tauri/Rust multiplateformes chaque fois que possible.

Isoler le code spécifique à une plateforme.

---

# Distribution

Cibles prévues :

Linux :

- AppImage ;
- .deb ;
- .rpm.

Windows :

- NSIS .exe ;
- MSI si pertinent.

macOS :

- .app ;
- .dmg.

Les releases doivent être automatisées autant que possible avec GitHub Actions.

Prévoir ultérieurement :

- signatures Windows ;
- signature macOS ;
- notarisation macOS ;
- mécanisme de mise à jour Tauri.

---

# Git et GitHub

Le repository est public.

Adopter une organisation standard open source :

- README.md ;
- LICENSE ;
- CONTRIBUTING.md ;
- SECURITY.md ;
- CHANGELOG.md ;
- CODE_OF_CONDUCT.md si nécessaire ;
- templates Issues ;
- templates Pull Requests ;
- documentation développeur.

Branches recommandées :

- `main` : code stable ;
- branches `feat/...` ;
- branches `fix/...` ;
- branches `docs/...` ;
- branches `refactor/...`.

Ne jamais pousser directement sur `main` une modification importante sans validation.

Utiliser des commits atomiques et descriptifs.

Format de commit recommandé :

- `feat:`
- `fix:`
- `docs:`
- `refactor:`
- `test:`
- `build:`
- `ci:`
- `chore:`

---

# Licence

Licence de référence : MIT.

Toute dépendance intégrée doit avoir une licence compatible avec la distribution open source du projet.

Ne jamais copier du code provenant d'un autre projet sans :

- identifier sa licence ;
- vérifier la compatibilité ;
- respecter les obligations d'attribution ;
- documenter si nécessaire l'origine.

Les dépôts de référence doivent servir principalement à étudier les fonctionnalités, l'architecture et les choix techniques, pas à copier aveuglément leur implémentation.

---

# Documentation

Chaque fonctionnalité importante doit être documentée.

Maintenir au minimum :

`README.md`

Présentation utilisateur.

`docs/ARCHITECTURE.md`

Architecture technique.

`docs/DEVELOPMENT.md`

Installation de l'environnement et développement.

`docs/SECURITY.md`

Modèle de sécurité du renderer.

`CONTRIBUTING.md`

Contribution au projet.

Les décisions architecturales importantes peuvent être documentées sous forme d'ADR dans :

`docs/adr/`

---

# Méthode de travail avec ChatGPT

Lorsqu'une demande concerne le projet :

1. examiner les fichiers existants avant de proposer une modification importante ;
2. préserver l'architecture existante si elle reste pertinente ;
3. identifier précisément les fichiers concernés ;
4. distinguer bug, dette technique, amélioration et nouvelle fonctionnalité ;
5. proposer la solution la plus simple compatible avec les objectifs ;
6. éviter la surarchitecture ;
7. privilégier du code maintenable et testable ;
8. vérifier les impacts Linux/Windows/macOS ;
9. vérifier sécurité et performances ;
10. ajouter ou adapter les tests concernés.

Lorsque des informations concernent des versions, APIs Tauri, Svelte, Vite, Rust ou dépendances susceptibles d'avoir évolué, rechercher la documentation officielle actuelle avant de donner une réponse définitive.

Priorité des sources :

1. documentation officielle ;
2. repository officiel ;
3. issues/discussions officielles ;
4. sources techniques reconnues.

Ne pas inventer une API ou un comportement non vérifié.

---

# Règles de décision

En cas de plusieurs solutions possibles, privilégier dans cet ordre :

1. simplicité ;
2. sécurité ;
3. performance ;
4. maintenabilité ;
5. portabilité ;
6. faible nombre de dépendances ;
7. facilité de contribution ;
8. esthétique de l'implémentation.

Ne pas introduire un framework, service ou abstraction uniquement parce qu'il est populaire.

---

# Ce qu'il faut éviter

Éviter par défaut :

- Electron ;
- backend web ;
- serveur local HTTP lorsque Tauri suffit ;
- base de données pour le MVP ;
- React si Svelte répond au besoin ;
- Redux ou équivalent ;
- Tailwind uniquement pour quelques styles ;
- frameworks UI lourds ;
- microservices ;
- comptes utilisateurs ;
- cloud obligatoire ;
- télémétrie ;
- dépendances inutiles ;
- fonctionnalités d'édition avancées avant stabilisation du viewer.

---

# Vision à moyen terme

Après stabilisation du viewer de base, les extensions possibles sont :

- onglets multiples ;
- navigation d'un répertoire Markdown ;
- recherche plein texte ;
- mode présentation ;
- export HTML/PDF ;
- print stylesheet ;
- aperçu d'images amélioré ;
- mode focus ;
- bookmarks ;
- historique ;
- restauration de session ;
- thèmes personnalisables ;
- plugin system ;
- CLI dédiée ;
- mise à jour automatique ;
- éventuellement extension navigateur utilisant le même moteur Markdown.

Ces fonctions ne doivent pas compliquer prématurément le MVP.

---

# Principe directeur

GNU-MD Viewer doit devenir un équivalent desktop léger du comportement idéal suivant :

« Je double-clique sur n'importe quel fichier Markdown et il s'ouvre instantanément dans une vue propre, fidèle, sûre et agréable à lire. »

Toute décision technique doit rester alignée sur cet objectif.