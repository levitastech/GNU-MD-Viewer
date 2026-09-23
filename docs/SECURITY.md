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

La politique exacte de ressources locales et des chemins hors du dossier d'origine nécessite un ADR avant implémentation. Une sanitisation seule ne remplace ni politique URL ni permissions minimales.

## Jeux de validation

Fixtures HTML/script, protocoles dangereux, HTML généré par plugins, attributs et SVG, chemins relatifs et traversées, symlinks, noms Unicode, liens externes, images distantes, Mermaid/KaTeX malformés, gros documents. Tester les points d'entrée CLI, association, dialogue et dépôt de fichier avec le même comportement. Voir `.rules/TESTING_RULES.md`.

## Signalement

La procédure publique de signalement sera dans `SECURITY.md` à la racine une fois le canal privé activé.
