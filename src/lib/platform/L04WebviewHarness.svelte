<script lang="ts">
  import { convertFileSrc } from '@tauri-apps/api/core';
  import 'katex/dist/katex.min.css';
  import { onMount } from 'svelte';

  import { toDocumentId, toSessionId } from '../contracts/document';
  import { renderKatex } from '../rendering/katex';
  import { renderMermaid } from '../rendering/mermaid';
  import {
    appendSafeHtml,
    asUnsanitizedHtml,
    sanitizeDocumentHtml,
  } from '../rendering/sanitize';
  import {
    RESOURCE_PROTOCOL,
    TauriResourceService,
  } from './tauri-resource-service';

  let status = 'Prototype L04 en cours…';
  let preview: HTMLDivElement;

  const loadImage = (url: string): Promise<boolean> =>
    new Promise((resolve) => {
      const image = new Image();
      const timer = window.setTimeout(() => resolve(false), 5_000);
      image.addEventListener('load', () => {
        window.clearTimeout(timer);
        resolve(image.naturalWidth > 0 && image.naturalHeight > 0);
      });
      image.addEventListener('error', () => {
        window.clearTimeout(timer);
        resolve(false);
      });
      image.src = url;
    });

  const report = (checks: Record<string, boolean>): void => {
    const summary = Object.entries(checks)
      .map(([name, passed]) => `${name}-${passed ? 'ok' : 'fail'}`)
      .join('_');
    const beacon = new Image();
    beacon.src = convertFileSrc(`harness-report-${summary}`, RESOURCE_PROTOCOL);
  };

  onMount(async () => {
    const service = new TauriResourceService();
    const safeHtml = sanitizeDocumentHtml(
      asUnsanitizedHtml(
        '<p>fragment sûr</p><img src="https://example.invalid/pixel.png" onerror="alert(1)"><scr' +
          'ipt>alert(1)</scr' +
          'ipt>',
      ),
    );
    appendSafeHtml(preview, safeHtml);
    const htmlSafe =
      preview.querySelector('script, [src], [onerror]') === null &&
      preview.textContent?.includes('fragment sûr') === true;

    const katex = renderKatex(String.raw`c = \sqrt{a^2+b^2}`, false);
    const mermaid = await renderMermaid(
      'flowchart LR\nA[Entrée] --> B[Sortie]',
      'l04-harness-mermaid',
    );
    const secondMermaid = await renderMermaid(
      'flowchart LR\nA[Entrée] --> B[Sortie]',
      'l04-harness-mermaid-second',
    );
    if (katex.status === 'rendered') appendSafeHtml(preview, katex.html);
    if (mermaid.status === 'rendered') appendSafeHtml(preview, mermaid.svg);

    const firstIds =
      mermaid.status === 'rendered'
        ? new Set(
            Array.from(
              new DOMParser()
                .parseFromString(mermaid.svg, 'image/svg+xml')
                .querySelectorAll('[id]'),
            ).map((element) => element.id),
          )
        : new Set<string>();
    const secondIds =
      secondMermaid.status === 'rendered'
        ? Array.from(
            new DOMParser()
              .parseFromString(secondMermaid.svg, 'image/svg+xml')
              .querySelectorAll('[id]'),
          ).map((element) => element.id)
        : [];
    const mermaidIdsDistinct = secondIds.every((id) => !firstIds.has(id));

    let pathRefused = false;
    try {
      await service.resolve({
        sessionId: toSessionId('l04-harness-session'),
        documentId: toDocumentId('l04-harness-document'),
        target: '../outside.png',
        expectedKind: 'image',
      });
    } catch {
      pathRefused = true;
    }

    const resource = await service.resolve({
      sessionId: toSessionId('l04-harness-session'),
      documentId: toDocumentId('l04-harness-document'),
      target: 'assets/allowed.png',
      expectedKind: 'image',
    });
    const imageAllowed = await loadImage(resource.url);
    await service.releaseSession(toSessionId('l04-harness-session'));
    const oldUrlRefused = !(await loadImage(`${resource.url}#after-revoke`));

    const checks = {
      html: htmlSafe,
      katex:
        katex.status === 'rendered' &&
        preview.querySelector('.katex math') !== null &&
        getComputedStyle(preview.querySelector('.katex-strut')!).height !==
          'auto',
      mermaid:
        mermaid.status === 'rendered' &&
        secondMermaid.status === 'rendered' &&
        preview.querySelector('svg') !== null &&
        mermaidIdsDistinct,
      image: imageAllowed,
      path: pathRefused,
      revoked: oldUrlRefused,
    };
    const allPassed = Object.values(checks).every(Boolean);
    status = allPassed
      ? 'Prototype L04 : tous les contrôles WebView sont passés.'
      : `Prototype L04 en échec : ${JSON.stringify(checks)} ${
          mermaid.status === 'fallback' ? mermaid.message : ''
        }`;
    if (mermaid.status === 'fallback') {
      report({ [`mermaid-${mermaid.message.slice(0, 120)}`]: false });
    }
    report(checks);
  });
</script>

<main class="shell" aria-labelledby="l04-title">
  <section class="empty-state">
    <p class="eyebrow">Harness natif exclu du build normal</p>
    <h1 id="l04-title">Validation L04</h1>
    <p>{status}</p>
    <div class="prototype-preview" bind:this={preview}></div>
  </section>
</main>
