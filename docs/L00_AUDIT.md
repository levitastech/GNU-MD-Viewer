# L00 — Revue des artefacts et références

3 octobre 2026 ; base e1201df, diff non committé. Audit de sélection directe
clos ; environnement de build installé et vérifié, environnement applicatif
et graphe transitif volontairement reportés au bootstrap L03.

## Étendue effectivement contrôlée

Le script [audit_stack.py](../benchmarks/audit_stack.py) consulte les métadonnées
exactes npm, télécharge les archives en mémoire, compare les empreintes SRI,
inventorie les dépendances déclarées et conserve les LICENSE/NOTICE avec hashes.
Il ne décompresse pas de code sur le disque, n'exécute aucun hook/import,
et refuse un cache dans le projet ou une sortie existante. Les JSON complets
sont conservés hors dépôt dans le dossier voisin des clones.

21 archives npm initiales contrôlées, dont @types/markdown-it 14.2.0 ensuite
écarté ; @types/node 24.19.1 contrôlé séparément. markdown-it 15.0.2 fournit
ses propres types : ajouter les types 14 serait inutile et risquerait un conflit.
Les autres bibliothèques de rendu ont aussi des déclarations embarquées.
Tauri 2.12.1 et tauri-build 2.7.1 : checksum SHA-256 de l'index crates.io
comparé à l'archive, MIT/Apache-2.0 présents, MSRV 1.90 confirmé.
Le timeout initial tauri-build a été repris avec succès ; il reste tracé.

Les licences racine ont été identifiées ; les notices de bundling révèlent
plusieurs licences pour les outils, notamment Vite/Vitest/Prettier/TypeScript
et pnpm. Ne pas les résumer à la seule licence du paquet principal. Le paquet
pnpm comprend les notices Yarn BSD-2-Clause et des licences embarquées ; son
attribution/licence principale sera conservée depuis la source officielle au
besoin. L'inventaire de fichiers de licence n'est pas un audit exhaustif de
chaque fragment ni de toutes les transitives. Aucun de ces outils n'est
distribué comme composant du viewer à cette étape.

## Rapports locaux et empreintes

Depuis `../GNU-MD-Viewer-upstream/` :

| Rapport | SHA-256 |
| --- | --- |
| audit-npm-2026-10-03/report.json | f5a343aa5b13f39fbb0e68db68f30c443b1ba736d226d2964ee2853e3d5b1bba |
| audit-node-types-2026-10-03/report.json | 193480c5ac786970de5da034c7699b9a56eedb778a625581a83cda0aa97a4bbc |
| audit-crates-2026-10-03/report.json (succès tauri, timeout tauri-build) | 341bc6aa90c215efd951c35a40128c344f0a3749a58a3894d9e9c31c3c26e0ef |
| audit-tauri-build-retry-2026-10-03/report.json | 30a26aa6abd2679f141281cfc1df4de715ecaaf902c5c5d04170ee02f57c7147 |

Le premier rapport inclut les types Markdown 14 étudiés puis refusés ; la liste
du script a depuis remplacé cette entrée par les types Node 24. Rejouer dans
un nouveau cache produit l'inventaire actuel, pas le premier rapport historique.
Les rapports récents portent le hash du script exécuté.

## Avis de sécurité consultés

L'endpoint officiel npm `/-/npm/v1/security/advisories/bulk` ne retourne aucun
avis pour les versions directes transmises, y compris @types/node consulté
séparément. Cela ne couvre pas les dépendances transitives ou embarquées,
les avis non publiés et les risques propres à notre intégration. Procédure de
l'endpoint : [documentation npm audit](https://docs.npmjs.com/cli/v11/commands/npm-audit/).

Pour Tauri, les avis récents ont été lus directement chez le mainteneur :

- [GHSA-w28w-mhc8-qvjv](https://github.com/tauri-apps/tauri/security/advisories/GHSA-w28w-mhc8-qvjv)
  : versions 2.0.0–2.11.5 affectées, correctif ≥ 2.11.6 ; candidat 2.12.1
  hors plage. Conserver un test de refus IPC entre origines/handles de session.
- [GHSA-7gmj-67g7-phm9](https://github.com/tauri-apps/tauri/security/advisories/GHSA-7gmj-67g7-phm9)
  : versions 2.0–2.11.0 affectées, correctif ≥ 2.11.1 ; candidat 2.12.1
  hors plage. Tester domaines ressemblant aux origines internes sur Windows.
- [RUSTSEC-2022-0091](https://rustsec.org/advisories/RUSTSEC-2022-0091.html) et
  [RUSTSEC-2022-0088](https://rustsec.org/advisories/RUSTSEC-2022-0088.html)
  : correctifs 1.x antérieurs au candidat ; aucune déduction de conformité
  de notre future commande personnalisée ou de son confinement.

L03 devra auditer le graphe réel des lockfiles (npm et Cargo/RustSec), y compris
binaires plateforme pnpm/CLI, polices et packages embarqués ; mettre à jour les
notices des composants réellement distribués. Cette obligation ne peut être
présentée comme exécutée avant les manifestes. Les builds natifs et les recettes
de sécurité restent L03/L04 et les gates suivantes.

## Clôture L00

Les clones/relectures et la sélection directe sont terminés. Le
[rapport d'installation](INSTALLATION_PLAN.md) prouve Node 24.18.0, npm 11.16.0,
pnpm 12.8.1, Rust/Cargo 1.91.1, rustfmt/Clippy et les headers WebKitGTK 4.1.
L00 est clos au niveau prévu avant manifestes. L03 matérialisera les versions,
résoudra/auditera les transitives et vérifiera la compilation ; ces obligations
ne rouvrent pas L00 sauf incompatibilité ou avis nouveau. L01 attend encore la
machine de mesure ; L02 est clos documentaire, plafonds attribués à L04.
