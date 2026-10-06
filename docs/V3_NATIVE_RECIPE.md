# Recette native Linux V3 / G2

État au 6 octobre 2026 : tranche automatisée exécutée sur Linux/X11 ;
recette complète et clôture G2 non acquises. Référence :
`tests/fixtures/v3/document.md` et `sub/guide.md`.

## Préparation

Compiler le binaire normal avec Node 24.18.0, pnpm 12.8.1 et Rust 1.91.1 :

```sh
pnpm desktop:compile
```

Lancer `src-tauri/target/release/gnu-mdv`, puis choisir la fixture A par le
dialogue. Consigner commit/diff, OS, session X11/Wayland et version WebKitGTK.
La recette doit utiliser le lecteur normal ; les harnesses L04/L09 précédents
ne couvrent pas les nouvelles interactions V3.

## Scénarios attendus

1. A affiche l'icône locale, un diagnostic pour l'image absente et un
   placeholder pour l'image distante. Aucun changement des fichiers sources.
2. A → B affiche B et l'image partagée. B → A conserve la racine initiale.
   Les liens absent et hors racine échouent sans perdre le document courant.
3. Le sommaire et les ancres locales déplacent la zone documentaire ; focus
   clavier, sections répétées et ancre absente sont contrôlés.
4. Les thèmes clair, sombre et système, ainsi que 80 %, 100 % et 200 %,
   restent lisibles en petite fenêtre. Le zoom ne relance pas le parsing.
5. Les tâches coché/non coché sont visibles et non modifiables ; la note
   répétée et ses retours fonctionnent après sanitisation. L'alerte reste
   accessible et contrastée dans les deux thèmes.
6. Fermer/réouvrir révoque les anciennes URLs et sessions. Une erreur
   d'ouverture conserve le document valide ; un résultat tardif est ignoré.
7. Observer les connexions du lecteur et de ses processus WebView avec
   `strace -f -e trace=connect` ; aucune connexion AF_INET/AF_INET6 spontanée.
   Conserver commandes, logs, attendu et résultat, puis la baseline exploratoire.

Chaque scénario est `réussi`, `échoué` ou `non exécuté` avec sa raison.
Windows/macOS restent explicitement différés selon SG05. Cette recette seule
ne vaut ni benchmark L24 ni qualification de ces plateformes.

## Écarts identifiés avant recette

- L10 : décodage URI, fragments et extension native de racine restent à
  compléter ; cette étape qualifie les chemins relatifs simples et leur
  confinement Linux.
- L11 : interactions branchées et vérifiées dans la WebView ; élargir le
  corpus de titres/clavier/scroll avant clôture.
- L12 : mode système et remise à zéro implémentés. Clair/sombre et reset
  vérifiés en natif ; changements OS à chaud, petite fenêtre, RTL et bornes
  de zoom restent à recetter.
- L13 : tâches et notes répétées après sanitisation vérifiées en natif ;
  les adaptations de renderer sont documentées dans l'architecture.

Ces écarts empêchent la clôture V3/G2 jusqu'à correction et recette.

## Tranche automatisée exécutée

Avec le PATH Node/Rust décrit dans DEVELOPMENT.md et un affichage X11 actif :

```sh
bash tests/integration/run_v3_harness.sh
```

Le script compile en debug avec `l09-harness` et `VITE_V3_HARNESS=1`,
sélectionne la fixture via le hook natif existant, puis pilote les composants
réels de `App.svelte`. Il ne remplace pas le pipeline de rendu. Il conserve
les logs dans un répertoire temporaire annoncé, contrôle les hashes source,
les connexions IP et 16 marqueurs d'interaction. Voir le rapport V3 pour
résultats et limites. Recompiler ensuite sans feature ni variable de harness.

La sonde de révocation utilise une URL neuve réservée à la feature de test,
afin de forcer une consultation du registre Rust. La réutilisation exacte
d'une ancienne URL peut être satisfaite par le cache d'image décodée WebKit :
elle ne prouve pas un nouvel accès natif. Les octets déjà livrés ne peuvent
pas être retirés rétroactivement de la mémoire WebView ; ce point reste une
limite explicite de la recette, et non une garantie d'effacement mémoire.
