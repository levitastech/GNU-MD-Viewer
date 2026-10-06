<script lang="ts">
  interface Props {
    title: string | null;
    busy: boolean;
    onopen: () => void;
    onclose: () => void;
    onzoom: (delta: number) => void;
    ontheme: () => void;
  }

  let { title, busy, onopen, onclose, onzoom, ontheme }: Props = $props();
</script>

<header class="action-bar">
  <div class="brand" aria-label="GNU-MD Viewer">
    <span class="brand-mark" aria-hidden="true">M↓</span>
    <span>GNU-MD Viewer</span>
  </div>
  <p class="document-name" title={title ?? undefined}>
    {title ?? 'Aucun document ouvert'}
  </p>
  <div class="actions">
    <button type="button" onclick={ontheme} title="Changer de thème"
      >Thème</button
    >
    <button
      type="button"
      onclick={() => onzoom(-10)}
      aria-label="Réduire le zoom">A−</button
    >
    <button
      type="button"
      onclick={() => onzoom(10)}
      aria-label="Augmenter le zoom">A+</button
    >
    <button type="button" class="primary" onclick={onopen} disabled={busy}>
      {busy ? 'Ouverture…' : 'Ouvrir'}
    </button>
    {#if title}
      <button type="button" onclick={onclose} disabled={busy}>Fermer</button>
    {/if}
  </div>
</header>
