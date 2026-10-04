<script lang="ts">
  import { APP_NAME, APP_VERSION, BOOTSTRAP_MESSAGE } from './lib/app/metadata';
</script>

<svelte:head>
  <title>{APP_NAME}</title>
</svelte:head>

<main class="shell" aria-labelledby="app-title">
  <section class="empty-state">
    <p class="eyebrow">Lecteur Markdown hors ligne</p>
    <h1 id="app-title">{APP_NAME}</h1>
    <p>{BOOTSTRAP_MESSAGE}</p>
    <p class="version">Version {APP_VERSION} — non publiée</p>
  </section>
</main>
