# ADR 0003 — Lecture confinée et ressources sans réseau

État : décisions SG02–SG04/SG07/SG09 transcrites ; mécanisme à prouver en L04.
Date : 2026-10-03.

## Décision

HTML source désactivé. Racine initiale = dossier du document explicitement ouvert.
Seule une action native explicite peut étendre cette racine au parent/projet pour
la session courante. Aucun document, récent ou préférence ne donne cette autorité.
Rust possède l'autorisation, les handles et la révocation. Résolution depuis le
document, contrôle du chemin final puis ouverture résistante aux substitutions
de liens symboliques. Aucun accès global disque/home.

Les chemins relatifs et absolus locaux sont admissibles seulement s'ils désignent
une cible dans la racine autorisée. UNC et chemins de périphériques Windows sont
refusés au MVP ; une entrée native UNC échoue aussi, sans lecture de partage.
Une extension de racine ne peut accorder un partage ou une racine globale.
Images raster PNG/JPEG/GIF/WebP seulement dans le premier profil ; SVG local
refusé comme image, distinct du SVG Mermaid produit puis filtré. Les autres
formats ne sont pas chargés : placeholder explicite. Cette policy précise les
cas ouverts du plan sans annoncer la qualification des décodeurs.

HTTP/HTTPS : lien vers navigateur système sur action explicite uniquement,
image distante remplacée par placeholder sans requête. Autres fichiers et
protocoles refusés. Aucun client de téléchargement, serveur HTTP ou commande
shell générique. UTF-8 strict avec BOM, LF/CRLF ; frontmatter = Markdown ordinaire.
Un échec conserve la session active et ne modifie jamais le document.

## Conséquences et preuves attendues

[SECURITY](../SECURITY.md) fixe matrice, menaces, messages et responsabilités ;
[ACCEPTANCE](../ACCEPTANCE.md) les budgets. Le protocole natif asset à scope
dynamique ou un handler dédié sera choisi seulement après preuve L04 de
confinement à l'ouverture, MIME, révocation et absence de réseau. La policy
ne prouve aucun de ces mécanismes. Les plafonds encore ouverts sont calibrés en
L04 avant G1 ; aucune ouverture illimitée en attendant.
