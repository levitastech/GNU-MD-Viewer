<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';

  import { APP_NAME, APP_VERSION, BOOTSTRAP_MESSAGE } from './lib/app/metadata';

  let Harness: Component | null = null;

  onMount(async () => {
    if (import.meta.env.VITE_L04_HARNESS === '1') {
      Harness = (await import('./lib/platform/L04WebviewHarness.svelte'))
        .default;
    }
  });
</script>

<svelte:head>
  <title>{APP_NAME}</title>
</svelte:head>

{#if Harness}
  <Harness />
{:else}
  <main class="shell" aria-labelledby="app-title">
    <section class="empty-state">
      <p class="eyebrow">Lecteur Markdown hors ligne</p>
      <h1 id="app-title">{APP_NAME}</h1>
      <p>{BOOTSTRAP_MESSAGE}</p>
      <p class="version">Version {APP_VERSION} — non publiée</p>
    </section>
  </main>
{/if}
