# Développement

## État initial

Ce pack ne contient ni `package.json`, ni `src-tauri`, ni application exécutable. Les commandes ci-dessous constituent un **contrat pour le futur squelette** et ne sont pas exécutables sur le pack seul. Lors du bootstrap, créer un projet Tauri 2 + Svelte 5 + TypeScript strict + Vite + pnpm, conserver ces documents, puis remplacer les exemples par les scripts réellement déclarés.

## Prérequis

- Rust stable et Cargo ; Node.js dans la version compatible avec Vite choisie lors du bootstrap ; pnpm via un gestionnaire adapté.
- Dépendances natives Tauri 2 de la plateforme : consulter [les prérequis officiels](https://v2.tauri.app/start/prerequisites/) avant installation. Sous Linux, prévoir la pile WebKitGTK et les outils système spécifiés pour la distribution ; sous Windows, WebView2 et la chaîne de compilation ; sous macOS, les outils Xcode requis.
- Installer les dépendances JS avec le `pnpm-lock.yaml` versionné lorsque le squelette existe. Ne pas figer de numéro de version arbitraire dans ce document.

## Commandes cibles après bootstrap

```bash
pnpm install --frozen-lockfile
pnpm tauri dev
pnpm test
pnpm exec svelte-check --tsconfig ./tsconfig.json
pnpm exec eslint .
pnpm exec prettier . --check
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
pnpm tauri build
```

`pnpm test`, `pnpm tauri dev` et `pnpm tauri build` nécessitent des scripts et dépendances configurés dans le futur `package.json`. La commande svelte-check dépend également de sa configuration effective. Adapter cette section, les workflows CI et `.rules/TESTING_RULES.md` ensemble.

## Ordre de bootstrap suggéré

1. Générer le squelette Tauri 2 + Svelte 5 ; choisir `gnu-mdv` comme binaire cible et vérifier sa disponibilité sur les OS visés.
2. Configurer pnpm, TypeScript strict, Vitest, ESLint, Prettier, rustfmt et clippy ; versionner les lockfiles.
3. Créer le pipeline Markdown indépendant de l'UI et ses fixtures de base ; ouvrir des documents locaux par un contrat Rust borné.
4. Ajouter progressivement plugins, résolution des chemins, protections HTML/URLs, thèmes et navigation ; mesurer lancement et mémoire.
5. Mettre en place une CI Linux pour lint/tests/build, puis matrices Windows/macOS ; n'automatiser les releases qu'après validation des associations et artefacts.

## Débogage et reproductibilité

Pour un problème de rendu, réduire le Markdown à une fixture minimale sans données privées et préciser le résultat attendu. Pour un bug filesystem, inclure OS, type de chemin, liens symboliques et mode d'ouverture. Pour un écart WebView, noter OS et moteur utilisé. Ne pas coller de fichiers privés ou de chemins personnels dans une issue.
