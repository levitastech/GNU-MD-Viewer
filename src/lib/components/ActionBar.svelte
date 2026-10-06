<script lang="ts">
  import type { ThemeMode } from '../state/reading-preferences';
  interface Props {
    title: string | null;
    busy: boolean;
    onopen: () => void;
    onclose: () => void;
    onzoom: (delta: number) => void;
    ontheme: (theme: ThemeMode) => void;
    onresetzoom: () => void;
    theme: ThemeMode;
    zoom: number;
  }

  let {
    title,
    busy,
    onopen,
    onclose,
    onzoom,
    ontheme,
    onresetzoom,
    theme,
    zoom,
  }: Props = $props();
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
    <select
      aria-label="Thème de lecture"
      value={theme}
      onchange={(event) => ontheme(event.currentTarget.value as ThemeMode)}
    >
      <option value="system">Système</option>
      <option value="light">Clair</option>
      <option value="dark">Sombre</option>
    </select>
    <button
      type="button"
      onclick={() => onzoom(-10)}
      disabled={zoom <= 80}
      aria-label="Réduire le zoom">A−</button
    >
    <button
      type="button"
      onclick={onresetzoom}
      aria-label="Réinitialiser le zoom à 100 %">{zoom} %</button
    >
    <button
      type="button"
      onclick={() => onzoom(10)}
      disabled={zoom >= 200}
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
