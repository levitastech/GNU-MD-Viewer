# Enrichisseurs valides et invalides

```mermaid
flowchart LR
  A[Ouverture] --> B[Lecture]
```

```mermaid
flowchart LR
  A[Ouverture] --> B[Lecture]
```

```mermaid
sequenceDiagram
  Alice->>Bob: Bonjour
```

```mermaid
flowchart LR
  X["<img src='https://example.invalid/pixel' onerror='alert(1)'>"]
  click X "javascript:alert(1)"
```

```mermaid
ceci n'est pas un diagramme
```

$E = mc^2$

$$
\frac{a}{b} + \sqrt{2}
$$

$\href{https://example.invalid}{lien}$
$\htmlClass{hostile}{x}$
$\def\boucle{\boucle}\boucle$
$\commandeInconnue{x}$

```langage-inconnu
<script>contenu de code</script>
```

Clôture malformée (le reste est du code) :

```text
bloc non fermé
