# Rapport L03 — Socle du dépôt

Date : 3 octobre 2026. Base de travail : `main` à `3afc86e`, diff non committé.
Statut : **L03 doing**. Le socle et la preuve Linux locale sont disponibles ;
Windows et macOS ne sont pas qualifiés et aucun workflow CI n'est livré.

## Livrables

- Svelte 5.57.1, TypeScript 6.0.3 et Vite 8.3.2 en mode strict, sans SvelteKit.
- Tauri 2.12.1 / tauri-build 2.7.1, Rust 1.91.1, binaire `gnu-mdv` et
  identifiant technique provisoire `com.levitastech.gnu-mdv`.
- Versions exactes et lockfiles propres au projet ; aucun lockfile ou fragment
  des applications amont.
- Vitest, ESLint, Prettier, svelte-check, rustfmt, Clippy et tests Rust.
- Icône originale au projet générée depuis `src-tauri/icons/source.svg` ; aucune
  marque ni ressource GNU/FSF ou amont.

`package.json` est la source de la version de travail `0.1.0`. Elle est affichée
comme non publiée et un test contrôle sa concordance avec les deux manifestes
Tauri/Rust. Aucun tag, package, publication ou promesse de support n'en découle.

## Frontières de sécurité du bootstrap

La fenêtre n'expose aucune commande personnalisée, aucun plugin fichier/shell,
aucun scope disque et aucune capacité Tauri au frontend. La release charge
uniquement `frontendDist`; le serveur Vite est lié à `127.0.0.1:1420` et ne sert
qu'en développement. La CSP release limite scripts/styles/fonts/images à
`self` ou aux données locales explicitement nécessaires, autorise seulement le
transport IPC interne et refuse objets, frames, base et formulaires.

Le bundling automatique est désactivé. `pnpm desktop:compile` construit le
binaire sans paquet ; `pnpm desktop:package` identifie séparément la future
étape d'installateur, non exécutée ici. Les permissions fichiers et prototypes
de confinement appartiennent à L04 : ce socle ne prétend pas les démontrer.

## Preuves locales

Configuration : Linux Mint 22.3, x86_64, VM KVM, WebKitGTK 2.52.6, GTK 3.24.41,
Node 24.18.0, pnpm 12.8.1, rustc/cargo 1.91.1. Les mesures de performance restent
interdites sur ce profil exploratoire.

| Scénario | Commande | Attendu | Résultat |
| --- | --- | --- | --- |
| Installation reproductible | `pnpm install`, puis lockfile gelé | versions directes exactes et graphe résolu | succès, 298 paquets au total |
| Format | `pnpm format:check` | fichiers applicatifs/configuration conformes, docs/fixtures exclues | succès |
| Lint | `pnpm lint` | ESLint sans erreur | succès |
| Types/Svelte | `pnpm check` | zéro diagnostic | succès, 0 erreur/0 avertissement |
| Tests TS | `pnpm test` | métadonnées et versions synchronisées | succès, 2 fichiers/3 tests après ajout du contrat de version |
| Build frontend | `pnpm build` | bundle release statique | succès, JS 29,16 kB et CSS 1,11 kB (gzip : 11,83/0,61 kB) ; mesure indicative seulement |
| Format Rust | `cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check` | aucun diff | succès |
| Lint Rust | `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings` | aucun avertissement | succès |
| Tests Rust | `cargo test --manifest-path src-tauri/Cargo.toml` | contrat binaire | succès, 1 test |
| Release Linux | `pnpm desktop:compile` | frontend puis ELF release sans bundle | succès ; dernière passe en 2 min 29 s, `gnu-mdv`, 4 650 248 octets |
| Smoke X11 | `timeout 12s src-tauri/target/release/gnu-mdv` avec DISPLAY/DBus de la session | processus reste vivant, aucune erreur applicative | succès fonctionnel après la dernière release, arrêt attendu 124 ; avertissements EGL/VMware sans 3D, pas de capture/inspection visuelle automatisée |

Empreintes après la dernière passe locale :

- `pnpm-lock.yaml` : `8525872719e8ce6e053019319f0752565a36aba452eb571f9084b7b48d3f217a`
- `src-tauri/Cargo.lock` : `ca5ed55d76131b0a5784cf838f26816ddd39c28b6e3cc28be0851944db93ad60`
- binaire Linux : `88d2cf887f7a141f7cc28b02144657f144d3bf9af61cdcf1c2f0a1b4e6ffe350`

## Audits du graphe résolu

`pnpm audit` ne rapporte aucune vulnérabilité connue. L'inventaire production
compte 137 paquets ; l'unique métadonnée `Unknown`, `khroma` 2.1.0, contient en
réalité un fichier de licence MIT complet. Les licences et obligations notables
figurent dans `THIRD_PARTY_NOTICES.md`.

`cargo-audit` 0.22.2, base locale mise à jour de 1290 avis, ne rapporte aucune
vulnérabilité sur 417 crates. Deux avertissements transitifs restent visibles :

- `RUSTSEC-2024-0370`, `proc-macro-error` 1.0.4 non maintenu, via les macros
  GLib/GTK 0.18 de la pile Linux Tauri ;
- `RUSTSEC-2024-0429`, unsoundness de `glib::VariantStrIter` dans GLib 0.18.5,
  via GTK/WebKitGTK. Le bootstrap n'appelle pas cette API directement.

Ces avertissements ne sont ni des vulnérabilités déclarées par l'outil ni des
exceptions ajoutées à la configuration. Ils doivent être réévalués à chaque
mise à jour Tauri/GTK et avant G4 ; l'usage futur de `VariantStrIter` est interdit
sans analyse ciblée ou version corrigée.

## Vérifications officielles récentes

- Le montage Vite statique, `devUrl`, `frontendDist` et la séparation build /
  bundle suivent la documentation Tauri 2 actuelle.
- La CSP est activée explicitement, sans CDN ni contenu distant ; les capacités
  restent vides plutôt que d'adopter `core:default` sans besoin.
- Vite 8 cible explicitement Chrome 111 et Safari 16.4, niveaux documentés par
  son contrat Baseline ; leur transpilation ne remplace pas la recette WebView.

## Non-exécuté et condition de clôture

- Builds Windows/macOS : non exécutés localement ; aucun support n'est annoncé.
- Packaging/installateurs, associations et signatures : non exécutés, prévus en
  P4 ; `bundle.active` reste faux.
- Benchmark et conformité Markdown : non exécutés, hors objet de L03.

L03 peut passer à `done` après revue du diff. L04 et G1 restent `todo` ; un
build minimal ne prouve ni confinement, ni sanitisation, ni absence réseau du
futur moteur.
