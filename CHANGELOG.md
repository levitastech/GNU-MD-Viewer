# Historique des changements

Format inspiré de Keep a Changelog ; versions selon Semantic Versioning. Les changements visibles sont consignés à la main, sans déduire mécaniquement les versions des commits.

## [Unreleased]

## [0.3.0] - 2026-10-07 — en implémentation, non publiée

### Added

- Formules KaTeX différées avec polices embarquées, erreurs locales et macros
  isolées ; délimiteurs explicites sans interpréter les montants en dollars.
- Ouverture P3/V4 : diagrammes Mermaid différés, file bornée, sources et
  erreurs locales conservées ; flowcharts et séquences, sans interactions.

## [0.2.0] - 2026-10-04 — en implémentation, non publiée

### Added

- Chemins locaux URI décodés une seule fois, fragments entre documents et
  sélection native d'un dossier parent/projet autorisé pour la session.
- Choix clair/sombre/système réactif, zoom de lecture 80–200 % par pas de
  10 points et remise à 100 %, sans reparsing du document.
- Ancres documentaires avec focus clavier, section active du sommaire et
  panneau masquable, sans navigation de la WebView.
- Tâches en lecture seule avec nom accessible, notes avec renvois locaux
  conservés après sanitisation et alertes GitHub dans le profil Markdown.
- Les cinq alertes GitHub ont un repère de lecture et des bordures distinctes ;
  les tâches imbriquées et les notes répétées restent navigables ensemble.
- Première tranche P2/V2 : dialogue natif, lecture seule UTF-8 bornée, moteur
  Markdown autonome, rendu sanitisé et interface de lecture avec conservation
  du dernier document valide en cas d'échec.
- Tables, barré, autolinks, titres Unicode déterministes, code échappé et
  placeholders d'images distantes dans le profil Markdown initial.

### Changed

- Dialogue document détenu par Rust avec sélection opaque à usage unique ; les
  chemins natifs ne traversent pas le DOM. Liens HTTP(S) confirmés puis
  revalidés côté Rust avant ouverture dans le navigateur système.

### Fixed

- Section active du sommaire correcte après défilement rapide ou entre deux
  titres éloignés, sans déplacer le focus ni perdre la sélection de texte.
- Ancres Unicode décomposées et titres Setext multilignes ; les renvois de
  notes ne sont plus détournés par un titre homonyme.
- Lecture des paragraphes arabes et mixtes dans leur sens naturel en fenêtre
  étroite, sans changer la direction du code ni de l'interface.

### Security

- Extension de racine bornée à un ancêtre choisi par dialogue natif, jamais
  une racine disque/home ; nouvelle session et nouveaux jetons d'images même
  lorsque le contenu Markdown est identique. Encodages invalides, queries,
  séparateurs Windows et chemins absolus restent refusés.
- Navigation Markdown relative : racine initiale conservée après changement
  de document, contrôle du handle ouvert sur Linux et révocation des
  sélections liées à une session fermée. Les erreurs relatives conservent le
  document affiché et signalent leur cause.
- Refus des fichiers trop grands, non UTF-8, spéciaux, remplacés ou à suffixe
  trompeur ; HTML brut, protocoles dangereux et chargements distants restent
  inertes avant insertion.

Cette section décrit la release `0.2.0` en cours d'implémentation, sans tag,
installateur, publication ni promesse de support de plateforme. P2/G2 est clos
sur la matrice Linux après V3 ; les changements non encore rattachés à une version restent sous
`[Unreleased]`.

## [0.1.0] - 2026-10-04 — socle P1, non publiée

### Added

- Pack initial de documentation, de gouvernance GitHub et de règles de contribution.
- Cadrage V0 : matrice de stack, audit de provenance, politiques de sécurité,
  ADR de lecture locale et rapports de clôture L00/L01.
- Corpus Markdown déterministe, fixtures hostiles et protocole de performances
  avec critères d'acceptation explicites.
- Socle Tauri 2 / Svelte 5 compilable, fenêtre minimale, lockfiles exacts,
  contrôles TypeScript/Rust et compilation release Linux sans installateur.
- Binaire technique `gnu-mdv`, identifiant provisoire `com.levitastech.gnu-mdv`,
  configuration Tauri minimale et sans installateur automatique.
- Interface minimale Svelte affichant l'identité et la version de travail, avec
  icônes originales générées localement depuis le SVG du projet.
- Outillage local figé : pnpm, Vite, TypeScript strict, ESLint, Prettier,
  Vitest, rustfmt, Clippy et tests de contrats de version.
- Rapport de bootstrap L03, notices des dépendances résolues et suivi des avis
  transitifs GLib/GTK issus de l'audit Rust.
- Contrats d'ouverture, de rendu et de ressource ; prototypes de sanitisation,
  de bornes d'enrichissement et de service de ressources Linux documentés en L04.

### Changed

- Remplacement de la notice MIT abrégée par le texte intégral, attribution
  existante conservée dans l'attente de la validation du titulaire.
- Source de version unifiée dans `package.json`, contrôlée contre les manifestes
  Tauri et Rust.
- CSP étendue uniquement au protocole d'images locales à jetons ; commandes IPC
  de ressources limitées à la fenêtre principale et revalidées côté Rust.

### Security

- CSP release restrictive, sans CDN, contenu distant ni privilège Tauri exposé
  au contenu Markdown.
- Prototype Linux de ressources locales : cache borné, jetons 256 bits
  révocables sans chemin dans le DOM, contrôle du handle, de la racine et de la
  session.

Cette section conserve l'historique du socle P1 `0.1.0`. Cette version n'a pas
été taguée, empaquetée ni publiée.
