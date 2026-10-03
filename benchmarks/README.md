# Corpus et protocole — L01

Ce dossier ne contient pas un benchmark de l'application : application absente.
Le générateur Python 3.12 utilise seulement la bibliothèque standard. Il produit
des données originales MIT et un manifeste déterministe, sans horodatage/chemin
absolu. Il refuse un dossier de sortie existant, y compris un lien symbolique.

```bash
python3 benchmarks/generate_corpus.py --output benchmarks/generated
```

Ne pas relancer dans le même dossier : choisir un nouveau dossier temporaire
pour comparer la reproductibilité. Le dossier généré est ignoré par Git ;
versionner le générateur et archiver le manifeste avec chaque rapport de mesure.
Après deux générations indépendantes, contrôler intégrité et références :

```bash
python3 benchmarks/check_v0.py --corpus /chemin/premiere-sortie /chemin/seconde-sortie
```

Ce contrôle valide les liens vers fichiers locaux (pas les ancres), les tailles,
hashes, variantes d'encodage et la reproductibilité ; il ne teste pas le viewer.

Les octets, caractères Unicode, lignes, unités complètes et hashes sont comptés.
Les unités décrivent la structure, pas les tokens du parser. Ajouter le nombre
exact de tokens/blocs après création du moteur L06. Les cas fonctionnels et
attaques sont indexés dans [tests/fixtures](../tests/fixtures/README.md).

## Unités et classes

Convention explicite : 1 Ko = 1000 octets, 1 Mo = 1000000 octets ; 20 Mo =
20000000 octets. Le document à 20000001 octets doit être refusé avant parse.
Cette précision fixe une unité laissée ouverte dans le plan ; elle ne relève
aucun seuil. Mesurer séparément prose/code léger, GFM modéré, code dominant et
cas adverses (longues clôtures/table/code, graphe et maths complexes).
Ne pas appliquer le budget prose à une collection de graphes de même taille.

## Machine et conditions

Référence validée : Linux x86_64, SSD, 16 Go, CPU 4 cœurs/8 threads,
accélération graphique. Cette référence est fixée sur l'hôte Ryzen 5 7530U
6 cœurs/12 threads, 16 Go, SSD 500 Go et Radeon intégrée, lorsqu'il sera démarré
directement sous Linux. La machine locale inspectée est une VM Mint 22.3,
6 vCPU et environ 6,19 Go : **non conforme à cette référence**. Distribution
candidate de recette : Ubuntu 24.04 LTS, WebKitGTK 2.52.6/API 4.1.
Le profil est contractuellement identifié mais actuellement indisponible sous
Linux natif. L01 est clos sur le corpus/protocole ; aucune performance n'est
déduite avant exécution sur ce profil avec pilote/session/WebKitGTK relevés.
Mesures exploratoires sur la VM permises, aucune conformité au budget déduite.

Matériel fourni par l'utilisateur lors de la reprise V0 : VM Linux Mint Zena,
8 Go alloués, 3 cœurs et disque SSD virtuel 60 Go ; hôte AMD Ryzen 5 7530,
6 cœurs, 16 Go RAM, SSD 500 Go, Windows 10 et GPU AMD Radeon intégré. Les relevés depuis cette session exposent
6 vCPU et environ 6,19 Go disponibles au système : garder allocation déclarée
et ressources visibles comme deux observations distinctes. Ne pas confondre
les 16 Go physiques de l'hôte avec la RAM de la VM. L'hôte Windows ne constitue
pas une recette Linux native : il faudrait démarrer Linux directement sur le
matériel, par exemple en dual boot ou depuis un support externe. Aucun tel moyen
n'est identifié. Cette précision ne modifie aucun seuil ni le profil de référence.
La VM reste utilisable pour les mesures exploratoires ; aucune conformité aux
budgets Linux n'en sera déduite. L'hôte peut servir ultérieurement à une recette
Windows distincte, mais Windows 10 n'est pas la cible Windows 11 proposée.

Pour chaque série : commit + diff exact et SHA-256 du générateur/manifeste,
build release (sans serveur Vite/harness livré), versions OS/WebView, CPU,
RAM, disque, GPU et accélération, alimentation, charge de fond et réseau.
Fichiers locaux préexistants, polices/assets embarqués. Archiver toutes les
valeurs brutes, pas seulement un percentile. Les scripts de chronométrage et
collecte PSS seront ajoutés quand le processus applicatif existe.

## Chronométrage et statistiques

- Warm : app déjà lancée, mesurer de l'acceptation de l'action native jusqu'au
  premier frame avec texte utile du document demandé. Pour 1/5 Mo : rendu
  principal complet (parse + sanitisation + insertion + frame), enrichissements
  et ressources mesurés séparément. Pas de fin au seul retour du parser.
- Cold-process : app et descendants terminés, caches applicatifs absents,
  départ au lancement OS, fin au frame utile. Cache filesystem OS potentiellement
  chaud, état indiqué explicitement. Cold-system : série distincte après
  redémarrage, jamais obtenue en prétendant qu'un relaunch vide les caches OS.
- 20 répétitions par classe et mode, sans élimination silencieuse des extrêmes.
  p50/p95 par rang supérieur : valeur triée au rang `ceil(p × n)` (1-indexé),
  donc p95 = 19e valeur sur 20. Indiquer aussi max et erreurs. 5 Mo : toutes
  les répétitions doivent satisfaire ≤ 3 s ; pas convertir ce budget en médiane.
- Hot reload : départ à la sauvegarde complète/rename, fin au nouveau frame
  utile ; tester rafale et sauvegarde atomique, relever coalescing 150–300 ms.

## Mémoire et stabilité

Sous Linux : somme PSS de `/proc/<pid>/smaps_rollup` pour l'arbre complet,
Rust + WebView/processus auxiliaires, PID/starttime suivis pour éviter réutilisation.
Échantillons toutes les 100 ms, pic pendant ouverture/enrichissement et niveau
après 5 s de repos. Inclure images/enrichisseurs dans le total de la classe
testée. Windows/macOS : métrique privée documentée distincte, ne pas comparer
un RSS isolé à ces budgets.

50 cycles ouvrir/fermer document dans le même processus vivant ; point initial
après stabilisation, relevé après repos de chaque cycle, dérive finale ≤ 20 Mo.
Examiner la série et l'absence de tendance croissante ; en cas de bruit, répéter
avec même configuration et conserver les deux séries. Un redémarrage de l'app
à chaque cycle masquerait les fuites. Seuils complets : [ACCEPTANCE](../docs/ACCEPTANCE.md).
