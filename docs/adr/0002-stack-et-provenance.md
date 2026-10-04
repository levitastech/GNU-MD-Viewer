# ADR 0002 — Socle neuf, versions exactes et provenance

État : accepté et matérialisé par le bootstrap L03.
Date : 2026-10-03.

## Décision

Conserver Tauri 2/Rust stable, Svelte 5/TypeScript strict/Vite/pnpm, markdown-it,
DOMPurify et enrichisseurs différés. Le socle neuf créé en L03 ne reprend
aucune application amont complète ni son lockfile. La matrice candidate et ses
incompatibilités figurent dans [STACK_MATRIX](../STACK_MATRIX.md). Les versions
sont figées sans plages flottantes et résolues dans `pnpm-lock.yaml` et
`src-tauri/Cargo.lock`. TypeScript 7 et Tauri 3 alpha ne sont pas adoptés.
`package.json` est la source de la version applicative, contrôlée par test dans
les deux manifestes natifs. L'identifiant technique provisoire est
`com.levitastech.gnu-mdv` ; il ne valide ni le nom public ni une publication.

## Conséquences

Le moteur reste indépendant du DOM/Svelte/Tauri. Une reprise éventuelle est
limitée, caractérisée et consignée dans [UPSTREAM_REUSE](../UPSTREAM_REUSE.md).
La déclaration de licence d'un registre ne remplace pas l'examen de l'archive.
Poids npm, poids du bundle et consommation runtime sont trois mesures distinctes.
Le texte MIT intégral remplace la notice abrégée ; l'attribution préexistante
est conservée et ne constitue pas confirmation du titulaire réel.
