// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { capturePosition, restorePosition } from './reading-position';
describe('L17 maintien de position', () => {
  it('restaure le même titre et décalage sans changer le focus', () => {
    const reader = document.createElement('main');
    reader.innerHTML = '<h1 data-mdv-heading="stable">Titre</h1>';
    const heading = reader.firstElementChild as HTMLElement;
    vi.spyOn(reader, 'getBoundingClientRect').mockReturnValue({
      top: 50,
    } as DOMRect);
    const bounds = vi
      .spyOn(heading, 'getBoundingClientRect')
      .mockReturnValue({ top: 20 } as DOMRect);
    reader.scrollTop = 400;
    const position = capturePosition(reader)!;
    bounds.mockReturnValue({ top: 100 } as DOMRect);
    const focus = document.activeElement;
    restorePosition(reader, position);
    expect(reader.scrollTop).toBe(480);
    expect(document.activeElement).toBe(focus);
  });
  it('utilise le ratio quand le titre a disparu', () => {
    const reader = document.createElement('main');
    Object.defineProperty(reader, 'scrollHeight', { value: 1000 });
    Object.defineProperty(reader, 'clientHeight', { value: 200 });
    restorePosition(reader, { anchor: 'absent', top: 0, ratio: 0.5 });
    expect(reader.scrollTop).toBe(400);
  });
});
