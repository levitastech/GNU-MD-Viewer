# Recette native Linux V3 / G2

État : préparée, non exécutée. Référence :
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
- L11 : ancres locales, panneau masquable, section active et focus à compléter.
- L12 : mode système et remise à zéro du zoom à compléter.
- L13 : les cases et les renvois doivent être vérifiés après sanitisation ;
  le profil actuel retire `input`, `id` et `href`.

Ces écarts empêchent la clôture V3/G2 jusqu'à correction et recette.
