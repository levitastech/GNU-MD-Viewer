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

## Limites à fermer avant G1

L04 possède la calibration des dimensions/pixels/octets décodés d'image,
taille et complexité de code, KaTeX et Mermaid, nombre de travaux concurrents
et annulation effective. L01 fournit les cas adverses ; compléter à chaque
borne exacte et +1 dès fixation. Au dépassement : ressource remplacée par
message ou source échappée pour bloc enrichi, reste du document lisible.
Pas d'allocation/décodage lourd avant contrôle ; pas de timeout fictif autour
d'un calcul synchrone. G1 reste fermé tant que ces valeurs et fallbacks ne sont
pas prouvés. Ces paramètres ouverts ne sont pas des limites implémentées.

## État des preuves

Corpus/générateur et policies préparés ; contrôles QA consignés dans
[V0_ENTRY_REPORT](V0_ENTRY_REPORT.md). Aucun benchmark, parser test, build ou
essai desktop n'est réalisé à V0. La VM Mint reste exploratoire ; son hôte
Windows 10 avec Radeon intégrée n'est pas actuellement démarré sous Linux natif.
L01 est clos sur le corpus, le protocole et le profil physique contractuel ;
les mesures Linux finales restent non exécutées et devront employer ce profil.
Le modèle/policies L02 est clos au niveau documentaire après revue des
références et menaces ; calibration des plafonds et preuves natives restent L04.
Les recettes de confinement/révocation/absence de réseau sont des exigences
de G1/G4, jamais déduites de la présence de fixtures ou d'une CSP écrite.
