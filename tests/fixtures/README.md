# Index du corpus — L01/L02

Fixtures originales GNU-MD Viewer, MIT selon LICENSE. Aucun document personnel
ou exemple copié des spécifications. Les fichiers hostiles sont des **données**,
ne pas les ouvrir avec un interpréteur HTML/SVG. Attendus = contrats à tester,
pas résultats de tests applicatifs. Le corpus ne prouve pas la conformité GFM.

| ID | Fichier / préparation | Complexité | Attendu observable | Lots / gate |
| --- | --- | --- | --- | --- |
| CM01 | commonmark.md | faible | titres, emphase, listes, citations, code ; HTML inerte | L06/L07, G2 |
| GF01 | gfm-extensions.md | modérée | table, barré, autolink ; tâches en lecture seule ; notes et cinq alerts | L06/L13, G2 |
| V301 | v3/document.md + v3/sub/guide.md + v3/assets/allowed.png | intégration | images, A → B → A, refus, TOC, thèmes, zoom et extensions après sanitisation ; recette dans docs/V3_NATIVE_RECIPE.md | L10–L13, G2 |
| V302 | v3/sub/été #%.md + v3/assets/été #%.png | intégration URI | noms encodés, fragment après ouverture et image ; PNG identique à allowed.png, icône originale MIT du projet | L10, G2 |
| HD01 | headings-search.md | modérée | H1–H6 Unicode et IDs uniques/déterministes sur titres dupliqués | L11, G2 |
| SE01 | headings-search.md | modérée | ÉTÉ trouve été et le code, pas ete ; .* littéral ; URLs/sources cachées exclues | L20, G3 |
| EN01 | metadata.md | faible | UTF-8 conservé ; frontmatter visible comme Markdown ordinaire | L05/L06, G2 |
| EN02 | generated/encoding-bom-crlf.md | faible | BOM retiré au décodage ; même texte LF/CRLF | L05, G2 |
| EN03 | generated/encoding-invalid.md | faible | erreur UTF-8, aucun remplacement destructeur ; ancien document conservé | L05/L21, G3 |
| HT01 | security/html-urls.md | hostile | aucune exécution, iframe, image HTML active ou accès IPC | L07/L23, G1/G4 |
| UR01 | security/html-urls.md | hostile | javascript/data/file/mailto/shell/blob rejetés ; HTTP(S) explicite seulement | L07/L10/L23, G2/G4 |
| IPC01 | security/html-urls.md + harness natif | hostile | domaine ressemblant à une origine interne reste externe ; IPC/asset forgés refusés ; payload de canal isolé par WebView | L04/L23, G1/G4 |
| NW01 | security/html-urls.md + enrichers.md + active.svg | hostile | zéro requête distante avant/après rendu ; pas de navigation WebView | L04/L23, G1/G4 |
| PA01 | security/paths.md | hostile | base du document malgré CWD différent ; hors racine refusé ; pas de double décodage | L04/L10, G1/G2 |
| PA02 | security/paths.md | hostile | chemins absolus confinés ; UNC/périphériques/reférences ambiguës refusés | L10/L25, G2/G4 |
| PA03 | recette native ci-dessous | hostile | symlink interne accepté ; extérieur/substitution refusés à l'ouverture | L04/L23, G1/G4 |
| RV01 | recette native ci-dessous | concurrence | ancienne URL/ancien handle révoqué après remplacement/fermeture | L04/L10/L21, G1/G3 |
| IM01 | security/active.svg | hostile | image SVG locale refusée avant insertion/décodage ; aucun réseau | L10/L23, G2/G4 |
| ER01 | enrichers.md | modérée | deux diagrammes identiques : IDs distincts ; formules rendues après filtrage | L04/L15/L16, G1/G3 |
| ER02 | enrichers.md | hostile | callbacks/liens Mermaid et commandes KaTeX non fiables neutralisés ; fallback local | L04/L15/L16/L23, G1/G4 |
| ER03 | generated/adversarial-* | forte | plafonds préventifs, source échappée + message ; UI et autres blocs disponibles | L04/L14–L16, G1/G3 |
| PF01 | generated/prose-{100000,1000000,5000000,20000000}.md | prose/code léger | métriques par taille, refus à 20000001 octets | L24, G4 |
| PF02 | generated/gfm-{tailles}.md | GFM modéré | compter tables/blocs, mêmes mesures sans assimiler à Mermaid | L24, G4 |
| PF03 | generated/code-{tailles}.md | code dominant | coût de coloration séparé ; limites L04 | L14/L24, G3/G4 |
| OP01 | recette native ci-dessous | concurrence | premier chemin d'une entrée traité ; autres signalés ; échec garde précédent | L05/L19/L21, G3 |
| OP02 | recette native ci-dessous | concurrence | ouverture A lente puis B : A tardif ne remplace pas B | L04/L21, G1/G3 |
| WA01 | recette native ci-dessous | concurrence | save atomique/rafale/disparition ; un watcher actif, dernier contenu stable | L17/L21, G3 |

`generated/` désigne la sortie de `benchmarks/generate_corpus.py`, non ce dossier.
Toutes les variantes de taille et d'encodage viennent du même générateur MIT.
Les caractères, octets, lignes et unités structurales sont dans son manifeste.
Les comptes exacts de tokens markdown-it seront ajoutés quand le moteur existe.

## Corpus V3

Le corpus `v3/headings.md` couvre H1–H6, doublons et suffixes en collision,
accents composés/décomposés, arabe, japonais, emoji, code/liens inline,
notes homonymes et sections éloignées. `v3/no-headings.md` vérifie le retrait
du sommaire et la remise à zéro du suivi de section. Ces documents sont
pilotés par `tests/integration/run_v3_harness.sh`, en lecture seule.
`v3/styles.md` apporte tableau large, code sans coupure et paragraphe arabe
mixte pour la recette thème/zoom/petite fenêtre L12.

## Recettes natives à matérialiser dans le harness L04

Dans un dossier temporaire dédié : créer `racine/document.md`, `racine/assets/`,
`exterieur/secret.md` avec un marqueur, et un document B. Ne jamais utiliser de
fichier personnel comme sentinelle. Définir la racine à `racine` par ouverture
native et lancer depuis un autre CWD.

- PA03 : lien symbolique vers une image interne, puis vers la sentinelle externe ;
  interposer une barrière de test entre validation et ouverture et substituer
  le lien. Aucun octet extérieur ne doit être retourné. Tester aussi le parent
  substitué ; Windows : junction/reparse point dans la recette native.
- RV01 : conserver l'URL/handle de A, activer B puis fermer ; réessayer l'ancien
  accès, attendu refus. Vérifier arrêt watcher, libération URLs/caches.
- OP01/OP02 : injecter une entrée à deux chemins puis ouvertures successives
  avec A retardé, B valide et un candidat invalide. Relever jetons et document
  actif ; la dernière intention acceptée fait autorité, échec conserve l'actif.
- WA01 : écrire dans un fichier temporaire puis renommer sur le document, produire
  une rafale, supprimer/recréer. Relever coalescing, erreurs et abonnements.
- NW01 : observer les accès réseau de l'arbre de processus/WebView et les
  navigations pendant ouverture/enrichissement. Un mock de fetch ne suffit pas.

Le harness L04 exécute sous Linux la substitution de symlink sur handle ouvert,
la révocation d'URL, les ouvertures concurrentes pures, les profils HTML/KaTeX/
Mermaid et l'absence de connexion IP ; voir son rapport. Windows/macOS, watcher,
lecteur Markdown intégré et campagnes G4 restent non exécutés. Les tests de
limites utilisent des entrées générées en mémoire aux bornes exactes/+1 ; ne pas
annoncer un décodeur d'image complet qualifié avant L10/L23.
