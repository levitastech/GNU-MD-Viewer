<script lang="ts">
  interface Props {
    title: string | null;
    busy: boolean;
    onopen: () => void;
    onclose: () => void;
  }

  let { title, busy, onopen, onclose }: Props = $props();
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
    <button type="button" class="primary" onclick={onopen} disabled={busy}>
      {busy ? 'Ouverture…' : 'Ouvrir'}
    </button>
    {#if title}
      <button type="button" onclick={onclose} disabled={busy}>Fermer</button>
    {/if}
  </div>
</header>
