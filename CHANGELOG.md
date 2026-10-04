# Historique des changements

Format inspiré de Keep a Changelog ; versions selon Semantic Versioning. Les changements visibles sont consignés à la main, sans déduire mécaniquement les versions des commits.

## [Unreleased]

## [0.1.0] - 2026-10-04 — en implémentation, non publiée

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

Cette section décrit l'état d'implémentation `0.1.0`, sans tag, installateur,
publication ni promesse de support de plateforme. Les changements futurs restent
sous `[Unreleased]` jusqu'à leur rattachement explicite à une version.
