import { convertFileSrc } from '@tauri-apps/api/core';
import { tick } from 'svelte';
import { TauriPreferenceService } from './tauri-preference-service';
import { RESOURCE_PROTOCOL } from './tauri-resource-service';

export const runV4Recipe = async (): Promise<void> => {
  const checks: Record<string, boolean> = {};
  const wait = async (predicate: () => boolean): Promise<void> => {
    await tick();
    const end = performance.now() + 12000;
    while (!predicate()) {
      if (performance.now() > end) throw new Error('timeout');
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    await tick();
  };
  const signal = (stage: string): void => {
    const image = new Image();
    image.src = convertFileSrc(
      `l09-report-v4-stage-${stage}`,
      RESOURCE_PROTOCOL,
    );
  };
  const preferences = new TauriPreferenceService();
  const report = (prefix: string): void => {
    const beacon = new Image();
    beacon.src = convertFileSrc(
      `l09-report-${prefix}_${Object.entries(checks)
        .map(([name, ok]) => `${name}-${ok ? 'ok' : 'fail'}`)
        .join('_')}`,
      RESOURCE_PROTOCOL,
    );
  };
  try {
    if (document.querySelector('.recent-documents')) {
      checks.noautoload = document.querySelector('.document') === null;
      checks.restored =
        document.querySelector('.viewer-shell.theme-dark') !== null &&
        document
          .querySelector<HTMLElement>('.viewer-shell')!
          .style.getPropertyValue('--reader-zoom') === '120%';
      document.querySelector<HTMLDetailsElement>('.recent-documents')!.open =
        true;
      document.querySelector<HTMLButtonElement>('.open-recent')!.click();
      await wait(
        () =>
          document.querySelector('.document h1')?.textContent ===
          'Rafale terminée',
      );
      checks.recentrestored = true;
      checks.tocrestored =
        document.querySelector('.table-of-contents ol') === null;
      document
        .querySelector<HTMLButtonElement>('[aria-label^="Retirer "]')!
        .click();
      await wait(() => document.querySelector('.recent-documents') === null);
      checks.removeone =
        document.querySelector('.document h1')?.textContent ===
        'Rafale terminée';
      document.querySelector<HTMLButtonElement>('.actions .primary')!.click();
      await wait(() => document.querySelector('.recent-documents') !== null);
      document.querySelector<HTMLDetailsElement>('.recent-documents')!.open =
        true;
      document.querySelector<HTMLButtonElement>('.clear-recents')!.click();
      await wait(() => document.querySelector('.recent-documents') === null);
      checks.clear = document.querySelector('.document') !== null;
      signal('clear-ready');
      await wait(
        () =>
          document.querySelector('.document h1')?.textContent ===
          'Après effacement',
      );
      await new Promise((resolve) => setTimeout(resolve, 300));
      checks.clearstays = document.querySelector('.recent-documents') === null;
      signal('clear-observed');
      report('v4restore');
      return;
    }
    checks.lazy = !performance
      .getEntriesByType('resource')
      .some((entry) => /highlight|katex|mermaid|languages/.test(entry.name));
    document.querySelector<HTMLButtonElement>('.actions .primary')!.click();
    await wait(
      () => document.querySelectorAll('.mdv-mermaid svg').length === 3,
    );
    const root = document.querySelector<HTMLElement>('.document')!;
    checks.diagrams = root.querySelectorAll('svg').length === 3;
    const ids = Array.from(root.querySelectorAll('[id]'), (el) => el.id);
    checks.unique = ids.length > 0 && new Set(ids).size === ids.length;
    checks.inert = !root.querySelector(
      'script, foreignObject, a[href], [onclick], [onerror], image',
    );
    checks.fallback =
      root.textContent!.includes('securityLevel') &&
      root.textContent!.includes('invalide');
    await wait(() => root.querySelectorAll('.katex').length >= 3);
    checks.math =
      root.querySelectorAll('.mdv-math .katex').length >= 3 &&
      root.querySelector('math') !== null;
    checks.money = root.textContent!.includes('$20 et $30');
    checks.matherrors =
      root.textContent!.includes('Expression mathématique invalide') &&
      root.textContent!.includes('\\leak');
    checks.mathinert = !root.querySelector(
      '.mdv-math [href], .mdv-math [src], .mdv-math script',
    );
    root.getBoundingClientRect();
    await wait(() => document.fonts.check('16px KaTeX_Main', 'x'));
    checks.fonts = Array.from(document.fonts).some(
      (font) => font.family.includes('KaTeX_Main') && font.status === 'loaded',
    );
    await wait(
      () => root.querySelector('code.language-js .hljs-keyword') !== null,
    );
    const colored = root.querySelector<HTMLElement>('code.language-js')!;
    checks.code =
      colored.textContent === 'const greeting = "<script>danger</script>";\n';
    const range = document.createRange();
    range.selectNodeContents(colored);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    checks.copy = selection?.toString() === colored.textContent;
    checks.unknown =
      root.querySelector('code.language-inconnu')?.textContent ===
        '<img onerror="danger">\n' && !root.querySelector('code img');
    const theme = document.querySelector<HTMLSelectElement>('.actions select')!;
    const before = new Set(
      Array.from(root.querySelectorAll('svg'), (svg) => svg.id),
    );
    theme.value = 'dark';
    theme.dispatchEvent(new Event('change', { bubbles: true }));
    await wait(() =>
      Array.from(root.querySelectorAll('svg')).every(
        (svg) => !before.has(svg.id),
      ),
    );
    checks.theme = document.querySelectorAll('.mdv-mermaid svg').length === 3;
    signal('watch-ready');
    await wait(
      () =>
        document.querySelector('.document h1')?.textContent ===
        'Modification externe',
    );
    checks.overwrite = true;
    signal('overwrite-observed');
    await wait(
      () =>
        document.querySelector('.document h1')?.textContent ===
        'Remplacement atomique',
    );
    checks.atomic = true;
    signal('atomic-observed');
    await wait(() => document.querySelector('.error-notice') !== null);
    checks.removed =
      document.querySelector('.document h1')?.textContent ===
      'Remplacement atomique';
    signal('removed-observed');
    await wait(
      () =>
        document.querySelector('.document h1')?.textContent ===
        'Document recréé',
    );
    checks.recreated = true;
    signal('recreated-observed');
    await wait(() => document.querySelector('.error-notice') !== null);
    checks.invalidreload =
      document.querySelector('.document h1')?.textContent === 'Document recréé';
    signal('invalid-observed');
    await wait(
      () =>
        document.querySelector('.document h1')?.textContent ===
        'Rafale terminée',
    );
    checks.burst = true;
    const beforeReload = document.querySelector('.document');
    document.querySelector<HTMLButtonElement>('.reload-document')!.click();
    await wait(
      () =>
        document.querySelector('.document') !== beforeReload &&
        document.querySelector('.document h1')?.textContent ===
          'Rafale terminée' &&
        document.querySelector('.viewer-shell')?.getAttribute('aria-busy') ===
          'false',
    );
    checks.explicitreload = true;
    await wait(() => document.querySelectorAll('.open-recent').length === 1);
    checks.dedup = true;
    signal('recent-ready');
    await wait(() => document.querySelector('.error-notice') !== null);
    const last = document.querySelector('.document');
    document.querySelector<HTMLDetailsElement>('.recent-documents')!.open =
      true;
    document.querySelector<HTMLButtonElement>('.open-recent')!.click();
    await wait(
      () =>
        document.querySelector('.viewer-shell')?.getAttribute('aria-busy') ===
        'false',
    );
    checks.recentmissing =
      document.querySelector('.document') === last &&
      document.querySelector('.error-notice') !== null;
    signal('recent-missing-observed');
    await wait(() => document.querySelector('.error-notice') === null);
    const previous = document.querySelector('.document');
    document.querySelector<HTMLButtonElement>('.open-recent')!.click();
    await wait(() => document.querySelector('.document') !== previous);
    checks.recentopen = true;
    document
      .querySelector<HTMLButtonElement>('[aria-label="Augmenter le zoom"]')!
      .click();
    document
      .querySelector<HTMLButtonElement>('[aria-label="Augmenter le zoom"]')!
      .click();
    document
      .querySelector<HTMLButtonElement>('.table-of-contents > button')!
      .click();
    await wait(() => document.querySelector('.table-of-contents ol') === null);
    const deadline = performance.now() + 5000;
    while (true) {
      const view = await preferences.load();
      if (
        view.reading.zoom === 120 &&
        view.reading.theme === 'dark' &&
        !view.reading.tocVisible
      )
        break;
      if (performance.now() > deadline) throw new Error('preferences');
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    checks.preferences = true;
  } catch {
    checks.completed = false;
  }
  report('v4');
};
