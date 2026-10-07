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
