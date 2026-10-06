# Développement

## État du socle

Le projet Tauri 2 + Svelte 5 + TypeScript strict + Vite + pnpm lit les
documents Markdown par dialogue natif. P2/V2 est clos ; V3 reste en
qualification. `package.json` est la source de version ; Vitest contrôle la
concordance de `src-tauri/tauri.conf.json` et `src-tauri/Cargo.toml`.

## Prérequis

Le cadrage L00 clos est décrit dans [STACK_MATRIX](STACK_MATRIX.md). Les
versions directes et transitives sont maintenant verrouillées ; le résultat
local et les limites CI figurent dans [L03_BOOTSTRAP_REPORT](L03_BOOTSTRAP_REPORT.md).
Le corpus QA reste générable avec Python, voir
[benchmarks](../benchmarks/README.md).

- Sur la VM Linux actuelle : Node 24.18.0/npm 11.16.0 sous NVM, pnpm 12.8.1 via Corepack, Rust/Cargo 1.91.1 et rustfmt/Clippy dans `/usr/lib/rust-1.91/bin`. Ajouter ces répertoires au `PATH` de la session ; les commandes génériques Rust 1.75 de la distribution ne conviennent pas.
- Dépendances natives Tauri 2 de la plateforme : consulter [les prérequis officiels](https://v2.tauri.app/start/prerequisites/) avant installation. Sous Linux, prévoir la pile WebKitGTK et les outils système spécifiés pour la distribution ; sous Windows, WebView2 et la chaîne de compilation ; sous macOS, les outils Xcode requis.
- Installer les dépendances JS avec le `pnpm-lock.yaml` versionné lorsque le squelette existe. Ne pas figer de numéro de version arbitraire dans ce document.

## Installation et contrôles

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm check
pnpm test
pnpm audit:js
pnpm build
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
pnpm desktop:compile
```

`cargo audit --file src-tauri/Cargo.lock` demande `cargo-audit` 0.22.2, outil
d'audit local/CI non incorporé à l'application. Les deux avertissements
RustSec connus sont analysés dans le rapport L03 ; ils ne sont pas masqués.

## Développement, compilation et packaging

```bash
pnpm desktop:dev
pnpm desktop:compile
pnpm desktop:package
```

- `desktop:dev` lance Vite sur `127.0.0.1:1420`, compile Rust en profil de
  développement et ouvre la fenêtre. Ce serveur local n'existe pas en release.
- `desktop:compile` produit le frontend puis le binaire release sans installateur.
- `desktop:package` est la commande de bundling séparée ; elle n'est pas une
  preuve de publication et n'a pas été exécutée en L03. Les formats restent P4.

La configuration release désactive le bundling automatique, refuse les sources
réseau dans sa CSP et n'accorde à `main` que les commandes document, lien et
ressource explicitement listées. Rust revalide le label, les jetons, la session
et les handles ; aucun accès fichier générique n'est exposé.

## Harness natif L04

Dans une session graphique Linux avec les prérequis du projet :

```bash
tests/integration/run_l04_harness.sh
```

Le script crée uniquement des fixtures temporaires, compile avec la feature
`l04-harness`, attend le marqueur des six contrôles puis vérifie via `strace`
qu'aucune connexion IP n'a été tentée. Le timeout 124 est attendu car la fenêtre
reste ouverte. `VITE_L04_HARNESS` n'est pas défini dans un build normal : le
chunk, la fixture et l'initialisation de session de test n'y sont pas embarqués.

## Harness natif L09

Dans une session graphique Linux avec `strace` et `/usr/bin/time` :

```bash
./tests/integration/run_l09_harness.sh
```

Le script compile la feature `l09-harness`, ouvre une fixture réelle via le
même service document, vérifie table, code échappé, HTML hostile et lien refusé,
relève temps de rendu et mémoire maximale, puis observe l'absence de connexion
IP. Le chunk et l'autorisation de fixture n'existent pas dans un build normal.

## Suite du chantier

La [recette V3](V3_NATIVE_RECIPE.md) pilote l'interface réelle via
`bash tests/integration/run_v3_harness.sh` dans une session X11 active. Elle
utilise un binaire debug instrumenté ; recompiler sans feature ni variable
de harness après usage. Le script conserve ses logs temporaires pour examen.

Les chemins URI, fragments et extension explicite de racine L10 sont
implémentés ; poursuivre la qualification et la matrice de recettes UI
restantes L11–L13 avant G2. Voir le
[rapport V3](L10_L13_V3_REPORT.md) pour les preuves et limites actuelles.

## Débogage et reproductibilité

Pour un problème de rendu, réduire le Markdown à une fixture minimale sans données privées et préciser le résultat attendu. Pour un bug filesystem, inclure OS, type de chemin, liens symboliques et mode d'ouverture. Pour un écart WebView, noter OS et moteur utilisé. Ne pas coller de fichiers privés ou de chemins personnels dans une issue.
