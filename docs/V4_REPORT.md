# P3 / V4 — release 0.3.0 en implémentation

V4 couvre L14–L18 ; ordre d'exécution L16, L15, L14, L17, L18 selon
le risque et les dépendances. G2 est clos dans `4b0398e`. G3 reste ouvert :
V5/L19–L22, intégration complète et paquets installés sont encore nécessaires.
Aucun tag, push ou publication n'est demandé ici.

## Versions et vérification des API

Consultation officielle le 7 octobre 2026 avant implémentation :

- Mermaid **12.1.0** : [configuration](https://mermaid.js.org/config/schema-docs/config.html),
  `initialize`, strict, htmlLabels, maxEdges, maxTextSize et secure.
- KaTeX **0.19.0** : [options](https://katex.org/docs/options.html).
- highlight.js **11.12.0** : [API](https://highlightjs.readthedocs.io/en/latest/api.html),
  documentation publiée sous 11.9 ; signature vérifiée aussi dans le paquet figé.
- Tauri **2.12.1** : [commandes](https://v2.tauri.app/develop/calling-rust/).
- Svelte **5.57.1** : [effets et nettoyage](https://svelte.dev/docs/svelte/$effect).

Ces dépendances étaient déjà figées au bootstrap ; aucune nouvelle dépendance
n'est introduite par L16. Les résultats hérités de L04 restent des prototypes.

## L16 — Mermaid

Le lecteur consomme maintenant les placeholders du parser ; source conservée
hors HTML enrichi, erreur locale avec source échappée. Import différé uniquement
pour les blocs Mermaid. File globale sérialisée (32 travaux en attente au plus),
pas de callback Mermaid lié au DOM. Configuration applicative réinitialisée
par rendu dans cette file ; directives, frontmatter, liens et HTML de diagramme
refusés avant import. `strict`, labels SVG et sanitisation par liste positive,
validation des références `url(#id)` locales. IDs de génération/occurrence
uniques ; résultat abandonné si document ou thème a changé.

Familles déclarées : flowchart et sequenceDiagram. Les autres familles restent
en source avec message ; cela réduit explicitement le profil du prototype L04,
sans promettre l'ensemble des familles Mermaid. Budgets L04 conservés : 65 536
caractères, 2 000 lignes, 500 arêtes et maxEdges natif Mermaid. Une promesse ne
coupe pas un calcul déjà commencé ; aucune annulation CPU n'est annoncée.

Recette reproductible : `bash tests/integration/run_v4_harness.sh`, application
réelle avec seul sélecteur remplacé par fixture native via feature l09-harness,
lancée depuis `/tmp`. Deux flowcharts identiques, séquence, directive hostile,
syntaxe invalide, IDs, SVG inerte, changement de thème, hashes et strace réseau.
La CSS applicative fixe la présentation SVG ; les styles arbitraires générés
par Mermaid sont retirés, sans relâcher la policy. Pas de recette Windows/macOS
ou de benchmark contractuel. Résultats d'exécution consignés ci-dessous.

### Preuve L16 — 7 octobre 2026

Diff du commit L16 (incluant ouverture 0.3.0). Linux Mint/X11 x86_64,
WebKitGTK 2.52.6, Node 24.18.0, pnpm 12.8.1, Rust 1.91.1 :

- `pnpm test` : 51/51, puis test de résultat tardif ajouté : 5/5 L16.
- `pnpm check`, `pnpm lint`, `pnpm format:check`, rustfmt : réussite.
- `DISPLAY=:0 XAUTHORITY=/home/oem/.Xauthority bash tests/integration/run_v4_harness.sh` :
  cinq marqueurs réussis, hashes inchangés, aucune connexion IP sous strace.
  Preuves locales `/tmp/gnu-mdv-v4.Lh7bqX` ; timeout 124 attendu.
- Première tentative sans DISPLAY : échec d'initialisation GTK, recette relancée
  avec la session locale. Avertissements EGL/VMware sans crash applicatif.
- Build desktop debug instrumenté réussi. Reconstruction normale prévue en fin
  de V4 ; pas de build release, de recette visuelle humaine ou de cible non Linux.

## L15 — KaTeX différé

Syntaxe précisée dans `docs/ACCEPTANCE.md` : `\(...\)` inline, `$$` ou
`\[...\]` sur des lignes séparées en display. Les dollars simples restent du
texte ; les règles du parser ne traitent pas le code. Source conservée dans les
métadonnées de rendu, placeholder échappé et fallback local. Module, CSS et
polices KaTeX importés seulement pour les maths. `trust: false`, strict/error,
maxExpand 1 000, maxSize 20 em, source au plus 16 384 caractères ; macros neuves
pour chaque expression, donc aucune transmission entre documents. Sanitisation
HTML/MathML avant insertion dans le même profil isolé que L04. L'annulation de
session s'applique après import et avant insertion.

Les tests ciblés couvrent délimiteurs, monnaie, code, source incomplète, macros
récursives/isolées, liens et dépassements ; 8/8 avec le profil de sanitisation.
Svelte check et lint réussis. Une faute de délimiteur dans le test a d'abord été
corrigée avant ces résultats. La première recette native a réussi maths,
monnaie, erreurs et inactivité, mais échoué sur la police ; elle n'est pas une
preuve de clôture. Le build conserve désormais les assets en fichiers locaux
(`assetsInlineLimit: 0`), évitant les fonts data: incompatibles avec `font-src
'self'`. La recette attend une police effectivement chargée après layout ;
Mermaid est revalidé avec ce build. Aucun assouplissement CSP.

Preuve finale L15 (diff du commit L15), même matrice Linux : commande V4
ci-dessus, dix marqueurs réussis dont police KaTeX chargée, aucune connexion IP
et hash source inchangé. Preuves `/tmp/gnu-mdv-v4.FdI2Ee` ; build debug réussi,
arrêt attendu 124. Contrôles ciblés, Svelte, lint et format réussis. Windows,
macOS et inspection visuelle humaine non exécutés ; normal/release selon les
limites de validation V4. Cette recette revalide aussi L16 après le changement
d'assets du build.

## L14 — Coloration ciblée

highlight.js core et huit grammaires figées (JavaScript, TypeScript, JSON,
HTML/XML, CSS, Bash, Python, Rust), utiles aux README techniques de cette stack.
Alias js/ts/html/sh/shell/py/rs explicites, aucune détection automatique. Langue
inconnue ou absente : code échappé conservé, sans importer le core. Limites L04
1 000 000 octets UTF-8 / 50 000 lignes appliquées avant chargement. HTML de
coloration limité aux spans/classes par sanitisation dédiée ; contrôle du texte
après insertion. Le cache inclut version, langue et source ; au plus 32 entrées,
2 Mo de chaînes (estimation UTF-16), libéré à la fin du passage ou annulation.
Palette CSS locale claire/sombre ; aucune CSS de thème distante.

Tests ciblés : 15/15 (parser, maths, L16 et coloration) ; huit grammaires/alias,
chaînes script/HTML comme texte, taille/lignes excessives, cache et annulation.
Svelte et lint réussis. La recette native vérifie chargement différé au lancement
vide, spans JS, copie par sélection DOM, fallback inconnu/HTML hostile et
re-rendu de thème, en plus des contrôles Mermaid/KaTeX. La recherche L20 reste
à implémenter ; les spans préservent le texte pour son futur contrat.

Preuve finale L14, diff du commit L14, même matrice Linux : recette V4,
14 marqueurs réussis, dont absence de chargement d'enrichisseurs au lancement
vide et sélection exacte à travers les spans ; aucune connexion IP et hash
source inchangé. Preuves `/tmp/gnu-mdv-v4.AiGURb`, build debug réussi et timeout
124 attendu. Contraste par palette CSS ; pas de recette visuelle humaine ni de
clavier physique/lecteur d'écran, ni de cible non Linux. Recette V4 combinée
revalide L15/L16 ; l'intégration complète reste L21.

## L17 — Rechargement externe borné

Choix : polling des métadonnées en Rust, cadencé par une seule boucle UI à
150 ms. Pas de nouvelle crate, pas de thread/watch OS durable ni scan de parent.
Observation du chemin autorisé et des remplacements atomiques ; identité
inode/device/ctime sur Unix et taille/mtime. Deux observations identiques d'un
changement avant relecture : coalescing 150 ms, signal traité une seule fois.
Le polling est suspendu pendant une ouverture. Fermer/changer de session annule
le timer et ignore un poll tardif. La nouvelle intention invalide aussi un rendu
encore en cours dans le coordinateur, avant même le retour d'un dialogue.

Relecture via sélection opaque liée à la session active ; racine et handle
ouverts revalidés comme pour une navigation locale. Nouvelle session/ressources
à chaque relecture réussie. Erreur, suppression, UTF-8 invalide ou permission :
dernier rendu conservé et diagnostic affiché ; prochaine modification valide
ou bouton Recharger permet la reprise. La suppression/recréation conserve la
session de lecture précédente jusqu'à succès. Position titre/décalage, puis
ratio en fallback, sans déplacement de focus. Une image modifiée seule exige
Recharger ; aucun watcher d'images supplémentaire.

API std::fs Metadata [vérifiée](https://doc.rust-lang.org/std/fs/struct.Metadata.html)
et compilation Rust 1.91.1. Tests natifs ciblés : 17/17 dont remplacement,
suppression/recréation, coalescing, session révoquée, symlink sortant ; frontend :
50 cycles sans timer restant, poll tardif ignoré, erreur/reprise, rechargement
invalide, maintien d'ancre/ratio sans focus. Recette native étendue : seules les
copies temporaires du harness sont écrites par un processus externe, jamais
les documents du dépôt. Les délais incluent observation après sauvegarde et
texte utile visible, distincts des imports/enrichissements lourds.

Preuve L17 finale (diff du commit L17), même matrice Linux : 21 contrôles
natifs réussis, hashes dépôt inchangés, aucune connexion IP. Preuves locales
`/tmp/gnu-mdv-v4.pM3x7W`. Depuis fin de sauvegarde jusqu'au texte/beacon observé :
overwrite 0,709 s, remplacement 0,406 s, recréation 0,354 s ; exploratoire en VM,
pas un benchmark L24. Le script impose ≤ 1 s pour ces trois scénarios.
L'essai précédent à 250 ms avait mesuré 1,065 s pour overwrite ; cadence
abaissée à 150 ms, dans la plage prévue, et attente de tous les diagrammes du
nouveau thème avant mesure. La première recette avait aussi révélé les deux
permissions Tauri manquantes : elles sont maintenant déclarées explicitement
dans AppManifest/capability ; aucun accès global n'est ajouté. Tests frontend
supplémentaires : relecture tardive supplantée par un dialogue annulé, 9/9 sur
le contrôleur ; position 2/2, boucle 2/2. Inspection visuelle humaine, build
release et plateformes non Linux non exécutés.

## L18 — Préférences et récents

`config.rs` stocke le schéma 1 dans `app_config_dir()/preferences.json`. JSON
limité à 65 536 octets, vingt chemins récents, aucun contenu de document ;
lecture bornée, validation thème/zoom/TOC, défauts sûrs. Fichier corrompu :
diagnostic et récupération sur prochaine action explicite. Fichier futur,
inaccessible ou trop volumineux : défauts de session sans écrasement. Si le
résolveur de configuration échoue, aucune écriture ni repli vers le CWD.
Temporaire exclusif au même dossier, write/sync/rename et sync du dossier sur
Unix ; mode 0600. État précédent conservé si l'écriture échoue avant remplacement.

Les IDs des récents sont opaques, stables malgré le réordonnancement et révoqués
au retrait ; les chemins restent en Rust. Aucune lecture au lancement et
réautorisation uniquement au clic. Un récent absent conserve le rendu affiché.
Retrait individuel/vidage accessibles. Les rechargements n'ajoutent pas de
récent : effacer puis recevoir une sauvegarde externe conserve l'historique vide.
Thème, zoom et TOC restaurés ; les écritures de réglages UI sont sérialisées.
Le bouton Recharger rejoint la barre de commandes.

`serde_json` 1.0.151 devient directe (déjà résolue, MIT/Apache-2.0), pour éviter
un parser local ad hoc ; aucun nouveau paquet résolu. API officielle
[serde_json](https://docs.rs/serde_json/1.0.151/serde_json/) consultée le 7 octobre,
API Tauri app_config_dir inspectée dans le paquet 2.12.1 (`src/path/desktop.rs`,
documentation embarquée). Notices mises à jour ; inventaire distribué en P4.

Tests ciblés natifs 4/4 : configuration vide/corrompue/future/trop grande,
roundtrip Unicode, liste pleine/doublons, temporaire abandonné, échec de rename,
IDs stables et retrait. Contrôleur récent absent 10/10 avec les scénarios
existants. La recette native utilise XDG_CONFIG_HOME isolé et deux lancements,
avec persistance, réouverture explicite, fichier absent, retrait/vidage et
sauvegarde après effacement. La première recette a exposé une attente UI trop
courte après Recharger ; le harness attend désormais le nouvel article et le
flush Svelte avant ses prédicats. Résultats finaux ci-dessous.

### Preuve native finale L18 / V4

Diff L18, Linux Mint 22.3 x86_64 / X11 / WebKitGTK 2.52.6, mêmes versions
Node/pnpm/Rust que ci-dessus. Commande V4 avec DISPLAY/XAUTHORITY, preuves
`/tmp/gnu-mdv-v4.fxwCgT` : 25 contrôles au premier lancement et sept au second,
tous réussis. Aucune connexion AF_INET/AF_INET6 dans les deux traces, hash de la
fixture du dépôt inchangé ; seuls copie et JSON temporaires sont modifiés par
la recette. Réglages dark/120 %/TOC masqué restaurés, aucune ouverture au
lancement, récent réautorisé, retrait et vidage conservant le document, puis
historique toujours vide après sauvegarde externe. Timeouts 124 attendus.

Délais exploratoires fin de sauvegarde → texte observé : 0,405 s overwrite,
0,405 s remplacement atomique, 0,511 s recréation. Ils ne remplacent ni machine
physique de référence ni campagne de performances L24. Les sorties anciennes
échouées sont décrites ci-dessus ; seul cet essai final ferme la recette V4.
La dernière correction Clippy remplace le modulo de validation du zoom par
`is_multiple_of`, à comportement identique ; les suites Rust et le build
normal sont exécutés sur le diff final. Pas de build release, installateur,
recette visuelle humaine, clavier physique/lecteur d'écran ou recette native
Windows/macOS. Ces cibles restent différées SG05, sans annonce de support.

## Validation finale et sortie de V4

Sur le diff final L18, le 7 octobre 2026 :

| Contrôle | Résultat |
| --- | --- |
| `pnpm test` | 19 fichiers, 63 tests réussis |
| `pnpm check`, `pnpm lint`, `pnpm format:check` | réussite ; Svelte 0 erreur/avertissement |
| `cargo fmt --manifest-path src-tauri/Cargo.toml --check` | réussite |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --all-features -- -D warnings` | réussite après correction de style zoom |
| `cargo test --manifest-path src-tauri/Cargo.toml --all-targets --all-features` | 38 tests réussis |
| `pnpm tauri build --debug --no-bundle` | binaire normal reconstruit, sans features de harness |
| Smoke normal X11 / XDG_CONFIG_HOME isolé | vivant 12 s, timeout 124 attendu, avertissements EGL/VMware sans crash |
| Version package / Tauri / Cargo / Cargo.lock | `0.3.0` concordante |
| Recette native V4 sur deux lancements | 32 contrôles réussis, deux traces sans connexion IP, fixture dépôt inchangée |

Les Markdown sont exclus du contrôle Prettier du dépôt ; structure, références
locales et diff sont contrôlés séparément. Les gros chunks Vite différés
émettent un avertissement de taille ; aucun budget de performances contractuel
n'est déclaré acquis. Nettoyage limité au paquet compilé `gnu-mdv` avant les
suites finales pour libérer de l'espace disque ; sources et preuves conservées.

L14–L18/V4 sont clos sur cette matrice automatisée Linux. P3 reste en cours,
V5/L19–L22 et G3 restent ouverts : CLI/drop/associations, recherche/commandes,
intégration complète et paquets installés sont encore à réaliser. La release
`0.3.0` reste en implémentation et non publiée. Aucun workflow CI, support
Windows/macOS, tag, push ou publication n'est établi par ce rapport.
