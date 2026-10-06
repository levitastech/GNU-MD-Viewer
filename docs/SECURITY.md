# Modèle de sécurité

## Confiance et attaques envisagées

Un fichier Markdown local peut être contrôlé par un tiers. HTML, URLs, images, liens, Mermaid, KaTeX et chemins relatifs doivent être considérés comme des entrées non fiables. Les risques incluent injection de script, ouverture non voulue de ressources locales, fuite réseau, accès aux commandes Tauri et consommation excessive de ressources. Les préférences de l'utilisateur et le binaire ont un niveau de confiance distinct de celui du document.

## Contrôles à implémenter

1. Désactiver le HTML brut au niveau du parser ; filtrer l'HTML généré par DOMPurify avant insertion. Une fonction d'insertion DOM contrôlée et documentée doit être le seul point acceptant cet HTML.
2. Définir une liste autorisée de protocoles pour les liens et ressources ; rejeter notamment les schémas exécutables. Les liens HTTP/HTTPS partent, sur action explicite, vers le navigateur système. Aucun média distant ne se charge silencieusement ; mode hors ligne garanti.
3. Définir les permissions Tauri minimales et une CSP restrictive. Éviter toute capacité système exposée à un HTML de document. Ne pas introduire de serveur localhost pour contourner la résolution des ressources.
4. Résoudre les chemins relatifs par rapport au fichier Markdown ; décider explicitement quels fichiers liés et images sont accessibles. Canonicaliser et contrôler les chemins (traversées, symlinks, symlinks modifiés entre validation et ouverture, chemins Windows) au niveau du service d'accès aux fichiers, et éviter une permission globale à l'arborescence personnelle.
5. Examiner la configuration et les sorties Mermaid/KaTeX : intégration après sanitisation initiale, sanitisation de tout HTML ajouté si nécessaire, options de sécurité explicites. Ne jamais considérer leurs rendus SVG/HTML comme implicitement sûrs.
6. Borne de taille, traitement d'erreur et annulation pour documents ou diagrammes coûteux ; pas de blocage prolongé de l'interface. Un fichier récent n'autorise aucune lecture en arrière-plan non sollicitée.

Les décisions SG02–SG04/SG07/SG09 sont transcrites dans
[ADR 0003](adr/0003-lecture-et-ressources.md). L04 matérialise les premiers
contrats et le protocole de ressources dans [ADR 0004](adr/0004-contrats-sessions-et-prototypes-l04.md).
L05–L09 appliquent ces contrats à la première tranche verticale. La preuve Linux
ciblée ne qualifie ni P2/G2, ni Windows ou macOS. Une sanitisation seule ne
remplace ni politique URL ni permissions.

## Frontières et autorité — L02

Le document est non fiable ; parser/plugins/enrichisseurs peuvent être attaqués.
Le frontend orchestre la lecture mais ses arguments ne sont pas une autorisation.
Rust contrôle indépendamment entrée native, session/jeton, chemin, type, taille,
autorisation et ouverture effective. L'OS et le répertoire peuvent changer
pendant une opération : considérer symlinks/reparse points et substitutions
de parents. Une compromission du système entier n'est pas couverte par ce modèle.

Une racine appartient à une session et n'est pas persistée comme permission.
Ouverture native initiale : autorise le document sélectionné et son dossier.
Extension : dossier parent/projet choisi par action native, chemin affiché,
validation Rust, exclusion disque/home/partage global ; portée = session active.
Un lien hors racine produit un refus et peut inviter à l'action native séparée,
sans déclencher lui-même le sélecteur ni octroyer une permission. Fermeture ou
remplacement réussi révoque handles/URLs/racines/watchers/caches. Sur échec
candidat, libérer seulement ses ressources, conserver l'actif.

## Matrice des références

Résoudre depuis le fichier source, jamais CWD. Décoder les séquences URI une
seule fois selon une grammaire définie en L04/L10 ; refuser NUL, ambiguïtés,
query sur chemin local et encodages invalides. Traiter séparément nom encodé
`%23` et fragment `#` ; ne pas réinterpréter une cible après autorisation.
Les séparateurs encodés et traversées exigent un contrôle après résolution,
sans normalisation permissive ni comparaison de préfixes texte.

| Référence | Autorisation / action | Refus et message |
| --- | --- | --- |
| Ancre `#id` | navigation interne vers ID connu | « Section introuvable » |
| Markdown relatif / absolu local, suffixe autorisé | cible finale dans racine, fichier régulier, UTF-8 strict ; ouverture candidate | « Document absent », « Accès hors du dossier autorisé », « Encodage UTF-8 invalide » |
| `../assets` / parent | résolution correcte, accès seulement si racine explicitement étendue | « Accès hors du dossier autorisé » |
| Symlink interne | cible et ouverture réellement confinées | « Référence non autorisée » pour extérieur/substitution |
| UNC / chemin de périphérique Windows | refus au MVP, y compris entrée native | « Partages et chemins de périphériques non pris en charge » |
| Image locale PNG/JPEG/GIF/WebP | MIME/signature contrôlés, fichier confiné, limites avant décodage, URL opaque révocable | placeholder « Image absente, invalide ou trop volumineuse » |
| Image SVG locale / autre format | aucun chargement | placeholder « Format d'image non pris en charge » |
| SVG Mermaid généré | profil SVG filtré, IDs uniques, références internes contrôlées ; aucune autorité disque | source échappée + diagnostic |
| HTTP/HTTPS lien | cible validée par Rust ; action explicite ouvre navigateur système | « Adresse non autorisée » si cible invalide ; aucune navigation WebView |
| HTTP/HTTPS / `//` image ou média | aucun téléchargement/chargement | placeholder « Ressource distante désactivée » |
| Autre fichier local | aucune ouverture système générique | « Seuls les documents Markdown sont ouverts » |
| `javascript:`, `vbscript:`, `file:`, `data:`, `blob:`, `mailto:`, protocoles personnalisés | refus pour une référence de document | « Protocole non autorisé » |

Les URLs `blob:` ou du protocole ressource créées par l'application ne sont
pas des URLs acceptées depuis le document : registre de handles par session,
génération/validité et libération. La taille encodée ne suffit pas à valider
une image. Aucun chemin source ne devient directement un `src` actif.

Qualification L10 des chemins relatifs simples (6 octobre 2026) : la session
conserve le chemin du document courant, la racine initiale et son identité
device/inode sur Linux. A → B change la base et conserve la racine pour les
documents et leurs images. La sélection relative dépend de sa session source ;
sa fermeture retire les sélections encore en attente. Avant lecture, Rust
recontrôle le handle ouvert via `/proc/self/fd` et l'identité de la racine.
Les tests couvrent une substitution d'ancêtre conservant l'inode du fichier,
ainsi que la révocation pendant lecture. Les autres plateformes refusent ce
contrôle non qualifié. À cette étape, les cibles absolues, URI encodées,
fragments et queries sont refusés dans la commande relative ; les sorties
complètes L10 restent en qualification, sans changement de la policy cible.

## HTML et enrichissements

HTML brut désactivé, `breaks: false`, pas de typographie automatique. Ne pas
activer de contenu en sortie du parser avant le filtrage des références.
HTML produit : profil versionné excluant scripts, événements, iframes,
formulaires, `srcdoc`, IDs réservés UI et styles/URLs non contrôlés. L07 retire
tous `href`/`src` du fragment documentaire et ne conserve que les métadonnées
inertes `data-mdv-*` produites par le moteur. La cible est revalidée au clic et
dans Rust avant toute action externe. Tâches
en lecture seule. Insertion unique, après DOMPurify ; aucune réécriture regex
postérieure qui réintroduit du HTML non contrôlé.

Coloration : langues ciblées, sortie HTML sanitisée. Mermaid : `securityLevel`
strict, familles MVP limitées à flowchart/sequence/class/state/ER/gantt/pie,
configuration du document non autorisée à affaiblir les protections,
callbacks/clicks désactivés, labels HTML désactivés pour le premier prototype,
SVG filtré sans script/foreignObject/image distante/style URL. Préfixer les IDs
par session/génération/occurrence et valider les références `url(#id)` internes.
KaTeX : `trust: false`, macros utilisateur isolées par document, expansions
bornées ; HTML/MathML filtrés au point d'insertion. Profils précis, styles générés
nécessaires, familles Mermaid et syntaxes mathématiques à prouver en L04.
Au refus/malformation/dépassement, source échappée et message local au bloc.

## IPC, navigation et CSP

Commandes limitées aux services de document/ressource/préférence nécessaires ;
pas de read(path) générique, shell, HTTP ou gestionnaire de plugins. Capabilities
attachées seulement à la fenêtre locale principale, aucune origine distante.
Restreindre explicitement les commandes personnalisées et vérifier les arguments
dans Rust : les scopes filesystem d'un plugin ne protègent pas ces commandes.
Le document ne peut créer aucun contrôle privilégié ni fenêtre, faire naviguer
la WebView, ouvrir un navigateur sans clic applicatif ou invoquer une action
native via contenu HTML. Refuser nouvelles fenêtres/navigation arbitraire au
niveau natif, en plus du traitement des liens frontend.

CSP release L04 : `default-src 'self'`,
`style-src 'self' 'unsafe-inline'`, `font-src 'self'`,
`img-src 'self' data: gnu-mdv-resource: http://gnu-mdv-resource.localhost`,
`connect-src ipc: http://ipc.localhost`, `object-src 'none'`,
`frame-src 'none'`, `base-uri 'none'`, `form-action 'none'`.
Le style inline est limité aux sorties KaTeX contrôlées ; le HTML documentaire
et le SVG Mermaid perdent leurs styles. Aucun script inline, `unsafe-eval`,
wildcard HTTP(S), CDN ou serveur localhost applicatif. Les origines IPC Tauri
locales sont un transport natif, pas un backend HTTP. Les recettes release L04
et L09 vérifient le protocole puis le lecteur intégré sans connexion IP ; L23
rejoue l'observation sur le MVP complet.

Le dialogue V2 est détenu par Rust : `select_document` remet un jeton 256 bits
à usage unique et non le chemin sélectionné. `open_document` refuse les jetons
inconnus ou expirés et borne à 20 000 000 octets la lecture réelle, même si le
fichier croît après son `stat`. UTF-8 invalide, dossiers, fichiers spéciaux,
suffixes trompeurs et remplacement entre sélection et ouverture sont refusés.

`freezePrototype` reste `false` : Mermaid 12.1.0 échoue dans WebKitGTK lorsque
Tauri gèle `Object.prototype`. La version figée corrige les avis de prototype
pollution antérieurs ; configuration sécurisée, familles explicites,
sanitisation SVG, CSP et ACL constituent les compensations. Rejouer ce test et
l'audit à toute mise à jour Mermaid.

## Ressources, préférences et disponibilité

Documents ≤ 20 Mo, images encodées ≤ 10 Mo (unités décimales), lecture bornée
même si le fichier croît après stat. Images : 16 384 px par axe, 64 Mo RGBA
estimés, 32 ressources/64 Mo de cache par session. Code : 1 Mo/50 000 lignes ;
KaTeX : 16 384 caractères, 1 000 expansions et 20 em ; Mermaid : 65 536
caractères, 2 000 lignes et 500 arêtes probables. Deux travaux actifs et 32 en
file. Fixtures à la borne et +1 selon [ACCEPTANCE](ACCEPTANCE.md). Pas de travail lourd sans plafond préventif ;
annulation logique seule ne stoppe pas un calcul synchrone.

Préférences : JSON versionné validé, plafond proposé 64 Ko ; récents : 20 entrées,
historique de navigation de session : 50 entrées. Valeurs à transcrire/tester en
L18/L20 ; elles n'autorisent ni lecture automatique ni extension de racine.
Écritures atomiques de configuration seulement, jamais du document. Ne pas
exposer contenu/chemins personnels dans logs/rapports publics.

## Menaces et recettes reliées

Fixtures et étapes natives : [index](../tests/fixtures/README.md).

| Menace | Contrôle principal | Cas / preuve |
| --- | --- | --- |
| XSS et HTML/plugin actif | parser + profils DOMPurify + insertion unique + CSP | HT01/ER02 ; L07/L23 |
| Confusion d'origine / récupération IPC hors session | Tauri corrigé + origines exactes + ACL/Rust et isolation native | IPC01 ; L04/L23, avis et version dans L00_AUDIT |
| Fuite réseau, média distant, navigation | references avant DOM + CSP + garde native navigation | NW01/UR01 ; observation processus en L04/L23 |
| Lecture hors racine / confused deputy IPC | autorité Rust, handles, contrôle ouverture effective | PA01–PA03 ; barrière de substitution native L04/L23 |
| URL/handle périmé | génération/registre + révocation native | RV01 ; L04/L21 |
| DoS allocation/décodage/enrichisseurs | tailles + plafonds complexité + scheduler/fallback | PF01/ER03/IM01 et images aux bornes L04 |
| Session tardive / watcher multiple | dernière intention, activation après succès, nettoyage | OP01/OP02/WA01 ; L04/L21 |
| UTF-8 destructeur / écriture document | décodage strict, service lecture seule | EN01–EN03 ; hashes avant/après recette L05 |

Revue documentation officielle du 3 octobre 2026 :
[capabilities Tauri](https://v2.tauri.app/security/capabilities/),
[CSP Tauri](https://v2.tauri.app/security/csp/),
[DOMPurify](https://github.com/cure53/DOMPurify),
[Mermaid strict](https://mermaid.js.org/config/schema-docs/config-properties-securitylevel.html),
[KaTeX options](https://katex.org/docs/options.html).

## Jeux de validation

Fixtures HTML/script, protocoles dangereux, HTML généré par plugins, attributs et SVG, chemins relatifs et traversées, symlinks, noms Unicode, liens externes, images distantes, Mermaid/KaTeX malformés, gros documents. Tester les points d'entrée CLI, association, dialogue et dépôt de fichier avec le même comportement. Voir `.rules/TESTING_RULES.md`.

## Signalement

La procédure publique de signalement sera dans `SECURITY.md` à la racine une fois le canal privé activé.
