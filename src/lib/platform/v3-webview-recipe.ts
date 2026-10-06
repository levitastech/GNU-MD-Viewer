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
  const signal = (stage: string): void => {
    const beacon = new Image();
    beacon.src = convertFileSrc(
      `l09-report-v3-stage-${stage}`,
      RESOURCE_PROTOCOL,
    );
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
    const darkCode = getComputedStyle(
      requireElement('.document pre'),
    ).backgroundColor;
    const darkAlert = getComputedStyle(
      requireElement('.markdown-alert'),
    ).backgroundColor;
    theme.value = 'light';
    theme.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    checks.light = document.querySelector('.viewer-shell.theme-dark') === null;
    checks.palette =
      getComputedStyle(requireElement('.document pre')).backgroundColor !==
        darkCode &&
      getComputedStyle(requireElement('.markdown-alert')).backgroundColor !==
        darkAlert &&
      getComputedStyle(requireElement('.viewer-shell'))
        .getPropertyValue('--mdv-diagram-background')
        .trim() === '#fff';
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
    // L11: actual WebView layout, delegated keyboard events and selection.
    clickLink('headings.md');
    await waitFor(
      () =>
        document.querySelector('.document h1')?.textContent ===
        'Navigation L11',
    );
    const headings = Array.from(
      document.querySelectorAll<HTMLElement>('[data-mdv-heading]'),
    );
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>(
        '.table-of-contents li button',
      ),
    );
    const location = window.location.href;
    checks.headings =
      headings.length === buttons.length &&
      new Set(headings.map((heading) => heading.dataset.mdvHeading)).size ===
        headings.length &&
      new Set(headings.map((heading) => heading.tagName)).size === 6;
    const decomposed = Array.from(
      document.querySelectorAll<HTMLElement>('[data-mdv-link]'),
    ).find((link) => link.textContent === 'Ancre décomposée');
    if (!decomposed) throw new Error('Ancre de recette absente');
    decomposed.focus();
    decomposed.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    await tick();
    checks.keyboard =
      (document.activeElement as HTMLElement)?.dataset.mdvHeading ===
      'mdv-heading-été-عربي';
    clickLink('#mdv-note-1');
    await tick();
    checks.namespace =
      (document.activeElement as HTMLElement)?.dataset.mdvAnchor ===
      'mdv-note-1';
    clickLink('#introuvable');
    await tick();
    checks.missing =
      document.querySelector('.document h1')?.textContent ===
        'Navigation L11' &&
      window.location.href === location &&
      document.querySelector('[role="status"]')?.textContent ===
        'Section introuvable.';
    buttons[buttons.length - 1]!.click();
    await tick();
    checks.tocfocus =
      document.activeElement === headings[headings.length - 1] &&
      window.location.href === location &&
      window.scrollY === 0;
    const reader = requireElement('.reader');
    const longHeading = headings.find(
      (heading) => heading.textContent === 'Section longue',
    );
    if (!longHeading) throw new Error('Section de recette absente');
    const paragraph = longHeading.nextElementSibling!;
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const selected = selection?.toString();
    const focused = document.activeElement;
    reader.scrollTop +=
      longHeading.getBoundingClientRect().top -
      reader.getBoundingClientRect().top +
      100;
    await waitFor(
      () =>
        document.querySelector('.table-of-contents [aria-current="location"]')
          ?.textContent === 'Section longue',
    );
    checks.scroll =
      selected === selection?.toString() && document.activeElement === focused;
    reader.scrollTop = reader.scrollHeight;
    await waitFor(
      () =>
        document.querySelector('.table-of-contents [aria-current="location"]')
          ?.textContent === 'Section finale',
    );
    reader.scrollTop = 0;
    await waitFor(
      () =>
        document.querySelector('.table-of-contents [aria-current="location"]')
          ?.textContent === 'Navigation L11',
    );
    checks.jumps = true;
    clickLink('no-headings.md');
    await waitFor(
      () =>
        document
          .querySelector('.document')
          ?.textContent?.includes('Document sans titre.') === true,
    );
    checks.sectionreset = document.querySelector('.table-of-contents') === null;
    clickLink('document.md');
    await waitFor(() => document.querySelector('.document table') !== null);
    await waitFor(hasImage);
    await waitFor(
      () =>
        document.querySelector(
          '.table-of-contents [aria-current="location"]',
        ) !== null,
    );
    checks.sectionreset &&= !document
      .querySelector('.table-of-contents')
      ?.textContent?.includes('Navigation L11');
    // L12: the shell drives the real desktop color scheme and window size.
    theme.value = 'system';
    theme.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    const systemQuery = window.matchMedia('(prefers-color-scheme: dark)');
    signal('theme-ready');
    await waitFor(
      () =>
        systemQuery.matches &&
        document.querySelector('.viewer-shell.theme-dark') !== null,
    );
    checks.systemdark = true;
    signal('dark-observed');
    await waitFor(
      () =>
        !systemQuery.matches &&
        document.querySelector('.viewer-shell.theme-dark') === null,
    );
    checks.systemlight = true;
    theme.value = 'light';
    theme.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    signal('light-observed');
    const decrease = requireElement<HTMLButtonElement>(
      '[aria-label="Réduire le zoom"]',
    );
    const increase = requireElement<HTMLButtonElement>(
      '[aria-label="Augmenter le zoom"]',
    );
    const baselineDom = requireElement('.document').innerHTML;
    for (let index = 0; index < 4; index += 1) decrease.click();
    await tick();
    checks.zoommin =
      requireElement('.viewer-shell').style.getPropertyValue(
        '--reader-zoom',
      ) === '80%' && decrease.disabled;
    for (let index = 0; index < 14; index += 1) increase.click();
    await tick();
    checks.zoommax =
      requireElement('.viewer-shell').style.getPropertyValue(
        '--reader-zoom',
      ) === '200%' && increase.disabled;
    requireElement<HTMLButtonElement>(
      '[aria-label="Réinitialiser le zoom à 100 %"]',
    ).click();
    await tick();
    checks.zoomstable =
      requireElement('.document').innerHTML === baselineDom &&
      requireElement('.viewer-shell').style.getPropertyValue(
        '--reader-zoom',
      ) === '100%';
    clickLink('styles.md');
    await waitFor(
      () =>
        document.querySelector('.document h1')?.textContent === 'Styles L12',
    );
    signal('size-ready');
    await waitFor(() => window.innerWidth <= 660 && window.innerHeight <= 510);
    signal(`scale-${window.devicePixelRatio}`);
    const styled = requireElement('.document');
    const code = requireElement<HTMLElement>('.document pre');
    const table = requireElement<HTMLElement>('.document table');
    const rtl = requireElement<HTMLElement>('.document p');
    checks.narrowpage =
      document.documentElement.scrollWidth <= window.innerWidth + 1;
    checks.narrowarticle =
      styled.getBoundingClientRect().right <= window.innerWidth + 1;
    checks.narrowcode = code.scrollWidth > code.clientWidth;
    checks.narrowtable =
      table.scrollWidth > table.clientWidth ||
      Array.from(table.querySelectorAll<HTMLElement>('th, td')).every(
        (cell) => cell.scrollWidth <= cell.clientWidth + 1,
      );
    checks.narrow =
      checks.narrowpage &&
      checks.narrowarticle &&
      checks.narrowcode &&
      checks.narrowtable;
    checks.rtl =
      rtl.textContent?.startsWith('مرحبا') === true &&
      getComputedStyle(rtl).unicodeBidi === 'plaintext';
    clickLink('document.md');
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
