/** Resolve only inert anchors inside the current document, never application IDs. */
export const findDocumentAnchor = (
  container: HTMLElement,
  target: string,
): HTMLElement | null => {
  if (!target.startsWith('#')) return null;
  let anchor: string;
  try {
    anchor = decodeURIComponent(target.slice(1)).normalize('NFC');
  } catch {
    return null;
  }
  if (!anchor) return null;
  const candidates = Array.from(
    container.querySelectorAll<HTMLElement>(
      '[data-mdv-heading], [data-mdv-anchor]',
    ),
  );
  return (
    candidates.find(
      (element) =>
        element.dataset.mdvAnchor === anchor ||
        element.dataset.mdvHeading === anchor,
    ) ??
    candidates.find(
      (element) => element.dataset.mdvHeading === `mdv-heading-${anchor}`,
    ) ??
    null
  );
};

export const navigateDocument = (
  container: HTMLElement,
  target: string,
): boolean => {
  const element = findDocumentAnchor(container, target);
  if (!element) return false;
  element.tabIndex = -1;
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'start', behavior: 'auto' });
  return true;
};
