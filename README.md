# GNU-MD Viewer

**Lecteur Markdown desktop, local et hors ligne.** Ouvrir un fichier et naviguer dans son contenu avec un rendu fidèle, une interface sobre et des limites de sécurité explicites. Linux est la cible initiale ; Windows et macOS restent des cibles de conception.

> État du projet : pack documentaire et conventions initiales. Aucun binaire ni code applicatif n'est inclus dans ce pack. Les fonctions ci-dessous décrivent la cible du MVP, pas une version déjà disponible.

## Cible MVP

- Ouvrir `.md`, `.markdown`, `.mdown` et `.mkd` par dialogue, glisser-déposer, argument CLI (`gnu-mdv` à terme) ou association système.
- Afficher CommonMark et les extensions GFM utiles aux README : tables, tâches, liens, autolinks, code ; plus footnotes, alerts GitHub, Mermaid et KaTeX.
- Lire les images et documents liés avec résolution relative au document source, sans dépendance réseau ; proposer une table des matières, des ancres, la navigation, la coloration, thèmes, zoom et raccourcis.
- Recharger après une modification externe et retrouver les fichiers récents.

Le contenu Markdown est considéré non fiable : HTML brut désactivé par défaut, HTML produit sanitisé, permissions Tauri minimales, pas de chargement distant automatique. Détails dans [docs/SECURITY.md](docs/SECURITY.md).

## Développer et contribuer

Lire [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) pour les prérequis et les commandes **à utiliser après création du squelette**, [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour les frontières techniques, puis [CONTRIBUTING.md](CONTRIBUTING.md) pour proposer un changement. Les règles de travail se trouvent dans `.rules/`.

## Licence et nom

Le code du projet est prévu sous [licence MIT](LICENSE). « GNU » dans le nom du projet n'implique pas GPL ni appartenance au projet GNU. Le nom public doit être vérifié avant publication ; voir [ADR 0001](docs/adr/0001-licence-et-nom.md). Les dépendances et ressources tierces conservent leurs propres licences.
