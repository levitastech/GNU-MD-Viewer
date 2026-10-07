export interface ReadingPosition {
  readonly anchor?: string;
  readonly top: number;
  readonly ratio: number;
}
export const capturePosition = (
  reader: HTMLElement | null,
): ReadingPosition | null => {
  if (!reader) return null;
  const headings = Array.from(
    reader.querySelectorAll<HTMLElement>('[data-mdv-heading]'),
  );
  const top = reader.getBoundingClientRect().top;
  const current = headings
    .filter((heading) => heading.getBoundingClientRect().top <= top + 32)
    .at(-1);
  return {
    anchor: current?.dataset.mdvHeading,
    top: current ? current.getBoundingClientRect().top - top : 0,
    ratio:
      reader.scrollTop / Math.max(1, reader.scrollHeight - reader.clientHeight),
  };
};
export const restorePosition = (
  reader: HTMLElement | null,
  position: ReadingPosition,
): void => {
  if (!reader) return;
  const anchor = Array.from(
    reader.querySelectorAll<HTMLElement>('[data-mdv-heading]'),
  ).find((heading) => heading.dataset.mdvHeading === position.anchor);
  if (anchor)
    reader.scrollTop +=
      anchor.getBoundingClientRect().top -
      reader.getBoundingClientRect().top -
      position.top;
  else
    reader.scrollTop =
      position.ratio * Math.max(0, reader.scrollHeight - reader.clientHeight);
};
