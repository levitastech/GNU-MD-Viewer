# Rapport V3 — L10 à L13

Release cible : `0.2.0`, en implémentation et non publiée.

## L10 — Ressources locales

Les images Markdown locales déclarées par le moteur sont remplacées, après
sanitisation, par une image dont l’URL ne contient qu’un jeton aléatoire du
protocole `gnu-mdv-resource`. Le DOM ne reçoit ni chemin local, ni autorisation
de lecture. Le service Rust existant vérifie session, document, confinement,
type, signature et budgets ; fermeture et remplacement de document révoquent
les jetons via `OpenCoordinator`.

La résolution est annulée logiquement lorsque le rendu devient périmé et un
échec conserve un placeholder explicite. Les images distantes restent bloquées.
Les liens Markdown vers un autre document sont autorisés uniquement depuis la
session active : Rust canonicalise une cible sous le dossier du document,
refuse les cibles ambiguës et toute sortie de racine avant une nouvelle
autorisation opaque.

Preuves ciblées à compléter au commit L10 : test DOM de l’hydratation, suites
frontend, tests Rust et build desktop normal sur Linux.
