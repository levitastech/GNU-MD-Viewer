# GNU-MD Viewer

**Lecteur Markdown desktop, local et hors ligne.** Ouvrir un fichier et naviguer dans son contenu avec un rendu fidèle, une interface sobre et des limites de sécurité explicites. Linux est la cible initiale ; Windows et macOS restent des cibles de conception.

> État du projet : la release `0.2.0` est en implémentation. P1/G1 est clos et
> la première tranche P2/V2 (L05–L09) est implémentée sur la matrice Linux active.
> L'application ouvre par dialogue un
> document Markdown réel, le lit en UTF-8 borné et lecture seule, le rend puis le
> sanitise avant affichage. Images et liens locaux, sommaire, thèmes/zoom,
> tâches, notes et alertes sont implémentés ; P2/V3 reste en qualification.
> Windows et macOS ne sont pas qualifiés. Il ne s'agit
> ni du MVP complet ni d'une version publiée.

## Cible MVP

- Ouvrir `.md`, `.markdown`, `.mdown` et `.mkd` par dialogue, glisser-déposer, argument CLI (`gnu-mdv` à terme) ou association système.
- Afficher CommonMark et les extensions GFM utiles aux README : tables, tâches, liens, autolinks, code ; plus footnotes, alerts GitHub, Mermaid et KaTeX.
- Lire les images et documents liés avec résolution relative au document source, sans dépendance réseau ; proposer une table des matières, des ancres, la navigation, la coloration, thèmes, zoom et raccourcis.
- Recharger après une modification externe et retrouver les fichiers récents.

Le contenu Markdown est considéré non fiable : HTML brut désactivé par défaut, HTML produit sanitisé, permissions Tauri minimales, pas de chargement distant automatique. Détails dans [docs/SECURITY.md](docs/SECURITY.md).

## Développer et contribuer

Lire [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) pour les prérequis et les commandes exécutables du squelette, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour les frontières techniques, puis [CONTRIBUTING.md](CONTRIBUTING.md) pour proposer un changement. Les règles de travail se trouvent dans `.rules/`.

Le cadrage V0 est engagé : [matrice candidate du stack](docs/STACK_MATRIX.md),
[registre de provenance](docs/UPSTREAM_REUSE.md),
[critères d'acceptation](docs/ACCEPTANCE.md) et
[rapport L01](docs/L01_REPORT.md) avec son [corpus/protocole](benchmarks/README.md).
Le rapport [L03](docs/L03_BOOTSTRAP_REPORT.md) distingue les builds locaux des
jobs natifs encore non exécutés ; le rapport [L04](docs/L04_RISK_PROTOTYPES_REPORT.md)
consigne les prototypes de risque Linux ; le rapport [V2/L05–L09](docs/L05_L09_V2_REPORT.md)
détaille la première tranche du lecteur `0.2.0`. Le HTML brut des README reste
du texte inerte ; images distantes et images SVG locales ne sont pas chargées
dans le profil MVP.

## Licence et nom

Le code du projet est prévu sous [licence MIT](LICENSE). « GNU » dans le nom du projet n'implique pas GPL ni appartenance au projet GNU. Le nom public doit être vérifié avant publication ; voir [ADR 0001](docs/adr/0001-licence-et-nom.md). Les dépendances et ressources tierces conservent leurs propres licences.
