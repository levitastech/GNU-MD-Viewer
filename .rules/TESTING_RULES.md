# Règles de tests

## Principe

Tester les contrats observables, surtout sur l'entrée Markdown non fiable. Éviter des tests qui reproduisent exactement l'implémentation ou des seuils arbitraires de couverture. Une correction de sécurité/rendu ou de résolution de chemin comprend une fixture de régression. Des tests déterministes, locaux et rapides sont prioritaires.

## Périmètre

| Type | Outil prévu | Risque couvert |
| --- | --- | --- |
| Parser/plugins purs | Vitest + fixtures | CommonMark, GFM, extensions, HTML/URLs |
| Résolution des références | Vitest ou tests Rust selon propriétaire du code | base du fichier, traversées, Unicode, Windows |
| UI et navigation | tests Svelte ciblés selon infrastructure choisie | titres, table des matières, zoom, thèmes |
| Service Rust | `cargo test` | accès borné, erreurs, watcher, CLI |
| Intégration desktop | essais manuels/automatisés selon capacité | association, glisser-déposer, WebView OS |
| Performance | mesure reproductible documentée | temps d'ouverture et mémoire sur gros fichiers |

## Fixtures prioritaires

Document simple et long ; tableaux/listes/task lists/footnotes/alerts ; ancres répétées ; code malformé ; images et liens relatifs depuis plusieurs dossiers ; fichiers manquants ; balises HTML hostiles ; protocoles dangereux ; SVG/diagrammes Mermaid ; maths KaTeX ; document Unicode ; symlinks et sortie du dossier autorisé ; contenu externe qui ne doit pas se charger. Comparer les sorties attendues de manière stable sans figer tout un DOM si seule une propriété compte.

## Vérification de PR

- Exécuter la suite ciblée, puis les commandes du dépôt qui existent effectivement : `pnpm test`, contrôle TypeScript/Svelte, ESLint, Prettier, `cargo fmt --check`, `cargo clippy`, `cargo test`.
- CI future : lint + suites TS/Rust + build Linux ; étendre Windows/macOS avant release multi OS. Les essais manuels sont indiqués explicitement.
- Si aucun code applicatif n'existe encore, vérifier structure, liens internes et syntaxe des modèles ; ne pas déclarer les suites applicatives vertes.
- Ne pas valider une PR exposant une régression de sécurité connue, même si le rendu visuel semble correct.
