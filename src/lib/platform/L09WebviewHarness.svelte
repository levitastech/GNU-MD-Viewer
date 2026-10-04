<script lang="ts">
  import { convertFileSrc, invoke } from '@tauri-apps/api/core';
  import { onMount } from 'svelte';

  import { MarkdownRenderService } from '../markdown/engine';
  import {
    sanitizeDocumentHtml,
    replaceWithSafeHtml,
  } from '../rendering/sanitize';
  import { TauriDocumentService } from './tauri-document-service';
  import {
    RESOURCE_PROTOCOL,
    TauriResourceService,
  } from './tauri-resource-service';

  let status = 'Tranche verticale L09 en cours…';
  let preview: HTMLDivElement;

  const report = (checks: Record<string, boolean>, elapsedMs: number): void => {
    const summary = Object.entries(checks)
      .map(([name, passed]) => `${name}-${passed ? 'ok' : 'fail'}`)
      .join('_');
    const beacon = new Image();
    beacon.src = convertFileSrc(
      `l09-report-${summary}_render-ms-${Math.round(elapsedMs)}`,
      RESOURCE_PROTOCOL,
    );
  };

  onMount(async () => {
    const startedAt = performance.now();
    const documents = new TauriDocumentService();
    const resources = new TauriResourceService();
    const selection = await documents.selectDocument();
    if (!selection) throw new Error('Fixture L09 non sélectionnée.');
    const snapshot = await documents.openFirst(selection);
    const rendered = await new MarkdownRenderService().render(snapshot);
    const safe = sanitizeDocumentHtml(rendered.html);
    replaceWithSafeHtml(preview, safe);

    let dangerousProtocolRefused = false;
    try {
      await invoke('open_external_url', { target: 'javascript:alert(1)' });
    } catch {
      dangerousProtocolRefused = true;
    }

    const external = preview.querySelector<HTMLElement>(
      '[data-mdv-link-kind="external"]',
    );
    const checks = {
      document:
        snapshot.displayName === 'document.md' &&
        snapshot.text.includes('Fixture L09'),
      table: preview.querySelector('table') !== null,
      code:
        preview.querySelector('pre code')?.textContent?.includes('<script>') ===
          true && preview.querySelector('script') === null,
      hostile: preview.querySelector('[onclick], [src], [href]') === null,
      link:
        external?.dataset.mdvLink === 'https://example.test/guide' &&
        dangerousProtocolRefused,
    };
    await Promise.allSettled([
      resources.releaseSession(snapshot.sessionId),
      documents.releaseSession(snapshot.sessionId),
    ]);

    const allPassed = Object.values(checks).every(Boolean);
    status = allPassed
      ? 'L09 : lecture, rendu et filtrage natifs validés.'
      : `L09 en échec : ${JSON.stringify(checks)}`;
    report(checks, performance.now() - startedAt);
  });
</script>

<main class="shell" aria-labelledby="l09-title">
  <section class="empty-state">
    <p class="eyebrow">Harness natif exclu du build normal</p>
    <h1 id="l09-title">Validation L09</h1>
    <p>{status}</p>
    <div class="prototype-preview" bind:this={preview}></div>
  </section>
</main>
