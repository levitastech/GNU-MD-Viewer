# Contenu hostile, ne pas exécuter

<script>globalThis.__gnuMdvInjected = true</script>
<img src="https://example.invalid/track" onerror="alert(1)">
<iframe src="https://example.invalid/frame"></iframe>
<details open><summary>HTML brut</summary>texte</details>
<a href="javascript:alert(1)">script</a>

[JavaScript](javascript:alert%281%29)
[Casse](JaVaScRiPt:alert%281%29)
[Encodé](javascript%3Aalert%281%29)
[Données](data:text/html;base64,PHNjcmlwdD4=)
[Courriel](mailto:test@example.invalid)
[Fichier](file:///etc/passwd)
[Commande](shell:commande)
[HTTPS explicite](https://example.invalid/page?q=lecture#titre)
![Distant](https://example.invalid/track.png)
![Protocole relatif](//example.invalid/track.png)
![Données image](data:image/svg+xml;base64,PHN2Zz4=)
![Blob forgé](blob:https://example.invalid/identite)
[Origine ressemblant à l'application](https://app.attacker.invalid/document)
[Faux transport IPC](ipc:commande)
[Fausse ressource native](asset:hors-session.png)

Le texte HTML source doit rester inerte ; aucun attribut ne doit déclencher
une lecture, une commande ou une requête pendant parsing/insertion/enrichissement.
