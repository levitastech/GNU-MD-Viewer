# Matrice de stack et cibles — L00

Audit initial du 3 octobre 2026, puis matérialisation L03 sur base Git
`3afc86e`. Les versions directes ci-dessous sont inscrites sans plage flottante
dans les manifestes et résolues dans les deux lockfiles. Le frontend, Clippy,
les tests Rust et le binaire release Linux ont compilé ensemble. Aucun workflow
CI n'est livré à ce stade ; Windows et macOS restent à qualifier nativement.

## Versions directes retenues

Métadonnées consultées : `https://registry.npmjs.org/<paquet>/<version>`
(version, licence déclarée, engines, peers, dist.unpackedSize), crates.io pour
Rust/Tauri, index de distribution Node et canal stable Rust. Les poids indiquent
les **octets décompressés du paquet npm**, ni le bundle distribué ni ses transitives.

| Composant | Version candidate | Licence déclarée / option | Poids npm (octets) |
| --- | --- | --- | ---: |
| Node LTS / npm existants | 24.18.0 / 11.16.0 | licences du runtime à inventorier en L03 | — |
| pnpm | 12.8.1 | MIT, outil de build | 4090106 |
| Rust distro versionné | 1.91.1 (apt noble-updates) | MIT/Apache-2.0, outil de build | — |
| tauri (crate) | 2.12.1 | MIT ou Apache-2.0 | — |
| tauri-build (crate) | 2.7.1 | MIT ou Apache-2.0 | — |
| @tauri-apps/api | 2.12.1 | MIT ou Apache-2.0 | 889166 |
| @tauri-apps/cli | 2.12.1 | MIT ou Apache-2.0, outil de build | 429371 |
| Svelte | 5.57.1 | MIT | 2941384 |
| TypeScript | 6.0.3 | Apache-2.0, outil de build | non relevé |
| Vite | 8.3.2 | MIT, outil de build | 2368132 |
| @sveltejs/vite-plugin-svelte | 7.3.1 | MIT, outil de build | 148026 |
| markdown-it | 15.0.2 | MIT | 1968876 |
| DOMPurify | 3.4.16 | choisir Apache-2.0 parmi MPL-2.0 / Apache-2.0 | 1587618 |
| highlight.js | 11.12.0 | BSD-3-Clause | 5503982 |
| Mermaid | 12.1.0 | MIT | 122268705 |
| KaTeX | 0.19.0 | MIT ; polices/notices à inventorier | 4043696 |
| Vitest | 5.0.3 | MIT, outil de test | 2759444 |
| svelte-check | 4.7.6 | MIT, outil de build | 5485151 |
| ESLint | 10.12.0 | MIT, outil de build | 2947964 |
| Prettier | 3.9.9 | MIT, outil de build | 9958979 |
| eslint-plugin-svelte | 3.23.0 | MIT, outil de build | archive contrôlée |
| typescript-eslint | 8.71.0 | MIT, outil de build | archive contrôlée |
| @eslint/js | 10.0.1 | MIT, outil de build | archive contrôlée |
| prettier-plugin-svelte | 4.1.1 | MIT, outil de build | archive contrôlée |
| @types/node | 24.19.1 | MIT, outil de build | archive contrôlée |

Les versions publiées récemment ne constituent pas une preuve de sécurité.
L03 résout 298 paquets npm au total, dont 137 paquets de production inventoriés,
et 417 crates Cargo. Les deux graphes ne contiennent aucune licence absente ;
`khroma` omet le champ SPDX dans son manifeste mais fournit le texte MIT intégral.

Suite d'audit : [L00_AUDIT](L00_AUDIT.md), archives directes et notices
inventoriées, contrôles d'intégrité réussis. Les outils supplémentaires retenus
acceptent Svelte 5, TypeScript 6 et ESLint 10 selon leurs peers. markdown-it
15 fournit ses types ; @types/markdown-it 14.2.0 est écarté. Le graphe réel
et les binaires plateforme ont été résolus dans `pnpm-lock.yaml`. Le rapport L03
trace les audits et réserves du graphe effectif.

## Compatibilité constatée et refus

Node 24.18.0 satisfait les contraintes déclarées de Vite, du plugin Svelte,
Vitest, ESLint et Mermaid. Le plugin Svelte 7.3.1 accepte Vite 8 et Svelte
≥ 5.46.4. Vitest 5.0.3 accepte Vite 8. Les crates Tauri proposées déclarent
Rust ≥ 1.90 ; les outils apt versionnés 1.91.1 satisfont ce minimum direct.

TypeScript 7.0.2, pourtant `latest`, est écarté : svelte-check 4.7.6 déclare
seulement `^5.0.0 || ^6.0.0`. TypeScript 6.0.3 est une candidate compatible
avec cette plage et passe le contrôle réel. Tauri 3 alpha est écarté
conformément au contrat Tauri 2. Aucun lockfile amont n'est adopté.

Le paquet Mermaid complet est lourd : import différé, familles ciblées et poids
des chunks à mesurer en L04/L16. Ne pas substituer automatiquement le build
Tiny : ses fonctionnalités diffèrent. markdown-it-footnote 4.0.0 (MIT) est à
évaluer en L13 ; markdown-it-task-lists 2.1.1 (ISC, publication 2018) n'est pas
adopté sans revue de maintenance. Alertes et tâches peuvent être des règles
internes caractérisées par fixtures.

## Cibles de qualification

Ces profils sont des **cibles proposées**, aucun OS n'est annoncé supporté.
Les minima Tauri ne suffisent pas à garantir les bibliothèques de rendu.

| Profil | OS / architecture | WebView visée | Moyens et statut |
| --- | --- | --- | --- |
| Linux initial | Ubuntu 24.04 LTS / x86_64 ; Mint 22.3 comme machine de travail | WebKitGTK API 4.1, moteur 2.52.6 pour première recette | runtime et headers présents ; lancement non exécuté |
| Windows | Windows 11 / x86_64 | WebView2 Evergreen à jour ; version exacte relevée à chaque recette | aucune machine/runner vérifié ; qualification différée |
| macOS | macOS 14 minimum visé / arm64 | WKWebView du système ; build OS exact relevé à chaque recette | aucune machine ou recette vérifiée ; qualification différée |

Les versions minimales effectivement supportées seront établies par recettes
L04/L25. Vite compile explicitement pour Chrome 111 et Safari 16.4 ; cette
transpilation n'est pas une recette WebView. Le profil Linux est la première
matrice active de travail ; le
report Windows/macOS applique SG05, ne vaut ni abandon ni réussite de build.
AppImage/DEB/RPM, NSIS/MSI si pertinent, APP/DMG restent à qualifier en P4.

## Environnement inspecté

Linux Mint 22.3, base Ubuntu noble, x86_64, VM KVM, AMD Ryzen 5 7530U exposant
6 vCPU / 1 thread par cœur, RAM 6192308224 octets, swap 2147479552 octets.
Python 3.12.3 est disponible pour le corpus QA. Node 24.18.0, npm 11.16.0 et
pnpm 12.8.1 répondent avec le chemin NVM activé. Les paquets versionnés donnent
rustc/cargo 1.91.1, rustfmt 1.8.0 et Clippy 0.1.91. `pkg-config` trouve
WebKitGTK 2.52.6 et GTK 3.24.41.
Cette machine n'est pas la référence performance 16 Go / 4 cœurs / 8 threads.
Le build release Linux x86_64 et un lancement de 12 secondes dans la session
X11 ont été effectués en L03 ; aucune mesure de performance n'en est déduite.

Inspection complémentaire : Node 24.18.0 est installé sous NVM et répond à
`/home/oem/.nvm/versions/node/v24.18.0/bin/node`. Il était absent du PATH,
pas absent de la machine. npm 11.16.0 également vérifié. Node/npm conservés,
pnpm et Rust/Cargo/rustfmt/Clippy ont ensuite été installés et vérifiés dans
[INSTALLATION_PLAN](INSTALLATION_PLAN.md). Aucun rustup ni CLI Tauri globale.

## Résolution et audit L03

- `pnpm audit` ne retourne aucune vulnérabilité connue sur le lockfile.
- `cargo-audit` 0.22.2 charge 1290 avis et ne retourne aucune vulnérabilité sur
  417 crates. Il signale `proc-macro-error` non maintenu et l'avis d'unsoundness
  `RUSTSEC-2024-0429` sur `glib` 0.18.5, transitives GTK imposées par Tauri Linux.
  Elles restent visibles et suivies, sans exception silencieuse.
- Les licences effectives et les éléments à reproduire au packaging figurent
  dans `THIRD_PARTY_NOTICES.md` et le rapport L03. Aucun paquet n'est publié.
- Confirmer le titulaire réel avant publication ; attribution existante conservée.

## Sources officielles consultées le 3 octobre 2026

- [Node : index des releases](https://nodejs.org/dist/index.json) ; [Rust stable](https://static.rust-lang.org/dist/channel-rust-stable.toml).
- [Tauri : prérequis](https://v2.tauri.app/start/prerequisites/) et [crate 2.12.1](https://github.com/tauri-apps/tauri/blob/tauri-v2.12.1/crates/tauri/Cargo.toml).
- [Vite : guide](https://vite.dev/guide/) ; [Svelte : insertion HTML](https://svelte.dev/docs/svelte/@html).
- [DOMPurify : README/licences](https://github.com/cure53/DOMPurify) ; [Mermaid : usage](https://mermaid.js.org/config/usage) ; [KaTeX : options](https://katex.org/docs/options.html).
- Métadonnées [svelte-check 4.7.6](https://registry.npmjs.org/svelte-check/4.7.6), [TypeScript 6.0.3](https://registry.npmjs.org/typescript/6.0.3), [plugin Svelte 7.3.1](https://registry.npmjs.org/@sveltejs/vite-plugin-svelte/7.3.1).
