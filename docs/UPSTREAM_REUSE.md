# Registre de provenance — L00

3 octobre 2026. Aucun code, style, test ou asset amont incorporé à cette étape.
Les licences aux trois commits ci-dessous ont été relues aujourd'hui. Les
six fichiers de risque ont également été relus depuis les clones figés ; détails
et hashes ci-dessous. Les autres constats du plan restent historiques.
« Autorisé à étudier » ne signifie pas copié.

## Clones locaux de référence

Convention locale : dossier voisin `../GNU-MD-Viewer-upstream/` depuis la racine
du projet, avec `md-reader/`, `markview-app/`, `marksands-markview/`.
Clones Git partiels (`--filter=blob:none`) placés en HEAD détachée aux commits
du tableau, arbres propres. Aucun sous-module, lien dans le dépôt ou fichier
amont suivi par GNU-MD-Viewer. Leur historique reste propre à chaque clone.
L'inspection courante est possible hors ligne ; la consultation de blobs
historiques non présents peut nécessiter le réseau.

Les clones et caches d'audit sont hors du projet à la demande de l'utilisateur.
Ces chemins sont une commodité locale, pas un prérequis pour les contributeurs ;
les liens GitHub figés restent les références durables. Aucun script/package
de ces projets n'a été installé ni exécuté.

| Source figée | Licence / attribution constatée | Traitement |
| --- | --- | --- |
| [md-reader, 5727b5475c4ac2048719dcfa4053986f66180575](https://github.com/md-reader/md-reader/blob/5727b5475c4ac2048719dcfa4053986f66180575/LICENSE) | MIT, 2018-present Bener | inspiration de lecture ; aucun fragment adopté |
| [markview-app, b88b4e451482fac81b643fc1eacf6cb219267d2c](https://github.com/markview-app/markview/blob/b88b4e451482fac81b643fc1eacf6cb219267d2c/LICENSE) | MIT, 2026 MarkView Team ; fonctions propriétaires exclues | plugins/placeholders/styles à étudier seulement |
| [marksands, 09762b1d186c7145d8c4bbfbd5c4a8ed49fe329c](https://github.com/marksands/markview/blob/09762b1d186c7145d8c4bbfbd5c4a8ed49fe329c/LICENSE) | MIT, 2010, 2011 Mark Sands | inspiration CLI ; aucun backend repris |

## Inventaire des décisions de reprise

| Élément | Décision actuelle | Lot de revue |
| --- | --- | --- |
| Moteurs Markdown complets | refus : HTML par défaut/couplages incompatibles selon analyse historique ; moteur neuf | L06 |
| Task lists, alertes, footnotes | plugins maintenus ou règles internes ; reprise limitée éventuelle à tracer | L13 |
| Placeholder Mermaid / highlight-loader | étude possible, pas d'adoption ; IDs par session/génération/occurrence | L14/L16 |
| Styles et scénarios de tests | étude ciblée, pas de copie aujourd'hui | L06–L16 |
| Résolution locale, Mermaid loose, stockage Chrome, polling | refus de portage ; nouveaux services selon nos contrats | L10/L16/L17/L18 |
| Registry générique, PRO, popup/background, lockfiles | refus : couplages et périmètre | L03/L04/L06 |
| Sinatra, édition, save, création de document absent | refus : lecture seule et aucun serveur | tous |
| Logos, noms commerciaux, Graphviz/export/galerie/présentation | refus : aucun besoin MVP / droits non adoptés | hors MVP |

Avant toute copie : dépôt + commit + chemin + hash du fragment, licence intégrale
et attribution, modifications, tests de caractérisation et responsable de
maintenance. Mettre à jour [les notices](../THIRD_PARTY_NOTICES.md) dans le même
diff. Les fixtures initiales et le générateur sont originaux au projet.

## Relecture locale exécutée le 3 octobre 2026

| Source / fichier | Constat et lignes | SHA-256 du fichier |
| --- | --- | --- |
| md-reader `src/core/markdown.ts` | HTML actif l.65 ; couplage boutons/Ele l.51–81 ; suppression frontmatter après l.112 incompatible SG09 | e671ed8dd277df23dfcbb1ce5107698d9b21df2d6c1da4ae8aaf1c8f67a18534 |
| markview-app `src/core/markdown.ts` | HTML actif par défaut l.72 ; post-traitements HTML l.186/358/370 | 54f84adde923fa658e0b25e7e4994881c6eb10654c8e8053674ac3d3a914d1da |
| markview-app `src/utils/relative-path-resolver.ts` | setter sans effet l.18 ; résolution locale null l.28–31 | d47b7c554d97929e96a976e8736163af6db661c4d288da6ab9ec606486d9456e |
| markview-app `src/utils/mermaid-renderer.ts` | securityLevel loose l.19 ; insertion SVG innerHTML l.72/183 | e352fbcc43107f9d1dc49f5bfa37097226978c994cdf7c7b27792fd4715cc054 |
| markview-app `src/plugins/markdown-it-mermaid-render.ts` | ID dérivé du contenu seul l.15–23 ; collisions de blocs identiques | ed414bdb74075ac09827221db1b45576110e5e14c633f192f433ecc0a93f1050 |
| marksands `lib/markview.rb` | création fichier l.16 ; routes /edit l.38 et /save l.43–45 | 1ec3878eb8eb14fd0e69d11c90900ab034a3b0fcafbe88359ef23571047c46fe |

Ces incompatibilités avec nos contrats justifient le socle neuf ; elles ne
constituent pas une déclaration de vulnérabilité des produits distribués.
LICENSE SHA-256 : md-reader `aeba2515405dae8aa8c3180fc634408b03870268f0ef53b80e6ca0b1104284a4`,
markview-app `ffade451164aff0f48d3bfcc6e1ba6f0e787c5bd9cf3d8c5c8183e783178a3be`,
marksands `21ba483589f793c5979af577d7125552e481c8abbc0d810ae5f4be0cc2d0a28a`.
