# Rapport L04 — Contrats et prototypes de risque

Date : 4 octobre 2026. Branche : `dev`. Base : `c81a1b7` ; preuves exécutées
sur le diff de travail L04 non committé. Statut : **L04 done, G1 done** pour la
matrice Linux active. Windows et macOS restent explicitement non qualifiés.

## Livrables intégrés

- Contrats TS purs : snapshots, rendu, titres, ressources, services, erreurs
  stables, générations et limites ; règle ESLint interdisant Tauri/Svelte aux
  contrats et au futur moteur Markdown.
- Automate d'ouverture testé : dernière intention, activation après succès,
  conservation de l'actif sur échec, libération des candidats tardifs et
  révocation après remplacement/fermeture.
- Profils DOMPurify distincts, wrapper KaTeX borné, wrapper Mermaid strict à
  familles explicites, point d'insertion `SafeHtml` et scheduler borné.
- Registre Rust de ressources à handles/jetons opaques, cache borné, détection
  PNG/JPEG/GIF/WebP avant décodage, contrôle Linux du fichier effectivement
  ouvert et révocation par session.
- ACL Tauri explicite limitée à `main`, commandes revalidant le label et
  protocole `gnu-mdv-resource` utilisable seulement comme source d'image CSP.
- Harness natif activé uniquement par feature/env, avec contrôle d'absence de
  connexion IP ; il n'est pas présent dans le bundle frontend normal.

## Limites calibrées

| Classe | Limite préventive | Fallback |
| --- | ---: | --- |
| Document | 20 000 000 octets | refus avant parse, contrat V1 inchangé |
| Image encodée | 10 000 000 octets | placeholder ressource invalide/trop grande |
| Image dimensions | 16 384 px par axe et 64 000 000 octets RGBA estimés (16 Mpx) | refus avant décodage |
| Cache images/session | 32 ressources, 64 000 000 octets | refus de nouvelle ressource |
| Bloc code | 1 000 000 octets UTF-8, 50 000 lignes | source échappée sans coloration |
| KaTeX | 16 384 caractères, `maxExpand=1000`, `maxSize=20em` | source échappée + diagnostic |
| Mermaid | 65 536 caractères, 2 000 lignes, 500 arêtes probables | source échappée + diagnostic |
| Enrichissements | 2 actifs, 32 en file | refus local ; annulation des travaux en file |

Les comptes Mermaid sont un garde précoce, pas une preuve de coût exact. Les
familles autorisées restent flowchart, sequence, class, state, ER, gantt et pie.
Les campagnes performance L24 pourront resserrer les valeurs sans les élargir
silencieusement. Un traitement synchrone déjà lancé n'est jamais présenté comme
interrompu par un faux timeout.

## Résultats ciblés obtenus

Configuration : Linux Mint 22.3 x86_64 en VM, X11/XFCE, WebKitGTK 2.52.6,
GTK 3.24.41, Node 24.18.0, pnpm 12.8.1, rustc/cargo 1.91.1. Cette machine est
exploratoire et ne fournit aucune mesure de performance de référence.

| Scénario | Commande/recette | Attendu | Résultat |
| --- | --- | --- | --- |
| Contrats/rendu/session | `pnpm test` | bornes +1, sanitisation, KaTeX, concurrence et scheduler | succès, 6 fichiers / 16 tests |
| Ressources Rust | `cargo test --manifest-path src-tauri/Cargo.toml --all-features` | MIME/dimensions, confinement, substitution, remplacement de racine/session, révocation, protocole | succès, 12 tests |
| Qualité complète | `pnpm format:check`, `pnpm lint`, `pnpm check`, Clippy `--all-targets --all-features -D warnings`, `cargo fmt --check` | zéro diagnostic/avertissement | succès |
| WebView avec `freezePrototype=true` | harness release | six contrôles verts | échec ciblé Mermaid : `Attempted to assign to readonly property` ; autres contrôles ensuite isolés |
| WebView, configuration retenue | `tests/integration/run_l04_harness.sh`, release/X11 | HTML, KaTeX/style, Mermaid/IDs, image, refus hors racine, révocation | succès, marqueur final exact |
| Réseau | `strace -f -e trace=connect` autour du harness | aucune connexion AF_INET/AF_INET6 | succès, aucune connexion IP observée |
| Build normal | `pnpm build`, recherche des marqueurs puis `pnpm desktop:compile` | harnais absent, release Linux compilée | succès ; 114 modules, bundle JS principal 33,47 kB, aucun marqueur L04 |
| Smoke normal | `timeout 12s src-tauri/target/release/gnu-mdv` sous X11 | processus vivant jusqu'au timeout | succès, statut attendu 124 |

Les avertissements EGL/VMware de la VM sans accélération 3D sont identiques au
smoke L03 et ne valent pas échec applicatif. Le harness doit rester vivant
jusqu'au timeout attendu 124 ; son marqueur exact de réussite est
`L04_WEBVIEW_REPORT:...html-ok...revoked-ok`.

`pnpm audit` ne trouve aucune vulnérabilité connue. `cargo-audit` n'est pas
disponible dans la session finale ; la dernière analyse L03 reste donc la preuve
RustSec courante et ses deux avertissements transitifs GLib/GTK demeurent
visibles. Aucun benchmark n'est déduit des tailles de bundle ci-dessus.

## Décision G1

La checklist P1 est satisfaite sur la matrice Linux active : L00–L04 sont clos,
versions/licences/corpus explicites, limites calibrées, build et smoke release
rejoués, confinement/révocation/IPC/CSP/transitions de session couverts, et
aucune inconnue critique n'est transférée implicitement à P2. Conformément à
SG05, le report Windows/macOS est un non-test explicite et non un succès. G1
autorise L05 ; il ne qualifie ni un lecteur utilisable, ni un paquet, ni une
plateforme de publication.

## Portabilité et non-exécuté

- Windows et macOS : builds/recettes non exécutés, ressources refusées par le
  prototype hors Linux ; aucune qualification de plateforme.
- Associations installées, single-instance et arguments de paquet : L19. La
  route macOS `RunEvent::Opened` est identifiée dans ADR 0004, pas exécutée.
- Watcher, dialogue fichier, moteur Markdown complet et navigation : lots P2.
- Benchmarks et mémoire : non exécutés sur cette VM exploratoire.

## Revalidation officielle

La décision suit les références officielles consultées le 4 octobre 2026 :
[permissions et runtime authority Tauri](https://v2.tauri.app/security/permissions/),
[configuration/freezePrototype](https://v2.tauri.app/reference/config/),
[protocole personnalisé Tauri 2.12.1](https://docs.rs/tauri/2.12.1/tauri/struct.Builder.html),
[DOMPurify](https://github.com/cure53/DOMPurify),
[Mermaid strict/config](https://mermaid.js.org/config/schema-docs/config) et
[options/sécurité KaTeX](https://katex.org/docs/options.html).
