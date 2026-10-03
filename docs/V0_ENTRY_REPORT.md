# Rapport d'entrée P1 / V0

Date : 2026-10-03. Base Git `e1201df`, diff de travail non committé.
Responsable des fichiers V0 : agent Codex dans cette session, exécution séquentielle.
AGENTS.md/CLAUDE.md étaient modifiés à l'entrée ; ces modifications sont préservées.
Pas de stage, commit, push ou bootstrap applicatif. Suivi opérationnel local ignoré.

## Livrables préparés

- L00 : [matrice candidate](STACK_MATRIX.md), [provenance](UPSTREAM_REUSE.md),
  [ADR stack](adr/0002-stack-et-provenance.md), texte MIT intégral et notices.
- L02 : [policies/menaces](SECURITY.md), [ADR ressources](adr/0003-lecture-et-ressources.md),
  menaces reliées à des scénarios et plafonds attribués à L04.
- L01 : [index de fixtures](../tests/fixtures/README.md),
  [générateur et protocole](../benchmarks/README.md), [critères](ACCEPTANCE.md).

La vague est **initiée, non close**. L00 est clos : sélection directe,
provenance, archives/avis et environnement de build vérifiés ; les transitives
réelles appartiennent au bootstrap L03. L01 : corpus/protocole prêts,
machine de référence non identifiée. L02 : politiques initiales écrites,
revue de cohérence et préparation des fixtures de bornes L04 encore ouvertes
lors du premier passage ; statut actualisé dans la continuation ci-dessous.
L03/L04 et G1 non commencés/non démontrés.

## Configuration initiale constatée

Mint 22.3 / Ubuntu noble, x86_64 KVM, Ryzen 5 7530U exposé comme 6 vCPU,
RAM 6192308224 octets, Python 3.12.3. Rust 1.75.0 local, Node/pnpm absents.
Runtime WebKitGTK 2.52.6-0ubuntu0.24.04.1 présent, headers pkg-config absents.
Pas de machine Windows/macOS ou de runner vérifié. Ce poste ne satisfait pas
la référence performance validée ; aucune mesure produit n'en est déduite.

## Recettes et preuves

| Lot / scénario | Commande / contrôle | Attendu | Résultat |
| --- | --- | --- | --- |
| L00 / structure | git status, rg --files --hidden, inspection règles/docs | identifier socle et travaux concurrents | documentaire, HEAD e1201df ; AGENTS/CLAUDE modifiés à l'entrée |
| L00 / stack | métadonnées npm exactes, index Node/Rust, crates.io, docs officielles | candidats stables et contraintes cohérentes | TS 7 écarté (peer svelte-check), TS 6.0.3 proposé ; Tauri 2 retenu |
| L00 / licence | trois LICENSE aux commits figés + texte MIT de référence | provenance sans copie implicite | trois sources MIT relues ; exclusion PRO tracée ; attribution locale conservée non confirmée |
| L01 / corpus | générateur deux fois dans des dossiers neufs | hashes, tailles et encodages reproductibles | 21 fichiers et même manifeste SHA-256, contrôle ci-dessous |
| L01 / protection sortie | relancer générateur dans le premier dossier | refus sans écrasement | FileExistsError attendu ; intégrité recontrôlée ensuite |
| L01/L02 / QA | check_v0.py, git diff --check | liens fichiers locaux, intégrité corpus, diff sans whitespace fautif | résultat final enregistré ci-dessous |

Commandes exécutées (dossier temporaire de cette session, pas un chemin durable) :

```bash
python3 benchmarks/generate_corpus.py --output /tmp/gnu-mdv-v0-Kfih0v/first
python3 benchmarks/generate_corpus.py --output /tmp/gnu-mdv-v0-Kfih0v/second
python3 benchmarks/check_v0.py --corpus /tmp/gnu-mdv-v0-Kfih0v/first /tmp/gnu-mdv-v0-Kfih0v/second
git diff --check
```

Manifeste : `0449b567cf7c224920ce9a477286814f312b7fbb502aaaab07818fa39389486d`.
Le contrôle de liens vérifie les cibles fichiers locales, pas les ancres ni la
disponibilité HTTP. Les liens contenus dans les fixtures hostiles sont des entrées
de recette, pas des références documentaires à corriger.

Résultat du premier passage : 21 fichiers, 39 liens vers fichiers locaux valides ; intégrité,
tailles, encodages et reproductibilité vérifiés. `git diff --check` réussi.
Digest des artefacts lors de ce premier passage (historique) :
`c9cc87b2ce49eb711a5bc6ee070b0ffa0190dfbf03e6234710fef51e9da5a8f2`.
Le digest QA porte sur chemins relatifs triés + NUL + octets + NUL, selon la
liste explicite et les dossiers du script, en excluant ce rapport. Il ne comprend
pas les modifications concurrentes AGENTS/CLAUDE ni le suivi local.

## Non exécuté et raisons

- Vitest/Svelte, compilation Rust/CI et lancement WebView : application et
  manifestes absents, hors V0. pnpm et les prérequis natifs sont installés.
- Benchmarks : application absente et référence matérielle non disponible.
- Confinement effectif/révocation/absence de réseau : harness natif à créer L04 ;
  fixtures et policies ne sont pas une preuve d'exécution.
- Audit de sécurité des dépendances résolues : pas de lockfiles ; examen direct
  clos en L00, audit du graphe résolu à exécuter en L03.

## Prochaine étape

Identifier la machine de référence pour clore L01, puis engager L03 selon le
périmètre autorisé. Titulaire copyright/nom public : restent à confirmer avant
publication selon ADR 0001, sans bloquer le cadrage local.

## Continuation V0 — 3 octobre 2026

Clones demandés réalisés dans `/home/oem/Dev/GNU-MD-Viewer-upstream`,
hors dépôt et non suivis par GNU-MD-Viewer ; trois commits exacts, arbres propres.
Six fichiers de risque relus et hashés dans [UPSTREAM_REUSE](UPSTREAM_REUSE.md).
Échec DNS GitHub initial ; résolution publique vérifiée via DNS HTTPS et
`http.curloptResolve` limité aux commandes de clone/checkout, TLS conservé,
aucune modification de configuration système. Clones partiels : seuls les
blobs historiques non présents nécessiteront éventuellement le réseau.

[L00_AUDIT](L00_AUDIT.md) consigne 21 archives npm initiales, types Node
24.19.1 complémentaires et 2 crates Tauri, intégrité/notices/dépendances
déclarées et avis directs consultés. Timeout tauri-build puis reprise réussie,
pas de résultat masqué. Les types Markdown 14 sont écartés car v15 fournit ses
types. Aucun graphe transitif résolu, installation ou code de paquet exécuté.

L02 **done au niveau modèle/policies** : matrice références/autorité/messages,
racines/révocation, IPC/CSP, menaces reliées aux fixtures et attribution des
plafonds/calibrations à L04. IPC01 ajoute les scénarios issus des avis récents.
Cette clôture ne prouve aucun confinement ni recette native ; G1 reste todo.
À ce stade historique, L00/L01 restaient doing et le plan d'installation
attendait confirmation ; la section finale ci-dessous porte l'état courant.

Node24.18.0 existe déjà sous NVM (hors PATH initial), vérifié par chemin absolu.
Matériel utilisateur : VM Mint Zena 8 Go / 3 cœurs / SSD 60 Go sur hôte Ryzen
5 7530 6 cœurs / 16 Go / SSD 500 Go. La VM reste exploratoire pour les mesures ;
ressources visibles et allocation déclarée conservées distinctes, budgets
inchangés. Aucun bootstrap, commit, stage ou push.

Contrôle final de cette continuation : 21 fichiers de corpus toujours identiques,
46 liens locaux vérifiés, YAML parsé (L00/L01 doing, L02 done, G1 todo),
`git diff --check` réussi. Digest des artefacts dans ce nouvel état :
`74d1b6c7fda3609e05a1b64c2e5e34283f93f5e7e2039588bc84997fd1828017`.
Espace libre relevé : 14260363264 octets. Les rapports d'audit et clones restent
extérieurs au dépôt.

## Correction des outils proposés — 3 octobre 2026

Sur précision utilisateur, Node 24.18.0 et npm 11.16.0 existants ont été
vérifiés et sont conservés. Le plan précédent Node24.21/Rust1.99 est remplacé :
pnpm12.8.1 dédié, Rust/Cargo/rustfmt/Clippy via les quatre paquets apt versionnés
1.91, candidats 1.91.1+dfsg~24.04-0ubuntu0.24.04.3. Rust satisfait le minimum
direct Tauri 1.90 ; résolution/compilation transitive non démontrées.
Simulation apt outils Rust + headers : 108 nouveaux, 10 mises à jour, aucune
suppression. Tauri local npm/Cargo en L03, aucune installation globale prévue.
Cette préparation a depuis été exécutée, comme consigné ci-dessous ; aucun
bootstrap applicatif n'a été exécuté.
Contrôle documentaire après correction : 21 corpus et 46 liens locaux validés,
`git diff --check` réussi ; digest courant des artefacts :
`ffcfb42f984912b5905766fde4139422a0bdc65ce2e509b3745f497d130fdccb`.

## Installation vérifiée et clôture L00 — 3 octobre 2026

Après confirmation explicite, l'utilisateur a exécuté l'installation. Vérification
locale indépendante : Node 24.18.0, npm 11.16.0, pnpm 12.8.1 ; paquets
rustc/cargo/rustfmt/Clippy 1.91.1 ; `rustc-1.91` et `cargo-1.91` répondent en
1.91.1, rustfmt en 1.8.0 et Clippy en 0.1.91. WebKitGTK 2.52.6 et GTK 3.24.41
sont exposés par pkg-config. Les cinq headers directs demandés sont installés.
L'historique apt enregistre la transaction terminée à 22:35:26 sans erreur.

Les exécutables Rust versionnés sont sous `/usr/bin` et `/usr/lib/rust-1.91/bin` ;
ils devront être sélectionnés explicitement en L03. L00 passe à **done**.
Cela ne prouve ni résolution transitive, ni compilation, ni lancement desktop.
À ce stade, L01 restait doing faute de machine de référence caractérisée ;
L02 reste done documentaire. G1 reste todo.

Contrôle documentaire après installation : 21 corpus, 45 liens fichiers locaux,
YAML de suivi valide et `git diff --check` réussi. Digest courant des artefacts :
`ebb9b318d67a31d8652fac0bc27a7724d74fe624825283323736f95a34a1f899`.

## Caractérisation de l'hôte — 3 octobre 2026

L'hôte est sous Windows 10 avec GPU AMD Radeon intégré. Il satisfait la RAM et
le stockage physiques déclarés, mais ne permet pas une recette Linux native
tant que Linux n'est pas démarré directement sur ce matériel. La VM Mint reste
exploratoire ; WSL ou une VM ne remplaceraient pas cette preuve. L01 restait
**doing** avant la clôture documentaire ci-dessous : protocole/corpus prêts,
machine Linux physique conforme indisponible.
Ce constat n'empêche pas L03, dont le prérequis est L00, mais interdit de
présenter les futures mesures VM comme validation des budgets de référence.

## Clôture L01 et V0 — 3 octobre 2026

À la demande de l'utilisateur, la référence contractuelle est figée sur l'hôte
physique Ryzen 5 7530U (6 cœurs/12 threads), 16 Go, SSD 500 Go et Radeon intégrée,
à démarrer directement sous Linux pour les séries finales. La fiche AMD confirme
6/12 et 7 cœurs graphiques. Le [rapport L01](L01_REPORT.md) distingue ce profil
indisponible de la VM exploratoire et conserve tous les champs à relever au run.

L01 passe à **done** sur corpus/protocole, comme permis par la fiche du lot en
l'absence d'application. Aucun benchmark n'est converti en réussite. L00–L02
sont donc clos et V0 passe à **done** ; P1 reste doing avec L03/L04 et G1 todo.

Contrôle de clôture : 21 fichiers de corpus reproductibles, 50 liens fichiers
locaux valides, YAML avec V0/L00/L01/L02 `done`, `git diff --check` réussi.
Digest courant des artefacts :
`9bb52ccab0e6da076dff448aceda75a815eedd87826dac4d0e36a439a144dfb4`.
