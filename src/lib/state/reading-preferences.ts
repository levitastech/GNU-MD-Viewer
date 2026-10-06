export type ThemeMode = 'system' | 'light' | 'dark';
export const isDarkTheme = (mode: ThemeMode, systemDark: boolean): boolean =>
  mode === 'dark' || (mode === 'system' && systemDark);

export const changeReadingZoom = (zoom: number, delta: number): number =>
  Math.min(200, Math.max(80, zoom + delta));

export const observeSystemTheme = (
  query: MediaQueryList,
  onChange: (dark: boolean) => void,
): (() => void) => {
  const update = (): void => onChange(query.matches);
  update();
  query.addEventListener('change', update);
  return () => query.removeEventListener('change', update);
};
