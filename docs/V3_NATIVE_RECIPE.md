# Recette native Linux V3 / G2

État au 7 octobre 2026 : tranche automatisée L10–L13 et G2 qualifiée sur
Linux/X11 ; recette humaine exhaustive non exécutée. Référence :
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

## Qualification par lot

- L10 : décodage URI, fragments et extension native de racine implémentés,
  tests Rust et parcours WebView Linux réussis. Le sélecteur de dossier est
  remplacé par une sélection de fixture uniquement dans le binaire de test ;
  aucun clic manuel dans le dialogue natif n'est attesté.
- L11 : corpus H1–H6 Unicode/RTL/doublons/code/liens et notes homonymes,
  ancres décomposées/absentes, focus, sélection et sauts de défilement qualifiés
  sur la matrice automatisée Linux. Aucun clavier physique ni lecteur d'écran
  n'est attesté ; le harness émet un événement clavier DOM dans la WebView.
- L12 : le mode système suit un changement réel clair/sombre du bureau dans
  la WebView ; 80–200 %, reset, fenêtre 640 × 480, texte RTL, code long et
  tableau large et échelle 2 vérifiés sur Linux. Binaire debug normal
  reconstruit puis smoke X11 réussi après le harness ; voir le rapport V3.
- L13 : corpus combiné de tâches imbriquées, notes répétées et cinq alertes,
  avec faux marqueurs en citation/code, sanitisation et navigation de retour
  vérifiés dans la WebView Linux. Voir le complément L13 du rapport V3.

Les limites résiduelles sont consignées dans le
[dossier de clôture P2/G2](P2_G2_CLOSURE.md).

## Tranche automatisée exécutée

Avec le PATH Node/Rust décrit dans DEVELOPMENT.md et un affichage X11 actif :

```sh
bash tests/integration/run_v3_harness.sh
```

La recette utilise `gsettings` et `wmctrl` pour basculer réellement la
préférence système puis ramener la fenêtre à 640 × 480. La valeur initiale de
`org.gnome.desktop.interface color-scheme` est restaurée à la sortie du script.
Pour une seconde passe DPI sous GTK/X11 :

```sh
GDK_SCALE=2 GNU_MDV_V3_EXPECT_SCALE=2 bash tests/integration/run_v3_harness.sh
```

Le script compile en debug avec `l09-harness` et `VITE_V3_HARNESS=1`,
sélectionne la fixture via le hook natif existant, puis pilote les composants
réels de `App.svelte`. Il ne remplace pas le pipeline de rendu. Il conserve
les logs dans un répertoire temporaire annoncé, contrôle les hashes source,
les connexions IP et 46 marqueurs d'interaction. Le lecteur est lancé avec
`/tmp` comme CWD. Voir le rapport V3 pour
résultats et limites. Recompiler ensuite sans feature ni variable de harness.

La sonde de révocation utilise une URL neuve réservée à la feature de test,
afin de forcer une consultation du registre Rust. La réutilisation exacte
d'une ancienne URL peut être satisfaite par le cache d'image décodée WebKit :
elle ne prouve pas un nouvel accès natif. Les octets déjà livrés ne peuvent
pas être retirés rétroactivement de la mémoire WebView ; ce point reste une
limite explicite de la recette, et non une garantie d'effacement mémoire.
