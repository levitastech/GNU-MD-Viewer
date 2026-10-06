import { describe, expect, it, vi } from 'vitest';
import {
  changeReadingZoom,
  isDarkTheme,
  observeSystemTheme,
} from './reading-preferences';

describe('préférences temporaires L12', () => {
  it('suit le système à chaud et retire son listener à la fermeture', () => {
    const query = new EventTarget() as MediaQueryList;
    Object.defineProperty(query, 'matches', { value: false, writable: true });
    const onChange = vi.fn();
    const stop = observeSystemTheme(query, onChange);
    Object.defineProperty(query, 'matches', { value: true });
    query.dispatchEvent(new Event('change'));
    expect(onChange.mock.calls).toEqual([[false], [true]]);
    expect(isDarkTheme('system', true)).toBe(true);
    expect(isDarkTheme('light', true)).toBe(false);
    expect(isDarkTheme('dark', false)).toBe(true);
    stop();
    query.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('borne le zoom à 80–200 % avec pas de 10 %', () => {
    expect(changeReadingZoom(100, 10)).toBe(110);
    expect(changeReadingZoom(80, -10)).toBe(80);
    expect(changeReadingZoom(200, 10)).toBe(200);
  });
});
