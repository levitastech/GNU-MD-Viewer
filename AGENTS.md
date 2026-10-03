# AGENTS.md — GNU-MD Viewer

## Mission et périmètre

Construire un lecteur Markdown desktop hors ligne, rapide, fiable et sûr. Linux est prioritaire ; conserver la portabilité Windows et macOS. Le binaire cible est `gnu-mdv` ; `gnu-md` peut devenir un alias après vérification des collisions de noms et des paquets. Le projet est indépendant du projet GNU : ne pas suggérer une affiliation.

État constaté le 3 octobre 2026 : pack documentaire uniquement ; aucun `package.json`, `src-tauri/`, code applicatif ou workflow CI. Recontrôler cet état avant toute tâche et actualiser cette mention au bootstrap. Les commandes de `docs/DEVELOPMENT.md` sont des cibles futures tant que les scripts/manifeste correspondants n'existent pas.

## Reprise et portée de travail

- Lire les quatre fichiers `.rules/` avant de modifier ; pour un chantier, lire `.progress/STATE.md`, `PROGRESS.yml`, puis le plan concerné et `HANDOFF.md` si présent.
- Plan directeur local : `.progress/GNU_MD_VIEWER_PLAN_CHANTIER_V1.md`. Fiches d'exécution : `.progress/GNU_MD_VIEWER_PLAN_P1.md` (L00–L04), `P2` (L05–L13), `P3` (L14–L22), `P4` (L23–L29), avec le même préfixe de fichier.
- Le plan, SG01–SG09 et les budgets V1 §12.2 sont validés ; cela ne clôt aucun lot et ne prouve aucune gate G1–G4. Appliquer les arbitrages déjà retenus ; signaler tout changement de contrat au lieu de les rouvrir par défaut.
- Avancer lot par lot selon les dépendances. Distinguer l'affinement documentaire, l'implémentation, la qualification et la livraison ; une demande de plan n'autorise pas le bootstrap applicatif.
- `.progress/` est local et ignoré, jamais à stager. Si absent dans un clone, consulter les références durables de `docs/` et le périmètre demandé ; ne pas fabriquer d'historique ni faire dépendre les contributeurs de ce suivi.
- Préserver les modifications concurrentes. Le parallélisme décrit dans le plan est une possibilité d'organisation, pas une instruction de lancer des sous-agents. Ne pas committer, pousser, taguer ou publier sans demande ou autorisation déjà accordée pour l'action concernée.

## Ordre de travail

1. Lire les fichiers concernés et identifier bug, dette, amélioration ou fonctionnalité.
2. Choisir le changement le plus simple qui améliore la lecture des documents.
3. Vérifier les APIs et versions dans la documentation officielle avant d'écrire du code dépendant de Tauri, Svelte ou des bibliothèques.
4. Contrôler les implications de sécurité, performance et portabilité.
5. Mettre à jour tests et documentation concernés ; exécuter les vérifications disponibles et dire ce qui n'a pas été exécuté.
6. Appliquer `.rules/COMMIT_RULES.md`, `.rules/TESTING_RULES.md`, `.rules/PROGRESS_RULES.md` et `.rules/VERSIONING.md`.

## Stack et responsabilités

Tauri 2 / Rust stable : fichiers, arguments, événements OS, associations, configuration locale et intégration système. Svelte 5 / TypeScript strict / Vite / pnpm : interface et rendu. Parser indépendant de Svelte, du DOM et de Tauri : markdown-it et plugins explicites. highlight.js, Mermaid et KaTeX : enrichisseurs chargés à la demande, avec assets embarqués. HTML généré sanitisé avec DOMPurify avant insertion DOM ; sorties HTML/SVG/MathML des enrichisseurs contrôlées à leur tour. CSS natif en priorité. Vérifier licence, maintenance, poids et surface d'attaque avant toute dépendance ; figer versions et lockfiles au bootstrap.

Pipeline logique : Markdown → parsing → plugins → HTML → sanitisation → DOM → enrichissement contrôlé. Aucun contenu Markdown ne reçoit de privilèges Tauri. Ne pas promettre une conformité GFM totale avant les fixtures de référence.

## Invariants

- HTML brut désactivé par défaut ; pas de script distant, `eval` ou chargement réseau automatique.
- Les liens et images relatifs se basent sur le chemin du document ouvert, jamais sur le CWD.
- Pas de lecture arbitraire exposée au DOM ; Rust valide indépendamment chemins, handles, schémas, permissions et ressources. Les scopes d'un plugin ne protègent pas automatiquement une commande personnalisée.
- Racine initiale = dossier du document ; extension parent/projet par action native explicite. Résoudre puis vérifier le confinement, y compris symlinks/substitutions et ouverture effective ; révoquer les ressources à la fermeture. Aucun scope global disque/home.
- HTTP/HTTPS externes : confirmation ou ouverture explicite dans le navigateur système, jamais chargement silencieux.
- Pas de télémétrie ni de compte ; expérience utilisable sans réseau.
- Mesurer lancement, mémoire et gros documents avant d'optimiser ; charger les extensions lourdes à la demande.
- Une fenêtre/un document ; une ouverture échouée conserve le précédent. Plusieurs chemins dans une entrée : premier traité, autres signalés. Aucun résultat tardif de lecture/rendu ne remplace la session active ; nettoyer watchers, listeners, URLs et caches.
- Documents en lecture seule, jamais créés/modifiés ; UTF-8/BOM et LF/CRLF, erreur pour UTF-8 invalide. Frontmatter = texte Markdown ordinaire au MVP ; préférences et historique locaux bornés.

## Portée MVP

Ouverture `.md`, `.markdown`, `.mdown`, `.mkd` (dialogue, CLI, association, dépôt), CommonMark/GFM ciblé, tâches en lecture seule, tables, autolinks, footnotes, alerts GitHub, images et chemins relatifs, code, coloration, Mermaid, KaTeX, ancres et table des matières, navigation, thèmes, zoom, raccourcis, rechargement externe, récents. Recherche littérale dans le texte rendu du document courant, code compris, insensible à la casse et accents conservés ; suivant/précédent et compteur, sans regex ni sources cachées Mermaid/KaTeX.

Hors MVP : édition, onglets, explorateur, recherche multi-documents, export/impression, plugins installables, updater, backend/serveur HTTP, base de données et cloud. P2 produit un lecteur utilisable ; P3 complète le MVP ; P4 qualifie puis livre. Une plateforme ou un format n'est annoncé supporté qu'après recette native installée ; une cible indisponible est explicitement différée selon SG05.

## Validation et clôture

Tester les contrats observables et les fixtures de régression ; pendant un lot, exécuter les contrôles ciblés, puis les suites pertinentes et recettes natives à la gate. Avant code/API dépendant d'une bibliothèque, vérifier la documentation officielle actuelle et consigner la version retenue ; ne pas présenter les constats amont hérités du plan comme un audit exécuté ici.

Chaque preuve indique lot/scénario, commit ou diff exact, commande/recette, configuration OS/WebView, attendu et résultat. Distinguer réussite, échec et non-exécution avec raison. Compilation, mocks IPC et snapshots DOM ne prouvent pas seuls une recette desktop, le confinement ou l'absence de réseau.

Avant application : vérifier structure, liens documentaires et diff ; ne pas lancer ni annoncer des suites inexistantes. Ne pas inventer des performances : conserver les budgets validés, calibrer les limites manquantes en P1 et mesurer selon le corpus/protocole. Une modification du build invalide les preuves impactées.

Un lot est `done` seulement avec livrables et preuves ; une gate exige sa checklist. G4 signifie candidat publiable, pas publication autorisée ni livraison achevée ; P4 est clos après L29. Tenir le suivi à jour sans transformer une préparation en preuve d'exécution.

## Fichiers de référence

`README.md` : usage et état ; `docs/ARCHITECTURE.md` : frontières ; `docs/DEVELOPMENT.md` : commandes et étapes ; `docs/SECURITY.md` : modèle de menace ; `docs/adr/` : décisions durables ; `CONTRIBUTING.md` : processus. `docs/adr/0001-licence-et-nom.md` conserve la validation publique du nom en attente. Le texte MIT intégral et l'attribution réelle doivent être vérifiés en L00 ; ne pas choisir seul le titulaire des droits.

Les consignes locales `.rules/` complètent ce fichier ; `CLAUDE.md` donne le parcours propre à Claude sans dupliquer les contrats. Les instructions explicites de l'utilisateur priment. En cas de conflit documentaire, signaler l'écart, appliquer les décisions déjà autorisées et mettre à jour les références concernées. Les décisions durables vont dans `docs/`/ADR, jamais uniquement dans `.progress/`.
