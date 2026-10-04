# Rapport V2 — L05 à L09

Date : 4 octobre 2026. Base : `dev` à `852b279`, diff de travail non committé.
Release cible : `0.2.0`, en implémentation et non publiée. Portée : première
vague de P2 uniquement ; L10–L13 et G2 restent ouverts.

## Résultat par lot

| Lot | Résultat démontré sur la matrice Linux active |
| --- | --- |
| L05 | Dialogue Rust, sélection opaque à usage unique, quatre suffixes Markdown, fichier ordinaire, lecture réelle bornée à 20 000 000 octets, UTF-8/BOM/CRLF, sessions et erreurs typées. Absence, refus d'accès, dossier, suffixe trompeur, UTF-8 invalide, dépassement, changement pendant lecture, entrée spéciale, jeton forgé/réutilisé et invariance des octets source sont testés. |
| L06 | Moteur markdown-it autonome, HTML brut désactivé, `breaks: false`, `typographer: false`, autolinks, tables et barré ciblés. Titres Unicode uniques/déterministes, déclarations d'images, liens inertes et diagnostics produits sans import Svelte/Tauri. |
| L07 | Profil documentaire DOMPurify sans attribut URL, style actif, ID arbitraire, formulaire, SVG/MathML ni contrôle applicatif. Seules les métadonnées inertes `data-mdv-*` du moteur traversent le profil ; protocoles encodés, URL sans schéma et clobbering sont couverts. |
| L08 | Coque Svelte avec barre d'action, état vide/chargement/prêt, erreur conservant le dernier rendu valide, petite fenêtre et styles de lecture. L'orchestrateur possède la session ; les composants n'importent aucun service filesystem. |
| L09 | Dialogue → lecture Rust → moteur → sanitisation → insertion WebView exécuté sur une fixture réelle. La dernière intention et la révocation restent couvertes par l'automate L04 ; le harness vérifie table, code échappé, HTML hostile, lien externe inerte et refus d'un protocole dangereux. |

## Contrats de sécurité appliqués

Le chemin choisi ne traverse jamais IPC vers le DOM. `select_document` crée un
jeton aléatoire de 256 bits dans un registre borné ; `open_document` le consomme
une seule fois et compare l'identité du fichier sélectionné à celle du handle
ouvert. La lecture utilise `take(limite + 1)` et recontrôle les métadonnées après
lecture. Une ouverture échouée ne remplace pas la session active.

Le moteur remplace les liens et images par des sorties sans `href`/`src`.
DOMPurify 3.4.16 reçoit une chaîne et n'utilise pas `IN_PLACE` ; cette version est
la version corrigée des deux avis DOMPurify publiés le 23 septembre 2026. Un lien
HTTP(S) nécessite un clic, une confirmation UI et une revalidation `url` côté
Rust avant l'appel interne au plugin opener. Les identifiants dans l'URL et tous
les autres schémas sont refusés.

## Revalidation des APIs et versions

- Tauri 2 : [dialog](https://v2.tauri.app/plugin/dialog/),
  [opener](https://v2.tauri.app/plugin/opener/),
  [commandes et état](https://v2.tauri.app/develop/calling-rust/),
  [runtime authority](https://v2.tauri.app/security/runtime-authority/).
- markdown-it 15.0.2 : [options](https://markdown-it.github.io/markdown-it/interfaces/MarkdownItOptions.html)
  et [règles de renderer](https://github.com/markdown-it/markdown-it/blob/master/docs/examples/renderer_rules.md).
- DOMPurify 3.4.16 : [configuration et hooks](https://github.com/cure53/DOMPurify),
  [avis GHSA-p98j-92pf-mc4p](https://github.com/cure53/DOMPurify/security/advisories/GHSA-p98j-92pf-mc4p)
  et [GHSA-6688-9rhm-gjv2](https://github.com/cure53/DOMPurify/security/advisories/GHSA-6688-9rhm-gjv2).

Versions directes ajoutées et verrouillées : `tauri-plugin-dialog` 2.8.1,
`tauri-plugin-opener` 2.7.0 et `url` 2.5.8. Les deux commandes de plugin ne sont
pas accordées à la WebView ; seules les commandes applicatives revalidées côté
Rust figurent dans la capability `main-reader`.

## Preuves locales

Configuration : Linux Mint 22.3 x86_64, X11 `:0`, WebKitGTK 2.52.6, VM KVM
exploratoire 6 vCPU / environ 6,19 Go de RAM. Node 24.18.0, pnpm 12.8.1 et
Rust/Cargo 1.91.1 ont été sélectionnés explicitement dans le PATH.

| Commande / scénario | Résultat |
| --- | --- |
| `pnpm test` | 8 fichiers, 25 tests verts. |
| `pnpm format:check`, `pnpm lint`, `pnpm check` | verts ; 0 erreur et 0 avertissement Svelte. |
| `pnpm build` | vert ; bundle normal sans chunk L09, JS principal 172,00 kB brut / 69,33 kB gzip. |
| `cargo test --release` | vert sur `gnu-mdv` 0.2.0 ; 19 tests, 0 échec. |
| `cargo fmt --check`, Clippy release tous targets/features avec `-D warnings` | verts. |
| `pnpm audit` | aucune vulnérabilité connue. |
| `pnpm desktop:compile` normal | vert après le harness ; binaire release normal reconstruit sans feature de test. |
| lancement normal `timeout 12s` | processus vivant, arrêt 124 attendu ; avertissements EGL/VMware de la VM, sans crash. |
| `tests/integration/run_l09_harness.sh` | marqueur `document/table/code/hostile/link` entièrement vert ; 110 ms jusqu'au rapport WebView sur la petite fixture ; 156 916 KiB de RSS maximal selon `/usr/bin/time`; aucune connexion AF_INET/AF_INET6 sous `strace`. |

Les 110 ms et 156 916 KiB constituent une baseline exploratoire L09, pas la
qualification des budgets : petite fixture, RSS maximal plutôt que PSS/privée,
VM non contractuelle et instrumentation. Les campagnes corpus et mesures
comparables restent L24.

## Non exécuté et limites

- Windows et macOS : aucune machine/récette disponible ; explicitement différés
  selon SG05. Aucun support de plateforme n'est annoncé.
- Ouverture réelle d'une URL autorisée : non exécutée pour ne pas lancer un
  navigateur externe pendant le harness ; confirmation UI, cible inerte,
  double validation et refus natif des schémas dangereux sont vérifiés.
- `cargo-audit` : non exécuté, outil absent du PATH ; `pnpm audit` est vert.
- Images locales, navigation Markdown relative, TOC, thèmes/zoom et extensions
  GFM avancées : L10–L13, volontairement hors V2.
- Aucun commit, push, tag, paquet, publication ou annonce de support.

## Conclusion

L05–L09 satisfont leurs sorties sur la matrice Linux active, avec reports
Windows/macOS explicites. V2 est close ; P2 reste `doing`, G2 reste `todo`
et la prochaine action topologique est L10.
