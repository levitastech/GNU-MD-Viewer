# ADR 0002 — Socle neuf, versions exactes et provenance

État : stratégie retenue selon SG01 ; versions candidates, audit L00 en cours.
Date : 2026-10-03.

## Décision

Conserver Tauri 2/Rust stable, Svelte 5/TypeScript strict/Vite/pnpm, markdown-it,
DOMPurify et enrichisseurs différés. Créer un socle neuf en L03. Ne reprendre
aucune application amont complète ni son lockfile. La matrice candidate et ses
incompatibilités figurent dans [STACK_MATRIX](../STACK_MATRIX.md). Les versions
seront figées sans plages flottantes et résolues dans les lockfiles en L03 après
fermeture de l'audit L00. TypeScript 7 et Tauri 3 alpha ne sont pas adoptés.

## Conséquences

Le moteur reste indépendant du DOM/Svelte/Tauri. Une reprise éventuelle est
limitée, caractérisée et consignée dans [UPSTREAM_REUSE](../UPSTREAM_REUSE.md).
La déclaration de licence d'un registre ne remplace pas l'examen de l'archive.
Poids npm, poids du bundle et consommation runtime sont trois mesures distinctes.
Le texte MIT intégral remplace la notice abrégée ; l'attribution préexistante
est conservée et ne constitue pas confirmation du titulaire réel.
