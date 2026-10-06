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
UNC et cibles ambiguës sont refusés. Le décodage URI, les fragments et
l'extension native de racine restent à implémenter.

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
