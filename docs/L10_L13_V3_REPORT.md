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

## Écarts restants

Voir la recette native pour L10–L13. En particulier, ancres locales, thème
système et retours de notes après sanitisation restent à corriger. Les statuts
locaux `done` ont été retirés jusqu'à satisfaction des sorties et des recettes.
