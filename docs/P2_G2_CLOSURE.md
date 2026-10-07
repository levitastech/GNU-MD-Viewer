# Clôture P2 / G2 — lecteur utilisable

Date : 7 octobre 2026. Version de travail `0.2.0`, non publiée. Référence de
qualification : `3213a11` après L10 `265a81a`, L11 `f783f6e` et L12
`e356bcd` ; V2/L05–L09 est clos dans `cf81da5`. Branche `dev`, sans tag,
paquet ni publication. Les rapports [V2](L05_L09_V2_REPORT.md),
[V3](L10_L13_V3_REPORT.md) et [L04](L04_RISK_PROTOTYPES_REPORT.md) portent les
preuves détaillées.

Matrice disponible : Linux Mint 22.3 x86_64, X11 `:0`, WebKitGTK 2.52.6,
Node 24.18.0, pnpm 12.8.1, Rust/Cargo 1.91.1. Fenêtre GTK testée à 640 × 480
et avec `GDK_SCALE=2`. La VM ne représente pas la machine de benchmark L24.

## Checklist G2

| Exigence | Preuve et résultat |
| --- | --- |
| L05–L13 et ouverture/erreurs/concurrence | V2 et V3 clos ; 47 tests frontend, dont contrôleur d'ouvertures tardives, et 46 marqueurs dans la WebView réelle. Le hook de fixture remplace seulement la réponse du dialogue dans la recette automatisée. Une erreur conserve A. |
| Ressources et politique de racine | Tests Rust L04/L10 : jetons opaques, refus de sortie, substitution de symlink/ancêtre, second contrôle du handle ouvert, racine parent choisie en natif, révocation de session. Parcours A → B → A, fragment et images locales réussis dans V3. |
| Markdown/GFM ciblé et interface | Fixtures CommonMark/V2 et corpus V3 : titres/TOC, tâches imbriquées, notes répétées, cinq alertes, thèmes système/clair/sombre, zoom 80–200 %, petite fenêtre/RTL/DPI. HTML brut et chargements distants restent inertes. |
| Documents inchangés et réseau silencieux | Neuf hashes des fixtures V3 identiques avant/après ; `strace -f -e trace=connect` ne montre aucune connexion AF_INET/AF_INET6 pendant le parcours Linux. |
| Recette native et plateformes | Harness Tauri/WebKitGTK Linux aux échelles 1 et 2 : 46 marqueurs réussis ; binaire desktop debug normal reconstruit ensuite et smoke X11 12 s réussi (timeout 124 attendu). Windows et macOS sont explicitement différés selon SG05, donc non annoncés supportés. |
| Baseline | L09 : 110 ms / 156916 KiB ; V3 complet : 5344 ms / 162940 KiB à l'échelle 1, 3562 ms / 181780 KiB à l'échelle 2. Temps de parcours et RSS maximal exploratoires ; corpus/VM différents du protocole de benchmark L24. |

Le build frontend normal ne contient pas le chunk de recette. Le contrôle
statique Svelte, ESLint et Prettier est vert ; rustfmt, Clippy tous
targets/features et les tests Rust finaux sont consignés dans le rapport V3.

## Limites explicites

Le clic humain dans le dialogue document/dossier, le clavier physique et un
lecteur d'écran ne sont pas attestés. Une capture ponctuelle montre le haut du
corpus L13 lisible ; elle ne vaut pas audit visuel exhaustif. L'ouverture
réelle d'une URL externe n'a pas été déclenchée. Le build release, les
installateurs et les recettes Windows/macOS ne sont pas exécutés. La WebView
peut conserver des octets d'image déjà décodés après révocation ; un nouvel
accès au registre Rust avec jeton révoqué est bien refusé. Ces limites ne
transforment pas G2 en publication ni en support multiplateforme.

G2 autorise le démarrage de P3/L14. Le MVP complet exige encore L14–L22/G3,
puis P4/G4 avant tout candidat publiable.
