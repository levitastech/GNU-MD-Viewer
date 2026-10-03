# L01 — Corpus de référence et contrat de performances

Date de clôture documentaire : 3 octobre 2026. Base Git `e1201df`, diff V0
non committé. Statut : **done** pour la préparation du corpus et du protocole ;
aucun résultat de performance applicatif n'est revendiqué.

## Périmètre livré

- corpus original MIT indexé dans [tests/fixtures](../tests/fixtures/README.md) ;
- générateur déterministe et contrôle indépendant dans [benchmarks](../benchmarks/README.md) ;
- tailles 100 Ko, 1 Mo, 5 Mo et 20 Mo, plus borne refusée à 20 000 001 octets ;
- variantes prose/GFM/code, encodages et entrées adverses ;
- budgets, points de mesure, répétitions, p50/p95, mémoire PSS et stabilité dans
  [ACCEPTANCE](ACCEPTANCE.md) et le protocole benchmark.

Deux générations indépendantes produisent 21 fichiers et le même manifeste :
`0449b567cf7c224920ce9a477286814f312b7fbb502aaaab07818fa39389486d`.
Empreintes des outils de preuve :

| Outil | SHA-256 |
| --- | --- |
| `benchmarks/generate_corpus.py` | `14a917169f746af2da3a80bd7bf68e22ccb1086739fb31470528ea5c991f8407` |
| `benchmarks/check_v0.py` | `da5442a0329e1a6c2534e763948093c69a9aa18b25719ad8a93bf8f5135cdbf1` |

## Profils de mesure figés

### Référence Linux finale

Le matériel de référence est l'hôte physique déclaré par l'utilisateur :

- AMD Ryzen 5 7530U, 6 cœurs / 12 threads ;
- 16 Go de RAM et SSD 500 Go ;
- AMD Radeon intégrée, 7 cœurs graphiques selon la
  [fiche AMD officielle](https://www.amd.com/en/products/processors/laptop/ryzen/7000-series/amd-ryzen-5-7530u.html) ;
- Linux x86_64 démarré directement sur le matériel, cible initiale Ubuntu 24.04
  LTS, WebKitGTK API 4.1 ; aucun hyperviseur, WSL ou conteneur ne remplace ce profil.

Avant toute série finale, le rapport doit relever version OS/noyau, WebKitGTK,
identifiant GPU, pilote `amdgpu`, Mesa, accélération effective, modèle du SSD,
alimentation et charge de fond. Une différence de matériel crée un nouveau
profil comparable séparément ; elle ne remplace pas silencieusement la référence.

Ce profil n'est pas disponible aujourd'hui : l'hôte démarre sous Windows 10 et
aucun dual boot/support Linux direct n'est confirmé. Ce manque est une limite
d'exécution future, pas un résultat ni une modification des budgets.

### Environnement exploratoire

VM Linux Mint Zena/Mint 22.3, 8 Go et 3 cœurs déclarés, SSD virtuel 60 Go.
La session observée expose KVM, 6 vCPU sans SMT, 6 192 308 224 octets de RAM,
WebKitGTK 2.52.6 et GTK 3.24.41. Aucune accélération GPU/passthrough n'est
démontrée. Les mesures servent à repérer les régressions grossières et ne
peuvent valider les budgets de la référence Linux.

L'hôte Windows 10 pourra servir à des essais Windows distincts, mais ne vaut
ni recette Linux native ni qualification de la cible Windows 11 proposée.

## Preuves et limites de clôture

Commandes exécutées : deux générations dans des dossiers temporaires neufs,
`python3 benchmarks/check_v0.py` sur les deux sorties, parsing de
`.progress/PROGRESS.yml` et `git diff --check`. Le contrôle vérifie tailles,
encodages, hashes, reproductibilité et liens vers fichiers locaux ; il ne teste
pas les ancres ou URLs HTTP et n'exécute pas le viewer.

Les benchmarks applicatifs sont **non exécutés — application absente et profil
Linux final indisponible**. Le plan L01 autorise explicitement cette clôture sur
corpus et protocole ; les mesures sont produites en L24 et les calibrations de
risque en L04. Aucun chiffre de performance, support OS ou gate n'est déduit de
la présente clôture. Toute série ultérieure doit citer commit/diff, manifeste,
configuration complète, valeurs brutes et erreurs.

## Verdict

L01 est clos : corpus, attendus, classes de complexité, référence contractuelle
et protocole reproductible sont fixés. L'indisponibilité actuelle du boot Linux
natif est enregistrée et ne peut être masquée par la VM. G1 reste `todo` ; les
limites images/code/KaTeX/Mermaid et les preuves natives appartiennent à L04.
