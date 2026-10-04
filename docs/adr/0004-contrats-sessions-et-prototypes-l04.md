# ADR 0004 — Contrats de session et prototypes de risque L04

État : accepté pour la cible Linux active ; qualifications Windows/macOS différées.
Date : 4 octobre 2026.

## Contexte

L04 doit figer les frontières consommées par P2 sans transformer le frontend en
autorité fichier. Il doit aussi démontrer, dans la WebView réelle, la
sanitisation, le rendu KaTeX/Mermaid, une image locale autorisée, un chemin
refusé et la révocation. Le protocole `asset` global de Tauri repose sur des
globs statiques ; il ne représente pas directement la racine dynamique d'une
session ni sa révocation.

## Décision

Les contrats purs résident dans `src/lib/contracts/`. Le moteur Markdown futur
et ces contrats ne peuvent importer ni Svelte ni Tauri. `OpenCoordinator`
possède l'ordre des intentions : le candidat est lu et rendu avant activation,
une intention plus récente invalide le résultat tardif, un échec conserve
l'actif, puis les ressources de l'ancienne session sont révoquées après
activation réussie.

Les images utilisent le protocole applicatif `gnu-mdv-resource`. Le frontend
envoie `sessionId`, `documentId`, cible relative et type attendu ; il ne donne
aucun chemin autorisé. Rust vérifie la session, le document, la cible, le fichier
effectivement ouvert, la signature, les dimensions et les budgets, puis met les
octets bornés en cache sous un jeton aléatoire de 256 bits. L'URL ne contient
pas de chemin. Libérer une session supprime tous ses jetons. Le handler refuse
toute WebView autre que `main`, toute méthode autre que GET, les query strings,
les jetons mal formés et les jetons révoqués.

Sur Linux, la preuve L04 ouvre d'abord le fichier puis résout
`/proc/self/fd/<fd>` : le contrôle porte donc sur le handle réellement ouvert.
Une substitution de symlink entre ouverture et contrôle ne change pas le
fichier lu. Les autres plateformes refusent actuellement cette opération avec
`unsupported_platform` ; L10 doit fournir l'équivalent par handle natif et L25
le qualifier. Aucun support Windows/macOS n'est déduit de cette décision.

Les commandes applicatives `resolve_resource` et `release_resource_session`
reçoivent des permissions générées par `tauri-build`, attachées seulement à la
capability locale `main-reader`. Chaque commande recontrôle en Rust le label
`main`. Aucune origine distante, commande de lecture générique ou scope disque
n'est activé.

Trois profils DOMPurify séparés sont retenus : HTML documentaire sans URL ni
style actif, HTML/MathML KaTeX avec `trust: false`, et SVG Mermaid passif sans
`style`, `foreignObject`, image ou lien. L'insertion DOM accepte uniquement le
type `SafeHtml` via `appendSafeHtml`. Mermaid est chargé à la demande en mode
strict ; seules les familles flowchart, sequence, class, state, ER, gantt et
pie sont admises au MVP. KaTeX accepte son sous-ensemble TeX 0.19, sans macros
globales ni commandes de confiance.

`freezePrototype` est désactivé. La recette WebKitGTK 2.52.6 a reproduit avec
Mermaid 12.1.0 un échec systématique quand il est activé (`Attempted to assign
to readonly property`). Tauri le désactive aussi par défaut et documente
l'incompatibilité possible des bibliothèques avec ce durcissement. La
compensation est explicite : Mermaid corrigé et verrouillé, familles bornées,
configuration sécurisée non modifiable par le document, sortie SVG réduite,
CSP, ACL et validation Rust. Toute mise à jour Mermaid doit rejouer ce prototype
et les avis de prototype pollution.

La CSP n'autorise l'origine du protocole que dans `img-src`. `style-src`
contient `'unsafe-inline'` parce que le HTML KaTeX contrôlé utilise des styles
calculés à l'exécution ; HTML Markdown et SVG Mermaid perdent leurs balises et
attributs `style` avant insertion. Aucun script inline, `unsafe-eval`, CDN,
wildcard réseau ou serveur HTTP applicatif n'est autorisé.

## Conséquences

- L05 crée les sessions document ; L10 étend le service de ressources sans
  changer son contrat frontend.
- Le harness `l04-harness` est une feature Rust et un chunk Vite conditionnel ;
  le build normal ne l'active ni ne l'embarque.
- La qualification Linux prouve la stratégie de handle et de révocation sur la
  matrice active, pas son équivalent Windows/macOS.
- Le cache est limité à 32 ressources et 64 Mo par session. Une image peut faire
  au plus 10 Mo encodés, 16 384 px par axe et 64 Mo RGBA estimés.
- Une annulation retire un travail en file ou ignore son résultat ; elle ne
  prétend pas interrompre un calcul synchrone déjà commencé. Les précontrôles
  empêchent de lancer un bloc manifestement hors budget.

## Entrées OS identifiées

Toutes les entrées convergeront vers la même file Rust avant UI prête. Sur
macOS, Tauri expose `RunEvent::Opened { urls }` pour les URLs/fichiers transmis
par Launch Services ; la file conserve l'ordre et applique « premier chemin,
autres signalés ». Linux/Windows reçoivent les arguments CLI ou ceux d'une
seconde instance ; le plugin single-instance et les associations restent L19.
Les configurations de paquet et recettes installées ne sont pas anticipées ici.
