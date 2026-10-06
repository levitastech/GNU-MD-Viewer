# Rapport V3 — L10 à L13

Release cible : `0.2.0`, en implémentation et non publiée.
État réévalué le 6 octobre 2026 : V3 en cours de qualification. Les commits
initiaux ne satisfont pas encore toutes les sorties du plan P2.

## L10 — Ressources locales

Les images Markdown locales déclarées par le moteur sont remplacées, après
sanitisation, par une image dont l’URL ne contient qu’un jeton aléatoire du
protocole `gnu-mdv-resource`. Le DOM ne reçoit ni chemin local, ni autorisation
de lecture. Le service Rust existant vérifie session, document, confinement,
type, signature et budgets ; fermeture et remplacement de document révoquent
les jetons via `OpenCoordinator`.

La résolution est annulée logiquement lorsque le rendu devient périmé et un
échec conserve un placeholder explicite. Les images distantes restent bloquées.
Les liens Markdown vers un autre document sont autorisés uniquement depuis la
session active : Rust conserve la racine initiale et son identité, utilise le
parent du document courant comme base et contrôle le handle réellement ouvert
avant lecture sur Linux. Les images de B utilisent la même racine héritée.
Les sélections relatives sont révoquées avec la session source, y compris
lorsqu'elle est révoquée pendant la lecture. Les chemins absolus, schémas,
UNC et cibles ambiguës sont refusés. Le complément du 6 octobre ci-dessous
implémente le décodage URI, les fragments et l'extension native de racine.

## Qualification des chemins simples — 6 octobre 2026

Base : `94a65e4` et diff de correction `documents.rs`, `resources.rs`,
`commands.rs`, contrôleur UI et tests. Rust/Cargo 1.91.1, Node 24.18.0,
pnpm 12.8.1, Linux local. Aucun nouveau contrat de bibliothèque : APIs
standard [File::open](https://doc.rust-lang.org/std/fs/struct.File.html),
métadonnées et [Path::canonicalize](https://doc.rust-lang.org/std/path/struct.Path.html)
reconsultées dans la documentation officielle Rust ; la version retenue reste
1.91.1.

- Avant correction : cinq nouvelles recettes Rust, une réussite et quatre
  échecs (absolu, racine après A → B, révocation, remplacement de racine).
- Après correction : `cargo test --lib`, 27 tests réussis, dont sept recettes
  document relatives et une recette de ressources depuis B. Cela couvre les
  chemins valides, absence/suffixe, sortie de racine, symlink externe,
  substitution d'ancêtre conservant l'inode et révocation avant/pendant lecture.
- `pnpm check`, ESLint et Vitest : verts, 30 tests. Deux nouveaux scénarios UI
  vérifient conservation du document après erreur et sélection tardive après
  fermeture.
- Passe finale : `cargo test` (27 tests, binaire et doctests sans tests),
  `cargo fmt --check`, Clippy tous targets/features avec `-D warnings`,
  Prettier et build frontend réussis. Clippy avait relevé un `if` imbriqué,
  corrigé avant sa dernière exécution. Build desktop release normal et recette
  native V3 non exécutés ici ; qualification à poursuivre après les écarts.
- La recette WebView V3 est préparée dans [V3_NATIVE_RECIPE.md](V3_NATIVE_RECIPE.md),
  avec fixtures A/B et PNG embarqué. Elle n'est pas exécutée à cette étape.
- Les précédentes preuves L04/L09 ne qualifient pas les interactions V3 ;
  aucune clôture V3/P2/G2 n'est déduite des tests seuls.

## Correctifs de rendu L13 — 6 octobre 2026

Versions inchangées : markdown-it 15.0.2, footnote 4.0.0, todo-lists 0.1.8,
github-alerts 1.0.1, DOMPurify 3.4.16. Les règles du renderer footnote sont
adaptées depuis la [source officielle](https://github.com/markdown-it/markdown-it-footnote)
pour émettre des cibles inertes `data-mdv-anchor`, sans `href` ni `id`.
Les tâches produisent des marqueurs accessibles non éditables, pas des inputs.
Les titres évitent aussi les collisions entre suffixes naturels et duplications.

Sur le diff frontend suivant `72924ef` : 35 tests Vitest, Svelte check
(aucune erreur ni avertissement), ESLint et build frontend réussis. Les tests
combinés contrôlent la sanitisation, l'unicité des cibles de notes répétées,
le focus, les ancres Unicode et les refus d'accès aux IDs du chrome applicatif.
Ces tests DOM ne constituent pas encore la recette native L13.

## Recette WebView du lecteur réel — 6 octobre 2026

Base `fb1d024` plus instrumentation dans `App.svelte`,
`v3-webview-recipe.ts`, `lib.rs` et `run_v3_harness.sh`. Linux
6.17.0-35-generic x86_64, X11 `:0`, WebKitGTK 2.52.6 ; Node 24.18.0,
pnpm 12.8.1 et Rust 1.91.1. Commande :

```sh
DISPLAY=:0 XAUTHORITY=/home/oem/.Xauthority bash tests/integration/run_v3_harness.sh
```

Build desktop debug instrumenté réussi, suivi d'une exécution de 25 secondes
(statut 124 attendu). Les 16 marqueurs sont réussis : image locale, HTML
hostile inerte, tâches, ancre, note/retour, sommaire masquable/focus/état actif,
clair/sombre, zoom/reset, échec conservant le document, A → B → A et rejet
natif d'un jeton révoqué. Hashes de A, B et PNG inchangés ; aucune connexion
AF_INET/AF_INET6 observée sous `strace -f -e trace=connect`.
Logs locaux : `/tmp/gnu-mdv-v3.4HYwwr` (non versionnés, durée de conservation
non garantie). Parcours instrumenté 2029 ms, RSS maximal observé 163516 KiB :
baseline exploratoire avec strace et binaire debug, pas un budget de lancement
ni une mesure contractuelle L24. Avertissements EGL/VMware sans crash.

Le premier passage a échoué sur la réutilisation exacte de l'URL de l'image,
que WebKit pouvait servir depuis son cache décodé. La seconde recette force
un nouvel accès au registre via un alias d'URL uniquement compilé avec la
feature de test : le registre refuse bien le jeton révoqué. Cela ne prouve
pas l'effacement rétroactif des octets déjà remis à la WebView. Voir les
limites de [la recette](V3_NATIVE_RECIPE.md).

Contrôles frontend finaux : 35 tests, Svelte sans erreur/avertissement,
ESLint, Prettier et rustfmt réussis. Cargo : 27 tests réussis ; Clippy tous
targets/features avec `-D warnings` réussi. Reconstruction desktop debug
normale sans instrumentation réussie, bundle frontend sans chunk de recette
(196,86 kB brut / 78,12 kB gzip pour le JS principal).
Smoke X11 du binaire normal : vivant 12 secondes, statut 124 attendu du
timeout, avertissements EGL/VMware sans crash ; pas de recette visuelle.
Recette release/visuelle complète,
changements réels du thème OS, petite fenêtre/RTL/DPI et chemins URI/racine
étendue non exécutés ici. Les cibles Windows/macOS restent différées SG05.

## Écarts restants

Les commits correctifs L11/L12 branchent les ancres sur l'interface réelle,
focalisent la cible et suivent la section visible via un observer nettoyé au
changement de document. Le sommaire se replie. Le mode système suit
`matchMedia` et libère son listener ; le choix explicite clair/sombre prime sur
le système. Zoom 80–200 %, pas de 10 points, bouton de retour à 100 %.
Les règles CSS sombres héritées ne s'appliquent plus en mode clair explicite.
Les [effets Svelte](https://svelte.dev/docs/svelte/$effect) et
[matchMedia](https://developer.mozilla.org/en-US/docs/Web/API/Window/matchMedia)
ont été revérifiés avant ces adaptations, sans changement de dépendances.

Voir la recette native pour L10–L13. Les interactions des ancres, des thèmes
et des notes restent à qualifier dans la WebView. Les statuts
locaux `done` ont été retirés jusqu'à satisfaction des sorties et des recettes.

## Complément L10 — URI, fragments et racine explicite

Base `179c341` plus diff L10 : `local_target.rs` partagé par documents/images,
commande `select_root_extension`, contrat/adaptateur document, contrôleur,
composants et fixtures de régression. Aucune dépendance ajoutée. APIs
`blocking_pick_folder`, `set_title`, `into_path` vérifiées dans la source et
les commentaires officiels installés de tauri-plugin-dialog 2.8.1 ;
`tick`/cycle de vie revérifiés dans la documentation Svelte 5.57.1.

La table de comportement durable est dans [SECURITY](SECURITY.md) : séparation
avant décodage, UTF-8 strict, `%23`/`%25` littéraux et décodage unique ; queries
et fragments d'image refusés. Le dossier parent/projet est choisi uniquement
en natif et validé côté Rust, sans disque/home global. La réouverture utilise
une nouvelle session et recrée le DOM documentaire même à HTML identique.
Une première recette a révélé la conservation des images anciennes quand
seul le jeton de session changeait ; le composant est désormais indexé par
session. Une erreur candidate ou une annulation ne remonte pas le composant.

Tests ajoutés : encodages invalides et doubles, noms Unicode/espace/#/%,
cache d'image canonique, images homonymes avec deux bases, refus et extension
de racine, révocation de sélection étendue, fragment après navigation,
annulation et réponse tardive du sélecteur de racine. Les fixtures encodées
réutilisent sans transformation le PNG du projet (même provenance MIT).

Qualification du complément : `pnpm check` (aucune erreur/avertissement),
lint, format, 39 tests Vitest, `cargo fmt --check`, Clippy tous targets/features
avec `-D warnings` et 32 tests Cargo réussis. Linux/X11/WebKitGTK 2.52.6,
Node 24.18.0, pnpm 12.8.1 et Rust 1.91.1 inchangés.
`bash tests/integration/run_v3_harness.sh` : 21 marqueurs réussis depuis
`/tmp`, dont cinq nouveaux (nom/image encodés, fragment, refus parent,
extension de racine et ouverture parent). Hashes des cinq fixtures inchangés,
aucune connexion IP observée. Logs `/tmp/gnu-mdv-v3.qJR7fX` ; parcours
instrumenté 1860 ms et RSS maximal 174264 KiB, toujours exploratoires.
Le dialogue de dossier réel n'a pas été piloté manuellement : le hook de
fixture, réservé à `l09-harness`, remplace son résultat mais exécute la même
validation Rust et la même réouverture. Annulation/réponse tardive testées
avec doubles du sélecteur. Windows/macOS et recette release restent différés.
L10 est qualifié sur cette matrice automatisée Linux ; cela ne clôt pas V3/G2.
Après le harness, `pnpm tauri build --debug --no-bundle` normal réussi,
sans chunk de recette (JS principal 197,83 kB brut / 78,43 kB gzip).
Smoke X11 normal 12 secondes : timeout 124 attendu, avertissements EGL/VMware
sans crash. Aucun build release, paquet, push ou publication dans cette étape.

## Complément L11 — Titres, navigation et section active

Base `265a81a` plus diff L11 : moteur, `document-navigation`, nouveau service
`active-section`, `DocumentView`, remise à zéro du diagnostic de lien dans App,
tests et corpus `v3/headings.md` / `v3/no-headings.md`, extension du harness.
Aucune dépendance ni API Rust modifiée. Svelte 5.57.1 conservé ; cycle
[$effect](https://svelte.dev/docs/svelte/$effect),
[ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)
et [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
vérifiés dans les documentations officielles avant adaptation.

L'ancien suivi par intersection ne déterminait pas la section traversée entre
deux titres éloignés ou après un saut rapide. Le suivi utilise désormais des
positions mises en cache aux changements de layout et une recherche binaire
au scroll, sans mesure de tous les titres à chaque événement. Il nettoie les
abonnements et callbacks différés, ne change ni focus ni sélection et se
réinitialise pour un document sans titre.

Le corpus révèle aussi une collision entre un titre `mdv-note-1` et la note
homonyme : la cible exacte de note prime désormais sur l'alias court de titre.
Les ancres sont normalisées NFC après décodage ; les slugs utilisent une
minuscule indépendante de la locale et les titres Setext multilignes
conservent leurs espaces. Les variantes supportées sont documentées dans
[ARCHITECTURE](ARCHITECTURE.md), sans conformité exhaustive GitHub annoncée.

`pnpm test` : 45 tests réussis, dont six nouveaux. `pnpm check` : aucune
erreur/avertissement ; lint et format verts. Les tests couvrent H1–H6, Unicode,
RTL, doublons/suffixes, emoji, code/liens inline, notes homonymes, ancre absente,
défilement, invalidation de layout et callbacks tardifs.

`bash tests/integration/run_v3_harness.sh` réussi sur Linux/X11/WebKitGTK
2.52.6, avec Node 24.18.0, pnpm 12.8.1 et Rust 1.91.1. Les 29 marqueurs
réussissent depuis `/tmp` ; les sept hashes source sont inchangés et aucune
connexion IP n'est observée sous strace. Les huit ajouts vérifient index TOC,
événement clavier DOM, notes homonymes, ancre inconnue, focus TOC, conservation
de sélection/focus au scroll, sauts aller/retour et document sans titre.
Logs : `/tmp/gnu-mdv-v3.pvp7WH`, parcours 3874 ms, RSS maximal 167164 KiB
(mesures exploratoires, pas benchmarks L24). Aucun clavier physique, lecteur
d'écran ou contrôle visuel exhaustif n'est attesté. Windows/macOS et recette
release restent différés ; L11 est qualifié sur cette matrice automatisée
Linux, V3/G2 reste ouvert pour L12/L13.
`cargo fmt --check`, 32 tests Rust et Clippy tous targets/features avec
`-D warnings` sont réussis. Le binaire desktop debug normal a été reconstruit
après le harness, sans chunk de recette (JS principal 198,58 kB brut /
78,73 kB gzip). Smoke X11 12 secondes : statut 124 attendu du timeout,
avertissements EGL/VMware de la VM sans crash.
