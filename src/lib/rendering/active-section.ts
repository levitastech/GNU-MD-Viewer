/** Cache heading positions on layout changes; scroll only performs a binary search. */
export const observeActiveSection = (
  container: HTMLElement,
  onSection: (id: string | null) => void,
): (() => void) => {
  onSection(null);
  const root = container.closest<HTMLElement>('.reader');
  const headings = Array.from(
    container.querySelectorAll<HTMLElement>('[data-mdv-heading]'),
  );
  if (!root || headings.length === 0) return () => {};
  let positions: number[] = [];
  let dirty = true;
  let stopped = false;
  let frame: number | null = null;
  let active: string | null = null;
  const update = (): void => {
    frame = null;
    if (stopped) return;
    if (dirty) {
      const top = root.getBoundingClientRect().top + root.clientTop;
      positions = headings.map(
        (heading) => heading.getBoundingClientRect().top - top + root.scrollTop,
      );
      dirty = false;
    }
    // Scroll padding + anchor margin leave the selected heading below the top.
    const threshold = root.scrollTop + 48;
    let low = 0;
    let high = positions.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (positions[middle]! <= threshold) low = middle + 1;
      else high = middle;
    }
    const atBottom =
      root.scrollTop > 0 &&
      root.scrollTop + root.clientHeight >= root.scrollHeight - 1;
    const index = atBottom ? headings.length - 1 : Math.max(0, low - 1);
    const next = headings[index]!.dataset.mdvHeading ?? null;
    if (next !== active) {
      active = next;
      onSection(next);
    }
  };
  const schedule = (): void => {
    if (!stopped && frame === null)
      frame = window.requestAnimationFrame(update);
  };
  const invalidate = (): void => {
    dirty = true;
    schedule();
  };
  const observer =
    typeof window.ResizeObserver === 'undefined'
      ? null
      : new window.ResizeObserver(invalidate);
  observer?.observe(root);
  observer?.observe(container);
  const toc = root.querySelector('.table-of-contents');
  if (toc) observer?.observe(toc);
  root.addEventListener('scroll', schedule, { passive: true });
  container.addEventListener('load', invalidate, true);
  window.addEventListener('resize', invalidate);
  schedule();
  return () => {
    stopped = true;
    if (frame !== null) window.cancelAnimationFrame(frame);
    observer?.disconnect();
    root.removeEventListener('scroll', schedule);
    container.removeEventListener('load', invalidate, true);
    window.removeEventListener('resize', invalidate);
  };
};
