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

Le graphe Cargo contient 417 crates sans licence absente. Cinq transitives
déclarent MPL-2.0 (`cssparser`, `cssparser-macros`, `dtoa-short`, `option-ext`,
`selectors`) ; les autres expressions recensées sont permissives ou proposent
un choix permissif. Les textes et sources exigés par MPL/EPL devront être joints
ou rendus accessibles dans le paquet final après gel du contenu distribué.

Avant distribution, générer l'inventaire exact depuis les lockfiles et le
contenu réellement embarqué, inclure les textes complets requis et vérifier les
obligations MPL-2.0/EPL-2.0. Ne pas déclarer toutes les dépendances MIT.
L'attribution déjà présente dans LICENSE est conservée ; le titulaire du projet
reste à confirmer selon ADR 0001.
