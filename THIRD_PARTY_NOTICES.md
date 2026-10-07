# Notices tierces

État au 3 octobre 2026 : le bootstrap L03 incorpore les dépendances verrouillées
par `pnpm-lock.yaml` et `src-tauri/Cargo.lock`, ainsi qu'une icône originale au
projet. Aucun fragment ni asset des trois applications amont n'est repris ; voir
[UPSTREAM_REUSE](docs/UPSTREAM_REUSE.md). Aucun paquet n'est distribué à ce stade.

## Dépendances applicatives directes

| Élément | Version | Licence / attribution à conserver |
| --- | ---: | --- |
| Tauri (`tauri`, API JS) | 2.12.1 | MIT ou Apache-2.0, Tauri contributors |
| Svelte | 5.57.1 | MIT, Svelte contributors |
| markdown-it | 15.0.2 | MIT, Vitaly Puzrin, Alex Kocharin |
| DOMPurify | 3.4.16 | Apache-2.0 retenue parmi MPL-2.0 ou Apache-2.0, Cure53 |
| highlight.js | 11.12.0 | BSD-3-Clause, Ivan Sagalaev et contributeurs |
| Mermaid | 12.1.0 | MIT, Knut Sveidqvist et contributeurs |
| KaTeX, polices incluses dans le paquet | 0.19.0 | MIT, Khan Academy et contributeurs |

## Graphe résolu

`pnpm licenses list --prod --json` inventorie 137 paquets de production. Les
licences distinctes sont MIT, Apache-2.0, ISC, BSD-2-Clause, BSD-3-Clause,
PSF-2.0, EPL-2.0, Unlicense et les choix compatibles déclarés. `elkjs` 0.9.3
est EPL-2.0. `khroma` 2.1.0 n'a pas de champ `license` dans `package.json`, mais
son archive contient un fichier `license` MIT attribué à Fabio Spampinato et
Andrew Maney ; il n'est donc pas traité comme licence inconnue.

Le graphe Cargo audité en L03 contenait 417 crates sans licence absente. Le
lockfile V2 contient désormais 472 entrées après ajout des plugins ; son
inventaire de distribution devra être régénéré avant P4. Dans l'inventaire L03,
cinq transitives déclaraient MPL-2.0 (`cssparser`, `cssparser-macros`,
`dtoa-short`, `option-ext`, `selectors`) ; les autres expressions recensées
étaient permissives ou proposaient un choix permissif. Les textes et sources
exigés par MPL/EPL devront être joints ou rendus accessibles dans le paquet
final après gel du contenu distribué.

Avant distribution, générer l'inventaire exact depuis les lockfiles et le
contenu réellement embarqué, inclure les textes complets requis et vérifier les
obligations MPL-2.0/EPL-2.0. Ne pas déclarer toutes les dépendances MIT.
L'attribution déjà présente dans LICENSE est conservée ; le titulaire du projet
reste à confirmer selon ADR 0001.

## Outils et contrats ajoutés en L04

`jsdom` 30.1.1 et ses types 30.0.0 (MIT) fournissent le DOM de test recommandé
par DOMPurify. `tempfile` 3.27.0 (MIT ou Apache-2.0) crée les dossiers de tests
Rust. `getrandom` 0.4.3 et `serde` 1.0.229 (MIT ou Apache-2.0) sont déclarés
directement pour les jetons opaques et les contrats IPC ; ils existaient déjà
dans le graphe Tauri résolu. Aucun de ces outils n'ajoute un service réseau ;
jsdom, ses types et tempfile ne sont pas incorporés au binaire release normal.

## Intégration native ajoutée en V2

`tauri-plugin-dialog` 2.8.1 et `tauri-plugin-opener` 2.7.0 sont utilisés côté
Rust uniquement pour le dialogue d'ouverture et le navigateur système. Les deux
sont publiés par le projet Tauri sous double licence MIT ou Apache-2.0. `url`
2.5.8 (MIT ou Apache-2.0) fournit la validation syntaxique redondante des liens
HTTP(S). Aucun plugin filesystem générique n'est exposé au frontend ; sa présence
transitive pour les types de chemin du dialogue n'accorde aucune permission.

## Préférences ajoutées en P3/V4

`serde_json` 1.0.151 (MIT ou Apache-2.0, serde-rs contributors) devient une
dépendance directe pour le JSON local borné ; cette version était déjà résolue
transitivement dans Cargo.lock. Aucun nouveau paquet résolu ni service réseau.
Le code V4 est original ; highlight.js, KaTeX/fonts et Mermaid conservent les
licences ci-dessus. L'inventaire de distribution reste à régénérer en P4.
