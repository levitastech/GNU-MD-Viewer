# Critères d'acceptation — V0

Budgets du plan validés le 3 octobre 2026, transcrits sans modification.
Convention décimale et procédure : [benchmarks](../benchmarks/README.md).
Chaque recette doit indiquer scénario/fixture, commit ou diff exact, commande,
OS/WebView, attendu, résultat et raison d'une non-exécution.

| Scénario | Critère | Preuve attendue |
| --- | --- | --- |
| Ouverture warm prose/code léger ≤ 100 Ko | p95 ≤ 500 ms | 20 mesures jusqu'au frame utile |
| Démarrage cold avec fichier léger | p95 ≤ 1,5 s | 20 mesures cold-process ; caches OS explicités |
| 1 Mo prose/GFM modéré | p95 ≤ 1 s | parse + sanitisation + DOM + frame, enrichissements séparés |
| 5 Mo | rendu principal ≤ 3 s | toutes les mesures, état occupé et interactions disponibles |
| Mémoire idle / fichier léger | ≤ 150 Mo | PSS/privée de l'arbre complet |
| Mémoire fichier 5 Mo | ≤ 300 Mo | même corpus, images/enrichisseurs inclus |
| 50 cycles | pas de tendance croissante ; dérive stabilisée ≤ 20 Mo | série dans un même processus |
| Hot reload léger | coalescing environ 150–300 ms ; frame ≤ 1 s | save atomique/rafale inclus |
| Taille document | ≤ 20 Mo | borne incluse et +1 refusé avant copies/parse excessifs |
| Taille image encodée | ≤ 10 Mo | borne incluse et +1 refusé, puis limites décodage |

## Limites calibrées en L04

L04 fixe : image 16 384 px par axe et 64 000 000 octets RGBA estimés ; cache
32 images/64 000 000 octets par session ; code 1 000 000 octets/50 000 lignes ;
KaTeX 16 384 caractères, 1 000 expansions et 20 em ; Mermaid 65 536 caractères,
2 000 lignes et 500 arêtes probables ; deux travaux actifs et 32 en file.
Au dépassement : ressource remplacée par message ou source échappée pour bloc
enrichi, reste du document lisible. Pas d'allocation/décodage lourd avant
contrôle ; pas de timeout fictif autour d'un calcul synchrone. Les tests L04
couvrent bornes/+1 représentatives ; L14–L16 réemploient ces constantes et L24
mesure leur comportement sur la machine contractuelle.

## État des preuves

Corpus/générateur et policies préparés ; contrôles QA consignés dans
[V0_ENTRY_REPORT](V0_ENTRY_REPORT.md). Aucun benchmark, parser test, build ou
essai desktop n'est réalisé à V0. La VM Mint reste exploratoire ; son hôte
Windows 10 avec Radeon intégrée n'est pas actuellement démarré sous Linux natif.
L01 est clos sur le corpus, le protocole et le profil physique contractuel ;
les mesures Linux finales restent non exécutées et devront employer ce profil.
Le modèle/policies L02 est clos au niveau documentaire après revue des
références et menaces ; calibration des plafonds et preuves natives restent L04.
Le rapport [L04](L04_RISK_PROTOTYPES_REPORT.md) consigne la recette Linux finale
de confinement/révocation/sanitisation/absence de réseau qui ferme G1 sur la
matrice active. Elle ne remplace pas G4 ni les plateformes différées.

## P3/L15 — délimiteurs mathématiques

En ligne : `\(expression\)` sur une seule ligne. En bloc : lignes `$$` / `$$`
ou `\[` / `\]`, délimiteurs seuls sur leur ligne. Un dollar simple reste
Markdown ordinaire, y compris `$20`, `$x$` et les montants monétaires. Le code
inline/fencé n'est pas interprété comme mathématique. Une expression invalide
conserve sa source échappée avec message local ; les macros sont isolées par
expression (donc ne sont jamais héritées par un autre document).
