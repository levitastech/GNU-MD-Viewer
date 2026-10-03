# Installation locale exécutée et vérifiée

Préparation puis exécution par l'utilisateur le 3 octobre 2026. Les composants
du stack ont été installés après confirmation explicite. Cette installation
termine l'environnement L00 ; elle ne lance pas L03 ni une application amont.

Poste déclaré par l'utilisateur : VM Mint Zena 8 Go / 3 cœurs / SSD 60 Go,
sur hôte Ryzen 5 7530 6 cœurs / 16 Go / SSD 500 Go. Installation réalisée
dans la VM de travail. Les mesures produit sur cette VM restent exploratoires.

## Outils utilisateur

Node/npm existants conservés ; pnpm activé par Corepack avec le Node NVM.
Rust installé via les paquets apt versionnés :

| Composant | Version / portée |
| --- | --- |
| Node / npm | 24.18.0 / 11.16.0 déjà installés sous NVM, versions vérifiées ; aucune réinstallation |
| pnpm | 12.8.1, binaire Linux x64 téléchargé par Corepack |
| Rust via apt | 1.91.1, Cargo + rustfmt + Clippy ; paquets versionnés distro installés |

Node 24.18.0 existe déjà sous NVM et répond à son chemin absolu ; la session
ne l'avait pas dans le PATH. Node 24.18.0 satisfait les engines directs retenus.
Les noms apt génériques proposent encore Rust 1.75.0, insuffisant ; les paquets
`rustc-1.91`, `cargo-1.91`, `rustfmt-1.91` et `rust-1.91-clippy` proposent
`1.91.1+dfsg~24.04-0ubuntu0.24.04.3` dans noble-updates/universe.
Rust 1.91.1 satisfait le minimum 1.90 des crates Tauri retenues ; compatibilité
du graphe complet à vérifier en L03. Aucun rustup requis pour ce choix.
Les exécutables sont `/usr/bin/rustc-1.91`, `/usr/bin/cargo-1.91` et
`/usr/lib/rust-1.91/bin/{rustfmt,cargo-fmt,clippy-driver,cargo-clippy}`.
Les sélectionner explicitement pour les commandes du projet, sans supposer
que les noms génériques changent de version. Aucun rustup installé.

Les dépendances frontend/Tauri ne sont installées dans le projet qu'en L03
après création des manifestes et lockfiles ; cela reste une étape distincte.
Tauri ne requiert pas de paquet apt : CLI locale `@tauri-apps/cli` 2.12.1,
API npm 2.12.1, crates `tauri` 2.12.1 et `tauri-build` 2.7.1 via Cargo.
Ne pas installer de CLI Tauri globale en parallèle.

## Dépendances natives Linux

build-essential, curl, wget et file déjà présents. Paquets directs proposés :

```bash
sudo apt-get update
sudo apt-get install --no-install-recommends rustc-1.91 cargo-1.91 rustfmt-1.91 rust-1.91-clippy libwebkit2gtk-4.1-dev libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Simulation locale effectuée avant installation avec
`apt-get --simulate --no-install-recommends` :
108 nouveaux paquets, 10 mises à jour, aucune suppression (listes apt locales,
sans actualisation). Les mises à jour concernent notamment OpenSSL/Mesa.
La transaction apt du 3 octobre 2026 est terminée sans erreur et apparaît dans
`/var/log/apt/history.log`. Versions directes installées : WebKitGTK 2.52.6,
GTK 3.24.41, libxdo 3.20160805, libssl-dev 3.0.13-0ubuntu3.16,
appindicator 0.5.93 et librsvg 2.58.0.

Contrôles réussis : Node 24.18.0, npm 11.16.0, pnpm 12.8.1, rustc/cargo
1.91.1, rustfmt 1.8.0, Clippy 0.1.91, WebKitGTK 2.52.6 et GTK 3.24.41.
Aucune compilation ni recette desktop n'est déduite de ces vérifications.

## Sources officielles consultées

- [Tauri, prérequis Debian/Ubuntu](https://v2.tauri.app/start/prerequisites/).
- [Node 24.18.0](https://nodejs.org/en/blog/release/v24.18.0).
- [pnpm, installation](https://pnpm.io/installation).
- [Tauri, CLI locale npm](https://v2.tauri.app/reference/cli/).
