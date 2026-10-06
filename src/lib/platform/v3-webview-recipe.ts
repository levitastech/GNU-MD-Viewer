import { convertFileSrc } from '@tauri-apps/api/core';
import { tick } from 'svelte';
import { RESOURCE_PROTOCOL } from './tauri-resource-service';

// Instrument the real application, not a second rendering pipeline.
// Only imported by a VITE_V3_HARNESS build; uses the L09 native fixture hook.
export const runV3Recipe = async (): Promise<void> => {
  const checks: Record<string, boolean> = {};
  const started = performance.now();
  const requireElement = <T extends HTMLElement>(selector: string): T => {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Élément absent : ${selector}`);
    return element;
  };
  const waitFor = async (predicate: () => boolean): Promise<void> => {
    const deadline = performance.now() + 6000;
    while (!predicate()) {
      if (performance.now() > deadline)
        throw new Error('Délai de recette dépassé');
      await new Promise((resolve) => window.setTimeout(resolve, 25));
    }
    await tick();
  };
  const clickLink = (target: string): void => {
    const link = Array.from(
      document.querySelectorAll<HTMLElement>('[data-mdv-link]'),
    ).find((element) => element.dataset.mdvLink === target);
    if (!link) throw new Error('Lien de recette absent');
    link.click();
  };
  const hasImage = (): boolean => {
    const image = document.querySelector<HTMLImageElement>('.document img');
    return !!image?.complete && image.naturalWidth > 0;
  };
  try {
    requireElement<HTMLButtonElement>('.actions .primary').click();
    await waitFor(() => document.querySelector('.document table') !== null);
    await waitFor(hasImage);
    checks.image = hasImage();
    const article = requireElement('.document');
    checks.hostile =
      article.querySelector('script, input, [href], [onerror], [onclick]') ===
      null;
    checks.tasks =
      article.querySelectorAll('.mdv-task[aria-label]').length === 2;
    clickLink('#navigation');
    await tick();
    checks.anchor =
      (document.activeElement as HTMLElement)?.dataset.mdvHeading ===
      'mdv-heading-navigation';
    clickLink('#mdv-note-1');
    await tick();
    checks.note =
      (document.activeElement as HTMLElement)?.dataset.mdvAnchor ===
      'mdv-note-1';
    clickLink('#mdv-note-ref-1-0');
    await tick();
    checks.back =
      (document.activeElement as HTMLElement)?.dataset.mdvAnchor ===
      'mdv-note-ref-1-0';
    const toggle = requireElement<HTMLButtonElement>(
      '.table-of-contents > button',
    );
    toggle.click();
    await tick();
    checks.hide = document.querySelector('.table-of-contents ol') === null;
    toggle.click();
    await tick();
    requireElement<HTMLButtonElement>('.table-of-contents li button').click();
    await tick();
    checks.toc =
      document.querySelector('.table-of-contents [aria-current="location"]') !==
        null &&
      (document.activeElement as HTMLElement)?.dataset.mdvHeading !== undefined;
    const theme = requireElement<HTMLSelectElement>('.actions select');
    theme.value = 'dark';
    theme.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    checks.dark =
      document.querySelector('.viewer-shell.theme-dark') !== null &&
      getComputedStyle(theme).backgroundColor !== 'rgb(255, 255, 255)';
    theme.value = 'light';
    theme.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    checks.light = document.querySelector('.viewer-shell.theme-dark') === null;
    const sourceDom = article.innerHTML;
    requireElement<HTMLButtonElement>(
      '[aria-label="Augmenter le zoom"]',
    ).click();
    await tick();
    checks.zoom =
      requireElement('.viewer-shell').style.getPropertyValue(
        '--reader-zoom',
      ) === '110%' && article.innerHTML === sourceDom;
    requireElement<HTMLButtonElement>(
      '[aria-label="Réinitialiser le zoom à 100 %"]',
    ).click();
    await tick();
    checks.reset =
      requireElement('.viewer-shell').style.getPropertyValue(
        '--reader-zoom',
      ) === '100%';
    clickLink('missing.md');
    await waitFor(() => document.querySelector('.error-notice') !== null);
    checks.failure =
      document.querySelector('.document') === article && hasImage();
    clickLink('sub/guide.md');
    await waitFor(
      () =>
        document.querySelector('.document h1')?.textContent === 'Document B',
    );
    await waitFor(hasImage);
    checks.relative = hasImage();
    clickLink('../document.md');
    await waitFor(() => document.querySelector('.document table') !== null);
    await waitFor(hasImage);
    checks.return = hasImage();
    // The parser normalizes Unicode URI bytes, but does not decode the path.
    const encodedLink = Array.from(
      document.querySelectorAll<HTMLElement>('[data-mdv-link]'),
    ).find((element) => element.textContent === 'Nom et fragment encodés');
    if (!encodedLink) throw new Error('Lien encodé absent');
    encodedLink.click();
    await waitFor(
      () =>
        document.querySelector('.document h1')?.textContent === 'Chemin encodé',
    );
    await waitFor(hasImage);
    checks.encoded = hasImage();
    checks.fragment =
      (document.activeElement as HTMLElement)?.dataset.mdvHeading ===
      'mdv-heading-section-été';
    clickLink('../document.md');
    await waitFor(() => document.querySelector('.document table') !== null);
    await waitFor(hasImage);
    clickLink('../commonmark.md');
    await waitFor(() => document.querySelector('.error-notice') !== null);
    checks.outside = document.querySelector('.document table') !== null;
    const previousUrl = requireElement<HTMLImageElement>('.document img').src;
    requireElement<HTMLButtonElement>(
      '[aria-label="Étendre le dossier autorisé"]',
    ).click();
    await waitFor(() => {
      const image = document.querySelector<HTMLImageElement>('.document img');
      return !!image && image.src !== previousUrl && hasImage();
    });
    checks.root = document.querySelector('.error-notice') === null;
    clickLink('../commonmark.md');
    await waitFor(
      () =>
        document.querySelector('.document h1')?.textContent ===
        'Lecture simple',
    );
    checks.parent = document.querySelector('.error-notice') === null;
    // Reopen A using the explicit native fixture selection for revocation checks.
    requireElement<HTMLButtonElement>('.actions .primary').click();
    await waitFor(() => document.querySelector('.document table') !== null);
    await waitFor(hasImage);
    const oldUrl = requireElement<HTMLImageElement>('.document img').src;
    const close = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.actions button'),
    ).find((button) => button.textContent?.trim() === 'Fermer');
    if (!close) throw new Error('Bouton fermer absent');
    close.click();
    await waitFor(() => document.querySelector('.document') === null);
    checks.revoked = await new Promise<boolean>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(false);
      image.onerror = () => resolve(true);
      image.src = oldUrl.replace(/\/([^/]+)$/, '/l09-probe-$1');
      window.setTimeout(() => resolve(false), 2000);
    });
  } catch {
    // Do not log document text or paths, even on failure.
    checks.completed = false;
  }
  const summary = Object.entries(checks)
    .map(([name, ok]) => `${name}-${ok ? 'ok' : 'fail'}`)
    .join('_');
  const beacon = new Image();
  beacon.src = convertFileSrc(
    `l09-report-v3_${summary}_render-ms-${Math.round(performance.now() - started)}`,
    RESOURCE_PROTOCOL,
  );
};
